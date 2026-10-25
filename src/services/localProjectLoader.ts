import type { AtlasProject } from '../types/atlas';
import type { SourceFileInput } from '../analyzer/buildGraph';
import type { PathResolutionOptions } from '../analyzer/types';

export interface VirtualLocalFile {
  relativePath: string;
  content: string;
  sizeBytes?: number;
}

export interface LocalProjectLoadResult {
  project: AtlasProject;
  sourceFilesCount: number;
  skippedCount: number;
  detectedPackages: string[];
}

/**
 * Standard directories excluded from static dependency analysis.
 */
const IGNORED_DIRECTORY_SEGMENTS = new Set([
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
  '.svn',
  '.hg',
]);

/**
 * File extensions supported by the CodeAtlas static parser and resolver.
 */
const SUPPORTED_EXTENSIONS = [
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
 * Strips the top-level directory folder name produced by webkitRelativePath
 * (e.g., "my-repo/src/App.tsx" -> "src/App.tsx", or "my-repo/package.json" -> "package.json").
 */
function stripRootDirectory(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalized.split('/');
  if (segments.length > 1) {
    return segments.slice(1).join('/');
  }
  return normalized;
}

/**
 * Finds the project root when the selected folder contains one nested project.
 * webkitRelativePath always includes the selected folder itself, which was already
 * stripped before this function runs.
 */
function findNestedProjectRoot(paths: string[]): string | undefined {
  const projectConfigs = paths.filter((path) => {
    const basename = path.split('/').pop()?.toLowerCase() ?? '';
    return (
      basename === 'package.json' ||
      basename === 'tsconfig.json' ||
      basename === 'jsconfig.json' ||
      /^tsconfig\..+\.json$/.test(basename) ||
      /^jsconfig\..+\.json$/.test(basename)
    );
  });
  const configDirectories = projectConfigs.map((path) =>
    path.slice(0, Math.max(0, path.lastIndexOf('/')))
  );

  if (configDirectories.includes('')) return undefined;

  const sourcePaths = paths.filter((path) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(path));
  const configDirsWithSources = configDirectories.filter((directory) =>
    sourcePaths.some((path) => path.startsWith(`${directory}/`))
  );
  const configuredProjectDirs = configDirsWithSources.filter((directory) =>
    projectConfigs.some(
      (path) =>
        path.startsWith(`${directory}/`) &&
        /(?:^|\/)(?:tsconfig|jsconfig)(?:\..+)?\.json$/i.test(path)
    )
  );
  const candidates = configuredProjectDirs.length > 0 ? configuredProjectDirs : configDirsWithSources;

  return candidates.sort((left, right) => {
    const depthDifference = left.split('/').length - right.split('/').length;
    return depthDifference || left.localeCompare(right);
  })[0];
}

/**
 * Checks whether any path segment belongs to an ignored directory.
 */
function isIgnoredPath(relativePath: string): boolean {
  const segments = relativePath.split('/');
  return segments.some((segment) => IGNORED_DIRECTORY_SEGMENTS.has(segment));
}

/**
 * Known dependency lock files and generated metadata archives that should not be analyzed as source modules.
 */
const IGNORED_LOCK_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'npm-shrinkwrap.json',
]);

/**
 * Checks if a file path is a project configuration file (tsconfig, jsconfig, package.json, dot-json configs).
 */
export function isProjectConfigFile(filePath: string): boolean {
  const basename = filePath.split('/').pop()?.toLowerCase() ?? '';
  if (basename === 'package.json' || basename === 'tsconfig.json' || basename === 'jsconfig.json') {
    return true;
  }
  if (basename.startsWith('tsconfig.') && basename.endsWith('.json')) return true;
  if (basename.startsWith('jsconfig.') && basename.endsWith('.json')) return true;
  if (basename.startsWith('.') && basename.endsWith('.json')) return true;
  return false;
}

/**
 * Checks whether a file has a supported code, style, or data extension.
 */
