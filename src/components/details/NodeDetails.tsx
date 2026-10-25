import { useMemo } from 'react';
import type { AtlasFile, AtlasProject } from '../../types/atlas';

interface NodeDetailsProps {
  project: AtlasProject;
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onClose: () => void;
}

export function NodeDetails({ project, selectedFileId, onSelectFile, onClose }: NodeDetailsProps) {
  const file = project.files.find(f => f.id === selectedFileId) ?? null;

  const dependents = useMemo(() => {
    if (!selectedFileId) return [] as AtlasFile[];
    return project.edges
      .filter(e => e.target === selectedFileId)
      .map(e => project.files.find(f => f.id === e.source))
      .filter((f): f is AtlasFile => Boolean(f));
  }, [project, selectedFileId]);

  if (!file) {
    return (
      <div className="details-empty" role="region" aria-label="Painel de detalhes">
        <div className="details-empty-icon" aria-hidden="true">⬡</div>
        <h2 className="details-empty" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Nenhum arquivo selecionado
        </h2>
        <p>Clique em um nó no grafo ou em um arquivo na árvore lateral para inspecionar dependências e diagnósticos.</p>
      </div>
    );
  }

  const internal   = file.imports.filter(i => i.type === 'internal');
  const external   = file.imports.filter(i => i.type === 'external');
  const unresolved = file.imports.filter(i => i.type === 'unresolved');
  const ignored    = file.imports.filter(i => i.type === 'ignored');

  return (
    <div role="region" aria-label={`Detalhes do arquivo ${file.name}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Cabeçalho do arquivo */}
      <div className="panel-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
          <span className={`badge-pill badge-${file.type}`}>{file.type}</span>
          <span className="details-file-name font-mono">{file.name}</span>
          <span className="details-file-path font-mono">{file.path}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Fechar painel de detalhes"
          title="Fechar"
          style={{ flexShrink: 0, alignSelf: 'flex-start' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="details-scroll">
        {/* Métricas */}
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Linhas</span>
            <span className="metric-value font-mono">{file.linesCount}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Tamanho</span>
            <span className="metric-value font-mono">{file.sizeBytes} B</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Imports</span>
            <span className="metric-value font-mono">{file.imports.length}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Dependentes</span>
            <span className="metric-value font-mono">{dependents.length}</span>
          </div>
        </div>

        {/* Diagnósticos / Avisos Reais */}
        {unresolved.length > 0 && (
          <div className="details-section">
            <span className="section-heading warn" role="heading" aria-level={3}>
              Avisos ({unresolved.length})
            </span>
            {unresolved.map(imp => (
              <div key={imp.specifier} className="diag-block">
                <span className="diag-spec">{imp.specifier}</span>
                <span className="diag-note">{imp.diagnosticNote}</span>
              </div>
            ))}
          </div>
        )}

        {/* Referências a artefatos gerados ou ignorados intencionalmente */}
        {ignored.length > 0 && (
          <div className="details-section">
            <span className="section-heading" role="heading" aria-level={3} style={{ color: 'var(--text-secondary)' }}>
              Gerados / Ignorados ({ignored.length})
            </span>
            {ignored.map(imp => (
              <div key={imp.specifier} className="diag-block ignored">
                <span className="diag-spec font-mono">{imp.specifier}</span>
                <span className="diag-note">{imp.diagnosticNote}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dependências internas */}
        <div className="details-section">
          <span className="section-heading" role="heading" aria-level={3}>
            Importa ({internal.length})
          </span>
          {internal.length === 0
            ? <span className="empty-desc">Nenhuma dependência interna</span>
            : (
              <div className="conn-list">
                {internal.map(imp => (
                  <button
                    key={imp.specifier}
                    type="button"
                    className="conn-btn"
                    onClick={() => imp.resolvedPath && onSelectFile(imp.resolvedPath)}
                    aria-label={`Navegar para ${imp.resolvedPath ?? imp.specifier}`}
                  >
                    <span className="conn-arrow" aria-hidden="true">↳</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div className="conn-name">{imp.specifier}</div>
                      {imp.resolvedPath && <div className="conn-path">{imp.resolvedPath}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )
          }
        </div>

        {/* Usado por */}
        <div className="details-section">
          <span className="section-heading" role="heading" aria-level={3}>
            Usado por ({dependents.length})
          </span>
          {dependents.length === 0
            ? <span className="empty-desc">Nenhum arquivo depende diretamente deste</span>
            : (
              <div className="conn-list">
                {dependents.map(dep => (
                  <button
                    key={dep.id}
                    type="button"
                    className="conn-btn"
                    onClick={() => onSelectFile(dep.id)}
                    aria-label={`Navegar para ${dep.name}`}
                  >
                    <span className="conn-arrow" aria-hidden="true">↵</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div className="conn-name">{dep.name}</div>
                      <div className="conn-path">{dep.path}</div>
                    </div>
                  </button>
                ))}
              </div>
            )
          }
        </div>

        {/* Externos */}
        {external.length > 0 && (
          <div className="details-section">
            <span className="section-heading" role="heading" aria-level={3}>
              Pacotes externos ({external.length})
            </span>
            <div className="tag-row">
              {external.map(e => (
                <span key={e.specifier} className="tag-external">{e.specifier}</span>
              ))}
            </div>
          </div>
        )}

        {/* Exportações */}
        {file.exports.length > 0 && (
          <div className="details-section">
            <span className="section-heading" role="heading" aria-level={3}>
              Exportações ({file.exports.length})
            </span>
            <div className="tag-row">
              {file.exports.map(exp => (
                <span key={exp} className="tag-export">{exp}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
