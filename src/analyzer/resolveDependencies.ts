import { analyzeFileDependencies } from './parseImports';
import type {
  FileImport,
  PathResolutionOptions,
  ResolvedFileDependencies,
  ResolvedFileImport,
} from './types';

/**
 * Supported file extensions in order of resolution precedence.
 * Grounded in standard TypeScript/Vite module resolution:
 * https://www.typescriptlang.org/docs/handbook/modules/reference.html
 */
const EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.d.ts',
  '.mjs',
  '.cjs',
  '.css',
  '.json',
];

/**
 * Standard directory index entry points.
 */
const INDEX_FILES = [
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'index.d.ts',
  'index.mjs',
  'index.cjs',
];

/**
 * Node.js core built-in modules.
 */
const NODE_BUILTINS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'path/posix',
  'path/win32',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'sys',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'util/types',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
]);

/**
 * Standard build-output or generated directory segments that are intentionally excluded from direct analysis.
 */
export const STANDARD_IGNORED_OR_GENERATED_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.vite',
  'coverage',
  '.turbo',
  '.cache',
]);

function isIgnoredOrGeneratedPath(normalizedPath: string): boolean {
  const segments = normalizedPath.split('/');
  return segments.some((seg) => STANDARD_IGNORED_OR_GENERATED_SEGMENTS.has(seg));
}

/**
 * Pure virtual path normalization.
 * Handles '.' and '..' segments without requiring Node 'path' module,
 * allowing it to execute safely in both browser and test environments.
 */
function normalizeVirtualPath(rawPath: string): { path: string; hasEscaped: boolean } {
  const normalized = rawPath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const stack: string[] = [];
  let hasEscaped = false;

  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (stack.length === 0) {
        hasEscaped = true;
      } else {
        stack.pop();
      }
    } else {
      stack.push(segment);
    }
  }

  return {
    path: stack.join('/'),
    hasEscaped,
  };
}

/**
 * Gets the directory portion of a path.
 */
function getDirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
}

/**
 * Checks candidate paths against the workspace file set.
 */