export function isSupportedExtension(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Filters raw virtual files, discarding ignored directories, lockfiles, and non-code assets,
 * while normalizing relative workspace paths.
 * Preserves the distinction between common JSON files (source modules) and project configuration files.
 */
export function filterAndNormalizeFiles(files: VirtualLocalFile[]): {
  sourceFiles: SourceFileInput[];
  ignoredCount: number;
  configFiles: Map<string, string>;
} {
  const sourceFiles: SourceFileInput[] = [];
  const configFiles = new Map<string, string>();
  let ignoredCount = 0;
  const strippedFiles = files.map((file) => ({
    ...file,
    relativePath: stripRootDirectory(file.relativePath),
  }));
  const nestedProjectRoot = findNestedProjectRoot(strippedFiles.map((file) => file.relativePath));

  for (const file of strippedFiles) {
    if (nestedProjectRoot && !file.relativePath.startsWith(`${nestedProjectRoot}/`)) {
      ignoredCount++;
      continue;
    }

    const normalizedPath = nestedProjectRoot
      ? file.relativePath.slice(nestedProjectRoot.length + 1)
      : file.relativePath;

    if (isIgnoredPath(normalizedPath)) {
      ignoredCount++;
      continue;
    }

    const basename = normalizedPath.split('/').pop()?.toLowerCase();

    // Ignore dependency lockfiles securely
    if (basename && IGNORED_LOCK_FILES.has(basename)) {
      ignoredCount++;
      continue;
    }

    // Store config files for project resolution context (tsconfig, jsconfig, package.json)
    if (isProjectConfigFile(normalizedPath)) {
      if (basename) {
        configFiles.set(basename, file.content);
      }
      configFiles.set(normalizedPath, file.content);
      continue;
    }

    if (isSupportedExtension(normalizedPath)) {
      sourceFiles.push({
        path: normalizedPath,
        content: file.content,
        sizeBytes: file.sizeBytes,
      });
    } else {
      ignoredCount++;
    }
  }

  return { sourceFiles, ignoredCount, configFiles };
}

/**
 * Parses known external packages from a package.json content string.
 */
export function parsePackageJsonDependencies(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const packages = new Set<string>();

    const checkDeps = (depObj: unknown) => {
      if (depObj && typeof depObj === 'object') {
        for (const pkg of Object.keys(depObj)) {
          packages.add(pkg);
        }
      }
    };

    checkDeps(parsed.dependencies);
    checkDeps(parsed.devDependencies);
    checkDeps(parsed.peerDependencies);

    return Array.from(packages);
  } catch {
    return [];
  }
}

/**
 * Strips comments and trailing commas from JSON/JSONC string (common in tsconfig.json and jsconfig.json)
 * using a character-level scanner that correctly preserves string literals containing '/' or '*'.
 */
export function cleanJsonc(text: string): string {
  let result = '';
  let inString = false;
  let inSingleComment = false;
  let inMultiComment = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inSingleComment) {
      if (char === '\n' || char === '\r') {
        inSingleComment = false;
        result += char;
      }
      continue;
    }

    if (inMultiComment) {
      if (char === '*' && nextChar === '/') {
        inMultiComment = false;
        i++; // skip '/'
      }
      continue;
    }

    if (inString) {
      result += char;
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    // Outside comments and strings:
    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inSingleComment = true;
      i++; // skip '/'
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inMultiComment = true;
      i++; // skip '*'
      continue;
    }

    result += char;
  }

  // Remove trailing commas before } or ]
  return result.replace(/,(\s*[}\]])/g, '$1');
}

export interface ParsedConfigOptions {
  baseUrl?: string;
  paths?: Record<string, string[]>;
  extends?: string | string[];
  references?: Array<{ path: string }>;
}

/**
 * Extracts compilerOptions.baseUrl, paths, extends, and references from a tsconfig.json/jsconfig.json string.
 */
export function parseTsConfigOptions(content: string): ParsedConfigOptions {
  try {
    const cleaned = cleanJsonc(content);
    const parsed = JSON.parse(cleaned) as {
      extends?: string | string[];
      compilerOptions?: {
        baseUrl?: string;
        paths?: Record<string, string[]>;
      };
      references?: Array<{ path: string }>;
    };

    let baseUrl = parsed.compilerOptions?.baseUrl;
    if (baseUrl) {
      // Normalize baseUrl: "./src" -> "src", "." -> undefined
      baseUrl = baseUrl.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\.$/, '');
      if (!baseUrl) baseUrl = undefined;
    }

    return {
      baseUrl,
      paths: parsed.compilerOptions?.paths,
      extends: parsed.extends,
      references: parsed.references,
    };
  } catch {
    return {};
  }
}

/**
 * Resolves compilerOptions from tsconfig.json, jsconfig.json, extends chains, references,
 * or sensible Next.js defaults when applicable.
 */
