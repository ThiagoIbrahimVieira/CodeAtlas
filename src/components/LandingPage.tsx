interface LandingPageProps {
  onOpenDemo: () => void;
  onOpenLocalProject: () => void;
}

// Mini-grafo SVG estático que serve de preview visual na landing
function GraphPreview() {
  const nodes = [
    { id: 'main',    x: 200, y: 30,  label: 'main.tsx',    color: '#E7BD72' },
    { id: 'app',     x: 200, y: 110, label: 'App.tsx',     color: '#63D6A5' },
    { id: 'header',  x: 80,  y: 200, label: 'Header.tsx',  color: '#63D6A5' },
    { id: 'sidebar', x: 200, y: 200, label: 'Sidebar.tsx', color: '#63D6A5' },
    { id: 'viewer',  x: 330, y: 200, label: 'Viewer.tsx',  color: '#63D6A5' },
    { id: 'button',  x: 80,  y: 290, label: 'Button.tsx',  color: '#63D6A5' },
    { id: 'auth',    x: 200, y: 290, label: 'authService', color: '#B4AAF0' },
    { id: 'storage', x: 330, y: 290, label: 'storage.ts',  color: '#B4AAF0' },
    { id: 'missing', x: 330, y: 370, label: '⚠ MissingParser', color: '#F08080' },
  ];

  const edges = [
    ['main','app'], ['app','header'], ['app','sidebar'], ['app','viewer'],
    ['header','button'], ['sidebar','button'], ['viewer','auth'],
    ['auth','storage'], ['viewer','missing'],
  ];

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <svg
      viewBox="0 0 430 420"
      width="100%"
      height="100%"
      aria-label="Prévia do grafo de dependências do CodeAtlas"
      role="img"
    >
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#343D37" />
        </marker>
        <marker id="arr-warn" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F08080" />
        </marker>
      </defs>

      {edges.map(([s, t]) => {
        const sn = nodeMap[s], tn = nodeMap[t];
        const isWarn = t === 'missing';
        return (
          <line
            key={`${s}-${t}`}
            x1={sn.x + 60} y1={sn.y + 16}
            x2={tn.x + 60} y2={tn.y}
            stroke={isWarn ? '#F08080' : '#343D37'}
            strokeWidth={isWarn ? 1.5 : 1.2}
            markerEnd={isWarn ? 'url(#arr-warn)' : 'url(#arr)'}
            opacity={isWarn ? 0.9 : 0.7}
          />
        );
      })}

      {nodes.map(n => (
        <g key={n.id}>
          <rect
            x={n.x} y={n.y} width={120} height={28}
            rx={4}
            fill="#202723"
            stroke={n.color === '#63D6A5' ? 'rgba(99,214,165,0.4)' : n.id === 'missing' ? '#F08080' : 'rgba(180,170,240,0.4)'}
            strokeWidth={n.id === 'app' ? 1.5 : 1}
          />
          <text
            x={n.x + 60} y={n.y + 18}
            textAnchor="middle"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fill={n.color}
            opacity={0.9}
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function LandingPage({ onOpenDemo, onOpenLocalProject }: LandingPageProps) {
  return (
    <main className="landing-root">
      <div className="landing-content">
        {/* Marca */}
        <div className="landing-brand">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="8"  r="4" fill="#63D6A5"/>
            <circle cx="7"  cy="24" r="4" fill="#343D37" stroke="#63D6A5" strokeWidth="1.5"/>
            <circle cx="25" cy="24" r="4" fill="#343D37" stroke="#AAB6AF" strokeWidth="1.5"/>
            <line x1="16" y1="12" x2="7"  y2="20" stroke="#63D6A5" strokeWidth="1.5"/>
            <line x1="16" y1="12" x2="25" y2="20" stroke="#AAB6AF" strokeWidth="1.5"/>
          </svg>
          <span className="landing-logo-text">CodeAtlas</span>
        </div>

        {/* Título e descrição */}
        <h1 className="landing-headline">
          Visualize as dependências<br />
          do seu projeto
        </h1>
        <p className="landing-description">
          Transforme as importações entre arquivos JavaScript e TypeScript em um grafo
          interativo. Navegue, filtre e entenda como as partes do seu código se conectam.
        </p>

        {/* Ações */}
        <div className="landing-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenDemo}
          >
            Explorar demonstração
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onOpenLocalProject}
            title="Selecionar pasta de um projeto local para análise"
          >
            Abrir pasta local
          </button>
        </div>

        {/* Como funciona */}
        <div className="landing-steps">
          <div className="step">
            <span className="step-num font-mono">01</span>
            <div>
              <strong>Selecione os arquivos</strong>
              <p>Aponte para os arquivos do projeto que deseja analisar.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-num font-mono">02</span>
            <div>
              <strong>Grafo automático</strong>
              <p>Cada arquivo vira um nó; cada importação, uma aresta direcional.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-num font-mono">03</span>
            <div>
              <strong>Explore conexões</strong>
              <p>Clique em qualquer nó para ver dependências, dependentes e diagnósticos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview do grafo */}
      <div className="landing-preview" aria-hidden="true">
        <div className="preview-frame">
          <div className="preview-toolbar">
            <span className="preview-dot" style={{ background: '#F08080' }} />
            <span className="preview-dot" style={{ background: '#E7BD72' }} />
            <span className="preview-dot" style={{ background: '#63D6A5' }} />
            <span className="preview-title font-mono">CodeAtlas Demo Project</span>
          </div>
          <div className="preview-graph-area">
            <GraphPreview />
          </div>
        </div>
      </div>
    </main>
  );
}
