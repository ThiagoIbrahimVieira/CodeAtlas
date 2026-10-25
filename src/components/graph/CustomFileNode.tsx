import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { AtlasFile } from '../../types/atlas';

interface CustomFileNodeData {
  file: AtlasFile;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  hasDiagnostics: boolean;
}

export const CustomFileNode = memo(({ data }: { data: CustomFileNodeData }) => {
  const { file, isSelected, isHighlighted, isDimmed, hasDiagnostics } = data;

  const cls = [
    'atlas-node',
    isSelected    ? 'node-selected'    : '',
    isHighlighted ? 'node-highlighted' : '',
    isDimmed      ? 'node-dimmed'      : '',
    hasDiagnostics ? 'node-has-warning' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      role="button"
      aria-label={`Arquivo ${file.name}, tipo ${file.type}${hasDiagnostics ? ', com aviso de importação' : ''}`}
      aria-pressed={isSelected}
    >
      <Handle type="target" position={Position.Top}    className="atlas-handle" aria-hidden="true" />

      <div className="atlas-node-header">
        <span className={`badge-pill badge-${file.type}`} aria-label={`Tipo: ${file.type}`}>
          {file.type}
        </span>
        {hasDiagnostics && (
          <span className="atlas-node-warn" title="Contém aviso de importação não resolvida" aria-label="Aviso">!</span>
        )}
      </div>

      <div className="atlas-node-name font-mono">{file.name}</div>
      <div className="atlas-node-path">{file.path}</div>

      <div className="atlas-node-footer font-mono">
        <span>{file.linesCount} L</span>
        <span>{file.imports.length} imp</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="atlas-handle" aria-hidden="true" />
    </div>
  );
});

CustomFileNode.displayName = 'CustomFileNode';
