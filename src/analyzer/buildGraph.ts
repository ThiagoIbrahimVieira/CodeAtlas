import type { AtlasEdge, AtlasFile, AtlasProject, FileType } from '../types/atlas';
import { analyzeFileDependencies } from './parseImports';
import { resolveDependencies } from './resolveDependencies';
import type { PathResolutionOptions, ResolvedFileImport } from './types';

/**
 * File input representation with in-memory path and content.
 */
export interface SourceFileInput {
  path: string;
  content: string;
  sizeBytes?: number;
}

/**
 * Optional settings for project metadata and module resolution.
 */
export interface BuildGraphOptions {
  projectName?: string;
  projectDescription?: string;
  resolutionOptions?: Partial<PathResolutionOptions>;
}

/**
 * Normalizes virtual file paths by replacing backslashes with forward slashes
 * and trimming leading/trailing slashes.
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

/**
 * Infers the high-level semantic FileType based on file path, extension, and naming conventions.
 * Compatible with existing CodeAtlas node badges and styles.
 */
export function inferFileType(filePath: string): FileType {
  const normalized = normalizePath(filePath);
  const lower = normalized.toLowerCase();
  const basename = normalized.split('/').pop() ?? '';

  // 1. Styles
  if (
    lower.endsWith('.css') ||
    lower.endsWith('.scss') ||
    lower.endsWith('.sass') ||
    lower.endsWith('.less')
  ) {
    return 'style';
  }

  // 2. Custom React Hooks
  if (
    basename.startsWith('use') &&
    !basename.includes('.test.') &&
    !basename.includes('.spec.')
  ) {
    return 'hook';
  }
  if (lower.includes('/hooks/') || lower.includes('/hook/')) {
    return 'hook';
  }

  // 3. Entry points
  if (
    basename === 'main.tsx' ||
    basename === 'main.ts' ||
    basename === 'main.jsx' ||
    basename === 'main.js' ||
    basename === 'index.html' ||
    basename === 'App.tsx' ||
    basename === 'App.jsx'
  ) {
    return 'entry';
  }

  // 4. Components
  if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) {
    return 'component';
  }
  if (lower.includes('/components/') || lower.includes('/component/')) {
    return 'component';
  }

  // 5. Utilities, services, models, helpers
  return 'util';
}

/**
 * Calculates byte size in memory using TextEncoder if not explicitly provided.
 */
function calculateSizeBytes(content: string, sizeBytes?: number): number {
  if (typeof sizeBytes === 'number' && sizeBytes >= 0) {
    return sizeBytes;
  }
  return new TextEncoder().encode(content).length;
}

/**
 * Calculates total lines in a source string.
 */
function calculateLinesCount(content: string): number {
  if (!content) return 0;
  return content.split('\n').length;
}

/**
 * Connects syntactic parsing and path resolution to produce a complete AtlasProject graph.
 *
 * Grounded in the existing CodeAtlas schema (AtlasProject, AtlasFile, AtlasEdge):
 * - Generates nodes for each workspace file without duplicates.
 * - Produces directed edges for resolved internal dependencies (importer -> imported).
 * - Preserves metadata (sourceLine, symbols, type-only, re-exports).
 * - Keeps dynamic imports separated from static edges.
 * - Flags unresolved imports with diagnostics without creating phantom nodes or edges.
 *
 * shortcut: in-memory graph construction without layout calculation, upgrade in Phase 4 for automatic force/hierarchical layout.
 *
 * @param files Collection of source files in memory.
 * @param options Project metadata and resolution overrides.
 * @returns Fully populated AtlasProject compatible with React Flow graph components.
 */
export function buildAtlasGraph(
  files: SourceFileInput[],
  options?: BuildGraphOptions
): AtlasProject {
  const projectName = options?.projectName ?? 'CodeAtlas Project';
  const projectDescription =
    options?.projectDescription ??
    'Grafo de dependências gerado automaticamente pelo analisador estático.';

  // 1. Deduplicate files and index by normalized path
  const fileMap = new Map<string, SourceFileInput>();
  for (const file of files) {
    const normalized = normalizePath(file.path);
    fileMap.set(normalized, { ...file, path: normalized });
  }

  const workspaceFiles = Array.from(fileMap.keys());

  const resolutionOptions: PathResolutionOptions = {
    workspaceFiles,
    baseUrl: options?.resolutionOptions?.baseUrl,
    paths: options?.resolutionOptions?.paths,
    knownExternalPackages: options?.resolutionOptions?.knownExternalPackages,
  };

  const atlasFiles: AtlasFile[] = [];
  const edges: AtlasEdge[] = [];
  const edgeSet = new Set<string>();

  // 2. Process each file: extract AST, resolve imports and map exports
  for (const [filePath, fileInput] of fileMap.entries()) {
    const basename = filePath.split('/').pop() ?? filePath;
    const type = inferFileType(filePath);
    const sizeBytes = calculateSizeBytes(fileInput.content, fileInput.sizeBytes);
    const linesCount = calculateLinesCount(fileInput.content);

    // Extract exports and dependencies
    const analysis = analyzeFileDependencies(filePath, fileInput.content);
    const resolved = resolveDependencies(filePath, fileInput.content, resolutionOptions);

    const verifiedImports: ResolvedFileImport[] = resolved.imports.map((imp) => {
      // If internal, verify target exists in project file set
      if (imp.type === 'internal' && imp.resolvedPath) {
        const targetPath = normalizePath(imp.resolvedPath);
        if (fileMap.has(targetPath)) {
          // Valid internal edge: source (filePath) -> target (targetPath)
          const edgeId = `e-${filePath}->${targetPath}`;
          if (!edgeSet.has(edgeId) && filePath !== targetPath) {
            edgeSet.add(edgeId);
            edges.push({
              id: edgeId,
              source: filePath,
              target: targetPath,
            });
          }
          return {
            ...imp,
            resolvedPath: targetPath,
          };
        }

        // Target not found in provided workspace files -> mark unresolved
        return {
          ...imp,
          type: 'unresolved',
          resolvedPath: undefined,
          diagnosticNote: `Módulo interno "${imp.specifier}" resolveu para "${targetPath}", mas o arquivo não foi incluído no projeto.`,
        };
      }

      return imp;
    });

    // Check dynamic imports
    const verifiedDynamicImports: ResolvedFileImport[] = resolved.dynamicImports.map((dyn) => {
      if (dyn.resolvedPath) {
        const targetPath = normalizePath(dyn.resolvedPath);
        return {
          ...dyn,
          resolvedPath: fileMap.has(targetPath) ? targetPath : undefined,
        };
      }
      return dyn;
    });

    atlasFiles.push({
      id: filePath,
      path: filePath,
      name: basename,
      type,
      sizeBytes,
      linesCount,
      imports: verifiedImports,
      exports: analysis.exports,
      dynamicImports: verifiedDynamicImports,
    });
  }

  return {
    name: projectName,
    description: projectDescription,
    files: atlasFiles,
    edges,
  };
}
