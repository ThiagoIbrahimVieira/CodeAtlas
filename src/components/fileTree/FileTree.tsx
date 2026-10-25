import { useMemo, useState } from 'react';
import type { AtlasFile, FileType } from '../../types/atlas';

interface FileTreeProps {
  files: AtlasFile[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  searchQuery: string;
}

const FILE_TYPES: FileType[] = ['entry', 'component', 'hook', 'util', 'style'];

interface TreeFolder {
  name: string;
  path: string;
  files: AtlasFile[];
  children: Map<string, TreeFolder>;
}

function buildTree(files: AtlasFile[]): TreeFolder {
  const root: TreeFolder = { name: '', path: '', files: [], children: new Map() };

  files.forEach(file => {
    const parts = file.path.split('/');
    let node = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          files: [],
          children: new Map(),
        });
      }
      node = node.children.get(part)!;
    }

    node.files.push(file);
  });

  return root;
}

function FolderNode({
  folder,
  depth,
  selectedFileId,
  onSelectFile,
}: {
  folder: TreeFolder;
  depth: number;
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
}) {
  const indent = { paddingLeft: `${depth * 12 + 10}px` };
  const subFolders = Array.from(folder.children.values()).sort((a, b) => a.name.localeCompare(b.name));
  const files = [...folder.files].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {folder.name && (
        <div className="tree-folder" style={indent} aria-label={`Pasta ${folder.name}`}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="tree-folder-icon">
            <path d="M1 2.5h3l1 1.5h4v5H1V2.5z" stroke="currentColor" strokeWidth="1" fill="none" opacity=".5"/>
          </svg>
          {folder.name}
        </div>
      )}
      {subFolders.map(sf => (
        <FolderNode key={sf.path} folder={sf} depth={depth + 1} selectedFileId={selectedFileId} onSelectFile={onSelectFile} />
      ))}
      {files.map(file => {
        const hasWarn = file.imports.some(i => i.type === 'unresolved');
        const isActive = file.id === selectedFileId;
        return (
          <button
            key={file.id}
            type="button"
            className={`tree-item ${isActive ? 'active' : ''}`}
            style={indent}
            onClick={() => onSelectFile(file.id)}
            aria-current={isActive ? 'true' : undefined}
            aria-label={`${file.name}${hasWarn ? ' — contém aviso de importação' : ''}`}
          >
            <span className="tree-item-name">{file.name}</span>
            {hasWarn && <span className="tree-warn-dot" aria-hidden="true" />}
            <span className={`badge-pill badge-${file.type}`} aria-hidden="true">{file.type}</span>
          </button>
        );
      })}
    </>
  );
}

export function FileTree({ files, selectedFileId, onSelectFile, searchQuery }: FileTreeProps) {
  const [activeTypes, setActiveTypes] = useState<Set<FileType>>(new Set());

  const toggleType = (t: FileType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) { next.delete(t); } else { next.add(t); }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = files;

    if (activeTypes.size > 0) {
      list = list.filter(f => activeTypes.has(f.type));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
    }

    return list;
  }, [files, searchQuery, activeTypes]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);

  return (
    <>
      <div className="panel-header">
        <span className="panel-label">Arquivos</span>
        <span className="count-badge" aria-label={`${filtered.length} arquivos`}>{filtered.length}</span>
      </div>

      {/* Filtros por tipo */}
      <div className="file-type-filters" role="group" aria-label="Filtrar por tipo de arquivo">
        {FILE_TYPES.map(t => (
          <button
            key={t}
            type="button"
            className={`filter-chip ${activeTypes.has(t) ? 'active' : ''}`}
            onClick={() => toggleType(t)}
            aria-pressed={activeTypes.has(t)}
            aria-label={`Filtrar por ${t}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="file-tree-scroll" role="tree" aria-label="Árvore de arquivos do projeto">
        {filtered.length === 0
          ? <div className="tree-empty">Nenhum arquivo encontrado</div>
          : <FolderNode folder={tree} depth={0} selectedFileId={selectedFileId} onSelectFile={onSelectFile} />
        }
      </div>
    </>
  );
}
