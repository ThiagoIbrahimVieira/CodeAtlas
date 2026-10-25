import type { FileImport, ImportType } from '../types/atlas';

export type StaticImportKind =
  | 'named'
  | 'default'
  | 'namespace'
  | 'side-effect'
  | 'reexport';

export interface StaticImportReference {
  /**
   * The module specifier string (e.g., './Button', 'react', '../types').
   */
  specifier: string;

  /**
   * Syntactic classification of the import/reexport.
   */
  kind: StaticImportKind;

  /**
   * Indicates whether this import/export is type-only (`import type` or `export type`).
   */
  isTypeOnly: boolean;

  /**
   * Indicates whether this is a re-export originating from another module (`export ... from`).
   */
  isReexport: boolean;

  /**
   * Imported or re-exported symbol names (e.g. ['useState'], ['*'], or default identifier).
   */
  symbols: string[];

  /**
   * 1-indexed line number in the source file where the statement occurs.
   */
  sourceLine: number;
}

export interface DynamicImportReference {
  /**
   * String literal if statically determinable, or undefined if dynamic expression.
   */
  specifier?: string;

  /**
   * True when the argument is not a static string literal (e.g. `import(`./locales/${lang}`)`).
   */
  isDynamicExpression: boolean;

  /**
   * 1-indexed line number in the source file where the dynamic import call occurs.
   */
  sourceLine: number;
}

export interface FileAnalysisResult {
  filePath: string;
  staticImports: StaticImportReference[];
  dynamicImports: DynamicImportReference[];
  exports: string[];
}

/**
 * Options and workspace context used to resolve import specifiers to real workspace files.
 */
export interface PathResolutionOptions {
  /**
   * List of known normalized file paths in the workspace (e.g. ['src/App.tsx', 'src/components/Header.tsx']).
   */
  workspaceFiles: string[];

  /**
   * Optional baseUrl from tsconfig.json (e.g. 'src' or '.').
   */
  baseUrl?: string;

  /**
   * Optional path mapping aliases from tsconfig.json (e.g. { '@/*': ['src/*'] }).
   */
  paths?: Record<string, string[]>;

  /**
   * Known external package names from package.json (dependencies, devDependencies, etc.).
   */
  knownExternalPackages?: string[];
}

/**
 * Rich resolved import model extending the core FileImport with AST metadata.
 */
export interface ResolvedFileImport extends FileImport {
  /**
   * Indicates if this dependency originated from a dynamic import call (`import(...)`).
   */
  isDynamic?: boolean;

  /**
   * Line number in the source file.
   */
  sourceLine?: number;

  /**
   * Whether this import was marked as type-only.
   */
  isTypeOnly?: boolean;

  /**
   * Whether this was a re-export from another module.
   */
  isReexport?: boolean;

  /**
   * Imported symbols, if extracted.
   */
  symbols?: string[];
}

/**
 * Aggregate resolution results for a single file.
 */
export interface ResolvedFileDependencies {
  filePath: string;
  imports: ResolvedFileImport[];
  dynamicImports: ResolvedFileImport[];
}

export type { ImportType, FileImport };
