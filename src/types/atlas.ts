export type FileType = 'entry' | 'component' | 'hook' | 'util' | 'style';

export type ImportType = 'internal' | 'external' | 'unresolved' | 'ignored';

export interface FileImport {
  specifier: string;          // ex: './Button', 'react', './MissingParser'
  resolvedPath?: string;      // ex: 'src/components/common/Button.tsx' (quando internal e resolvido)
  type: ImportType;
  diagnosticNote?: string;    // ex: "Módulo não localizado no workspace"
  sourceLine?: number;
  symbols?: string[];
  isTypeOnly?: boolean;
  isReexport?: boolean;
  isDynamic?: boolean;
}

export interface AtlasFile {
  id: string;                 // caminho relativo único: 'src/components/Header.tsx'
  path: string;
  name: string;
  type: FileType;
  sizeBytes: number;
  linesCount: number;
  imports: FileImport[];
  exports: string[];
  dynamicImports?: FileImport[];
}

export interface AtlasEdge {
  id: string;
  source: string;             // id do arquivo que faz o import
  target: string;             // id do arquivo que foi importado
}

export interface AtlasProject {
  name: string;
  description: string;
  files: AtlasFile[];
  edges: AtlasEdge[];
}