function findCandidateMatch(basePath: string, fileSet: Set<string>): string | undefined {
  // 1. Direct match or with extension precedence
  for (const ext of EXTENSIONS) {
    const candidate = ext ? `${basePath}${ext}` : basePath;
    if (fileSet.has(candidate)) {
      return candidate;
    }
  }

  // 2. Directory index entry point
  for (const indexFile of INDEX_FILES) {
    const candidate = basePath.endsWith('/')
      ? `${basePath}${indexFile}`
      : `${basePath}/${indexFile}`;
    if (fileSet.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Determines whether a specifier corresponds to an external package or built-in.
 */
function isExternalPackage(specifier: string, knownPackages?: string[]): boolean {
  if (specifier.startsWith('node:')) return true;
  if (NODE_BUILTINS.has(specifier)) return true;

  if (knownPackages && knownPackages.length > 0) {
    for (const pkg of knownPackages) {
      if (specifier === pkg || specifier.startsWith(`${pkg}/`)) {
        return true;
      }
    }
  }

  // Bare specifiers that do not start with relative/absolute indicators
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    // Standard npm package name regex pattern (scoped or unscoped)
    const npmPattern = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(\/.*)?$/i;
    return npmPattern.test(specifier);
  }

  return false;
}

/**
 * Resolves a single module specifier from an importing file.
 *
 * @param specifier The raw import string (e.g. './Button', '@/hooks/useTheme', 'react').
 * @param importerPath The path of the file making the import (e.g. 'src/components/Header.tsx').
 * @param options Workspace files, baseUrl, paths, and known packages.
 * @returns FileImport resolution object.
 */
export function resolveModuleSpecifier(
  specifier: string,
  importerPath: string,
  options: PathResolutionOptions
): FileImport {
  const trimmed = specifier.trim();
  if (!trimmed) {
    return {
      specifier,
      type: 'unresolved',
      diagnosticNote: 'Specifier de import vazio ou inválido.',
    };
  }

  const fileSet = new Set(options.workspaceFiles.map((f) => f.replace(/\\/g, '/')));

  // 1. Path Aliases (compilerOptions.paths)
  if (options.paths) {
    for (const [pattern, targets] of Object.entries(options.paths)) {
      if (pattern.includes('*')) {
        const [prefix, suffix] = pattern.split('*');
        if (trimmed.startsWith(prefix) && (!suffix || trimmed.endsWith(suffix))) {
          const wildcard = trimmed.slice(
            prefix.length,
            suffix ? trimmed.length - suffix.length : undefined
          );

          const targetList = Array.isArray(targets) ? targets : [targets];
          for (const rawTarget of targetList) {
            if (typeof rawTarget !== 'string') continue;
            const target = rawTarget.replace(/^\/+/, '');
            const mappedTarget = target.replace('*', wildcard);
            const combined = options.baseUrl
              ? `${options.baseUrl}/${mappedTarget}`
              : mappedTarget;
            const normalized = normalizeVirtualPath(combined).path;

            const match = findCandidateMatch(normalized, fileSet);
            if (match) {
              return {
                specifier: trimmed,
                resolvedPath: match,
                type: 'internal',
              };
            }

            if (isIgnoredOrGeneratedPath(normalized)) {
              return {
                specifier: trimmed,
                resolvedPath: normalized,
                type: 'ignored',
                diagnosticNote: `Módulo em diretório gerado ou ignorado intencionalmente ("${normalized}").`,
              };
            }
          }

          return {
            specifier: trimmed,
            type: 'unresolved',
            diagnosticNote: `Módulo do alias "${trimmed}" não localizado no workspace.`,
          };
        }
      } else if (pattern === trimmed) {
        // Exact alias match
        const targetList = Array.isArray(targets) ? targets : [targets];
        for (const rawTarget of targetList) {
          if (typeof rawTarget !== 'string') continue;
          const target = rawTarget.replace(/^\/+/, '');
          const combined = options.baseUrl ? `${options.baseUrl}/${target}` : target;
          const normalized = normalizeVirtualPath(combined).path;
          const match = findCandidateMatch(normalized, fileSet);
          if (match) {
            return {
              specifier: trimmed,
              resolvedPath: match,
              type: 'internal',
            };
          }

          if (isIgnoredOrGeneratedPath(normalized)) {
            return {
              specifier: trimmed,
              resolvedPath: normalized,
              type: 'ignored',
              diagnosticNote: `Módulo em diretório gerado ou ignorado intencionalmente ("${normalized}").`,
            };
          }
        }

        return {
          specifier: trimmed,
          type: 'unresolved',
          diagnosticNote: `Módulo do alias "${trimmed}" não localizado no workspace.`,
        };
      }
    }
  }

  // 2. Relative Imports (./ or ../)
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    const importerDir = getDirname(importerPath);
    const combined = importerDir ? `${importerDir}/${trimmed}` : trimmed;
    const { path: normalizedPath, hasEscaped } = normalizeVirtualPath(combined);

    if (hasEscaped) {
      return {
        specifier: trimmed,
        type: 'unresolved',
        diagnosticNote: `Caminho relativo "${trimmed}" tenta acessar arquivo fora da raiz do workspace.`,
      };
    }

    const match = findCandidateMatch(normalizedPath, fileSet);
    if (match) {
      return {
        specifier: trimmed,
        resolvedPath: match,
        type: 'internal',
      };
    }

    // Check if the relative target path resolves into an intentionally ignored or build-generated directory
    if (isIgnoredOrGeneratedPath(normalizedPath)) {
      return {
        specifier: trimmed,
        resolvedPath: normalizedPath,
        type: 'ignored',
        diagnosticNote: `Módulo em diretório gerado ou ignorado intencionalmente ("${normalizedPath}").`,
      };
    }

    return {
      specifier: trimmed,
      type: 'unresolved',
      diagnosticNote: `Módulo relativo "${trimmed}" não localizado no workspace.`,
    };
  }

  // 3. baseUrl Resolution (non-relative imports resolved from baseUrl root)
  if (options.baseUrl) {
    const combined = `${options.baseUrl}/${trimmed}`;
    const normalized = normalizeVirtualPath(combined).path;
    const match = findCandidateMatch(normalized, fileSet);
    if (match) {
      return {
        specifier: trimmed,
        resolvedPath: match,
        type: 'internal',
      };
    }
  }

  // 4. External Packages & Node Built-ins
  if (isExternalPackage(trimmed, options.knownExternalPackages)) {
    return {
      specifier: trimmed,
      type: 'external',
    };
  }

  // 5. Default Unresolved Fallback
  return {
    specifier: trimmed,
    type: 'unresolved',
    diagnosticNote: `Módulo "${trimmed}" não pôde ser resolvido como arquivo interno ou pacote externo.`,
  };
}

/**
 * Analyzes a file's content and resolves all static and dynamic imports against the workspace.
 * Preserves dynamic imports separately from static dependencies.
 *
 * Grounded in official TypeScript Module Resolution specifications:
 * https://www.typescriptlang.org/docs/handbook/modules/reference.html
 *
 * shortcut: in-memory candidate file matching without node:fs I/O, upgrade in Phase 3 when integrating File System Access API.
 *
 * @param filePath Importer file path (e.g. 'src/App.tsx').
 * @param content Source code string.
 * @param options Resolution context (workspace file list, paths, baseUrl).
 * @returns ResolvedFileDependencies containing static imports and dynamic imports separately.
 */
export function resolveDependencies(
  filePath: string,
  content: string,
  options: PathResolutionOptions
): ResolvedFileDependencies {
  const analysis = analyzeFileDependencies(filePath, content);

  // 1. Resolve Static Imports & Re-exports
  const imports: ResolvedFileImport[] = analysis.staticImports.map((staticImp) => {
    const resolved = resolveModuleSpecifier(staticImp.specifier, filePath, options);
    return {
      ...resolved,
      isDynamic: false,
      sourceLine: staticImp.sourceLine,
      isTypeOnly: staticImp.isTypeOnly,
      isReexport: staticImp.isReexport,
      symbols: staticImp.symbols,
    };
  });

  // 2. Resolve Dynamic Imports Separately
  const dynamicImports: ResolvedFileImport[] = analysis.dynamicImports.map((dynImp) => {
    if (dynImp.isDynamicExpression || !dynImp.specifier) {
      return {
        specifier: dynImp.specifier ?? '<dynamic-expression>',
        type: 'unresolved',
        isDynamic: true,
        sourceLine: dynImp.sourceLine,
        diagnosticNote: 'Import dinâmico com caminho avaliado em runtime.',
      };
    }

    const resolved = resolveModuleSpecifier(dynImp.specifier, filePath, options);
    return {
      ...resolved,
      isDynamic: true,
      sourceLine: dynImp.sourceLine,
    };
  });

  return {
    filePath,
    imports,
    dynamicImports,
  };
}
