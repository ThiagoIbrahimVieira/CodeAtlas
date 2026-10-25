interface HeaderBarProps {
  projectName: string;
  filesCount: number;
  edgesCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  onFitView: () => void;
  onClearSelection: () => void;
  hasSelection: boolean;
  dataset: 'mock' | 'analyzed' | 'local';
  onDatasetChange: (ds: 'mock' | 'analyzed' | 'local') => void;
  hasLocalProject: boolean;
  onOpenLocalProject: () => void;
  isAnalyzing?: boolean;
}

export function HeaderBar({
  projectName,
  filesCount,
  edgesCount,
  searchQuery,
  onSearchChange,
  isSidebarOpen,
  onToggleSidebar,
  isDetailsOpen,
  onToggleDetails,
  onFitView,
  onClearSelection,
  hasSelection,
  dataset,
  onDatasetChange,
  hasLocalProject,
  onOpenLocalProject,
  isAnalyzing = false,
}: HeaderBarProps) {
  return (
    <header className="header-bar" role="banner">
      <div className="header-left">
        {/* Toggle árvore */}
        <button
          type="button"
          className={`icon-btn ${isSidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Ocultar árvore de arquivos' : 'Mostrar árvore de arquivos'}
          title={isSidebarOpen ? 'Ocultar árvore' : 'Mostrar árvore'}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <rect x="0" y="1" width="5" height="2" rx="1" fill="currentColor"/>
            <rect x="0" y="5" width="5" height="2" rx="1" fill="currentColor" opacity=".6"/>
            <rect x="0" y="9" width="5" height="2" rx="1" fill="currentColor" opacity=".3"/>
            <rect x="7" y="0" width="6" height="13" rx="1" fill="currentColor" opacity=".15"/>
          </svg>
        </button>

        {/* Marca */}
        <div className="brand" aria-label="CodeAtlas">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="3" r="2.5" fill="var(--mint-primary)"/>
            <circle cx="3" cy="12" r="2" fill="none" stroke="var(--mint-primary)" strokeWidth="1.2"/>
            <circle cx="13" cy="12" r="2" fill="none" stroke="var(--text-muted)" strokeWidth="1.2"/>
            <line x1="8" y1="5.5" x2="3.8" y2="10" stroke="var(--mint-primary)" strokeWidth="1.1"/>
            <line x1="8" y1="5.5" x2="12.2" y2="10" stroke="var(--text-muted)" strokeWidth="1.1"/>
          </svg>
          <span className="brand-title">CodeAtlas</span>
        </div>

        {/* Seletor de Dataset (Mock Padrão vs Analisado Real vs Local Carregado) */}
        <div className="dataset-switcher" role="group" aria-label="Fonte do grafo">
          <button
            type="button"
            className={`dataset-btn ${dataset === 'mock' ? 'active' : ''}`}
            onClick={() => onDatasetChange('mock')}
            title="Projeto simulado (13 arquivos)"
            aria-pressed={dataset === 'mock'}
          >
            Mock (13)
          </button>
          <button
            type="button"
            className={`dataset-btn ${dataset === 'analyzed' ? 'active' : ''}`}
            onClick={() => onDatasetChange('analyzed')}
            title="Projeto demonstrativo analisado (8 arquivos)"
            aria-pressed={dataset === 'analyzed'}
          >
            Analisado (8)
          </button>
          {hasLocalProject && (
            <button
              type="button"
              className={`dataset-btn ${dataset === 'local' ? 'active' : ''}`}
              onClick={() => onDatasetChange('local')}
              title="Projeto local carregado"
              aria-pressed={dataset === 'local'}
            >
              Local ({filesCount})
            </button>
          )}
        </div>

        {/* Estatísticas */}
        <div className="header-stats" aria-label={`${filesCount} arquivos, ${edgesCount} conexões`}>
          <span className="font-mono">{projectName}</span>
          <span className="stat-sep" aria-hidden="true">·</span>
          <span className="font-mono">{filesCount} arquivos</span>
          <span className="stat-sep" aria-hidden="true">·</span>
          <span className="font-mono">{edgesCount} conexões</span>
        </div>
      </div>

      {/* Busca */}
      <div className="header-center">
        <div className="search-box" role="search">
          <span className="search-icon" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="7.5" y1="7.5" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            id="project-search-input"
            name="search"
            type="search"
            className="search-input"
            placeholder="Buscar arquivo…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar arquivo no projeto"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Ações do grafo */}
      <div className="header-right">
        {/* Botão Abrir Pasta */}
        <button
          type="button"
          className="btn-text"
          onClick={onOpenLocalProject}
          disabled={isAnalyzing}
          aria-label="Abrir pasta local de projeto"
          title="Selecionar pasta do projeto no computador"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1.5 3.5A1.5 1.5 0 0 1 3 2h3.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 0 10.12 4.5H13A1.5 1.5 0 0 1 14.5 6v6.5a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          <span className="btn-label">{isAnalyzing ? 'Analisando…' : 'Abrir pasta'}</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onFitView}
          aria-label="Ajustar grafo à tela"
          title="Ajustar à tela"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M1 4V1h3M9 1h3v3M12 9v3H9M4 12H1V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>

        {hasSelection && (
          <button
            type="button"
            className="btn-text"
            onClick={onClearSelection}
            aria-label="Limpar seleção atual"
            title="Limpar seleção"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span className="btn-label">Limpar seleção</span>
          </button>
        )}

        <div className="header-divider" aria-hidden="true" />

        <button
          type="button"
          className={`btn-text ${isDetailsOpen ? 'active' : ''}`}
          onClick={onToggleDetails}
          aria-label={isDetailsOpen ? 'Ocultar painel de detalhes' : 'Mostrar painel de detalhes'}
          title="Painel de detalhes"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
            <line x1="7" y1="0.5" x2="7" y2="10.5" stroke="currentColor" strokeWidth="1.1"/>
          </svg>
          <span className="btn-label">Detalhes</span>
        </button>
      </div>
    </header>
  );
}