export function resolveProjectConfigOptions(
  configFiles: Map<string, string>,
  detectedPackages: string[],
  hasSrcDirectory: boolean
): { baseUrl?: string; paths?: Record<string, string[]> } {
  const findConfigContent = (target: string): string | undefined => {
    const normalized = target.replace(/\\/g, '/').replace(/^\.\//, '');
    const basename = normalized.split('/').pop()?.toLowerCase();
    return (
      configFiles.get(target) ||
      configFiles.get(normalized) ||
      (basename ? configFiles.get(basename) : undefined)
    );
  };

  // 1. Determine primary configuration file: tsconfig.json -> jsconfig.json -> tsconfig.app.json
  const primaryContent =
    findConfigContent('tsconfig.json') ||
    findConfigContent('jsconfig.json') ||
    findConfigContent('tsconfig.app.json');

  let baseUrl: string | undefined;
  let paths: Record<string, string[]> = {};

  if (primaryContent) {
    const parsedPrimary = parseTsConfigOptions(primaryContent);

    // Follow local "extends" chain if present
    if (parsedPrimary.extends) {
      const extendTargets = Array.isArray(parsedPrimary.extends)
        ? parsedPrimary.extends
        : [parsedPrimary.extends];

      for (const extendTarget of extendTargets) {
        const baseContent = findConfigContent(extendTarget);
        if (baseContent) {
          const parsedBase = parseTsConfigOptions(baseContent);
          if (parsedBase.baseUrl && !baseUrl) {
            baseUrl = parsedBase.baseUrl;
          }
          if (parsedBase.paths) {
            paths = { ...parsedBase.paths, ...paths };
          }
        }
      }
    }

    // Follow "references" if no paths yet (common in monorepos / Vite tsconfig.json)
    if (parsedPrimary.references && Object.keys(paths).length === 0) {
      for (const ref of parsedPrimary.references) {
        if (ref.path) {
          const refContent = findConfigContent(ref.path);
          if (refContent) {
            const parsedRef = parseTsConfigOptions(refContent);
            if (parsedRef.baseUrl && !baseUrl) baseUrl = parsedRef.baseUrl;
            if (parsedRef.paths) {
              paths = { ...parsedRef.paths, ...paths };
            }
          }
        }
      }
    }

    // Primary compilerOptions override base options
    if (parsedPrimary.baseUrl) {
      baseUrl = parsedPrimary.baseUrl;
    }
    if (parsedPrimary.paths) {
      paths = { ...paths, ...parsedPrimary.paths };
    }
  }

  // 2. Next.js convention fallback:
  // If next is in dependencies, imports use @/, but no paths were explicitly defined:
  const isNextProject = detectedPackages.includes('next');
  if (isNextProject && Object.keys(paths).length === 0) {
    paths = {
      '@/*': [hasSrcDirectory ? './src/*' : './*'],
    };
  }

  return {
    baseUrl,
    paths: Object.keys(paths).length > 0 ? paths : undefined,
  };
}

/**
 * Asynchronously loads and analyzes a local project from in-memory virtual files.
 * Uses dynamic import for buildAtlasGraph to enable code-splitting of the TypeScript Compiler.
 *
 * @param files Raw virtual local files with relativePath and content.
 * @param projectName Optional project name override.
 * @returns LocalProjectLoadResult with the generated AtlasProject.
 */
export async function loadLocalProjectFromMemory(
  files: VirtualLocalFile[],
  projectName = 'Projeto Local'
): Promise<LocalProjectLoadResult> {
  const { sourceFiles, ignoredCount, configFiles } = filterAndNormalizeFiles(files);

  if (sourceFiles.length === 0) {
    throw new Error(
      'Nenhum arquivo JavaScript ou TypeScript suportado (.ts, .tsx, .js, .jsx) foi encontrado no diretório selecionado.'
    );
  }

  // Extract project resolution metadata from config files if available
  const pkgContent = configFiles.get('package.json');
  const detectedPackages = pkgContent ? parsePackageJsonDependencies(pkgContent) : [];

  const hasSrcDir = sourceFiles.some((f) => f.path.startsWith('src/'));
  const configOptions = resolveProjectConfigOptions(configFiles, detectedPackages, hasSrcDir);

  const resolutionOptions: Partial<PathResolutionOptions> = {
    knownExternalPackages: detectedPackages,
    baseUrl: configOptions.baseUrl,
    paths: configOptions.paths,
  };

  // Dynamic code-splitting of heavy AST compiler:
  const { buildAtlasGraph } = await import('../analyzer/buildGraph');

  const project = buildAtlasGraph(sourceFiles, {
    projectName,
    projectDescription: `Projeto local analisado no navegador (${sourceFiles.length} arquivos processados).`,
    resolutionOptions,
  });

  return {
    project,
    sourceFilesCount: sourceFiles.length,
    skippedCount: ignoredCount,
    detectedPackages,
  };
}

/**
 * Reads browser FileList objects into VirtualLocalFile records with text content.
 * Fully client-side, zero external transmissions, zero evaluation.
 */
export async function readFilesFromInput(
  fileList: FileList,
  onProgress?: (loaded: number, total: number) => void
): Promise<VirtualLocalFile[]> {
  const result: VirtualLocalFile[] = [];
  const total = fileList.length;

  for (let i = 0; i < total; i++) {
    const file = fileList[i];
    const relativePath = file.webkitRelativePath || file.name;

    // Fast skip for known ignored directories before reading file content into memory
    if (isIgnoredPath(stripRootDirectory(relativePath))) {
      continue;
    }

    try {
      const content = await file.text();
      result.push({
        relativePath,
        content,
        sizeBytes: file.size,
      });
    } catch {
      // Graceful fallback for unreadable or locked files
      console.warn(`[CodeAtlas] Falha ao ler arquivo: ${relativePath}`);
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return result;
}
