import { useState, useCallback, useRef } from 'react';
import { sampleProject } from './mock/sampleProject';
import { LandingPage } from './components/LandingPage';
import { HeaderBar } from './components/layout/HeaderBar';
import { FileTree } from './components/fileTree/FileTree';
import { DependencyGraph, type DependencyGraphHandle } from './components/graph/DependencyGraph';
import { NodeDetails } from './components/details/NodeDetails';
import './App.css';

type View = 'landing' | 'workspace';

export default function App() {
  const [view, setView]               = useState<View>('landing');
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const graphRef = useRef<DependencyGraphHandle>(null);

  const handleSelectFile = useCallback((id: string) => {
    setSelectedId(id);
    if (window.innerWidth <= 768) setDetailsOpen(true);
  }, []);

  const handleClearSelection = useCallback(() => setSelectedId(null), []);
  const handleFitView        = useCallback(() => graphRef.current?.fitView(), []);
  const handleOpenDemo       = useCallback(() => {
    setView('workspace');
    setSelectedId('src/App.tsx');
  }, []);

  if (view === 'landing') {
    return <LandingPage onOpenDemo={handleOpenDemo} />;
  }

  return (
    <div className="atlas-app">
      <HeaderBar
        projectName={sampleProject.name}
        filesCount={sampleProject.files.length}
        edgesCount={sampleProject.edges.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(p => !p)}
        isDetailsOpen={detailsOpen}
        onToggleDetails={() => setDetailsOpen(p => !p)}
        onFitView={handleFitView}
        onClearSelection={handleClearSelection}
        hasSelection={selectedId !== null}
      />

      <main className="atlas-main-content">
        <aside
          className={`atlas-sidebar ${sidebarOpen ? 'open' : 'closed'}`}
          aria-label="Árvore de arquivos"
          aria-hidden={!sidebarOpen}
        >
          <FileTree
            files={sampleProject.files}
            selectedFileId={selectedId}
            onSelectFile={handleSelectFile}
            searchQuery={searchQuery}
          />
        </aside>

        <section className="atlas-canvas-area" aria-label="Grafo de dependências">
          <DependencyGraph
            ref={graphRef}
            project={sampleProject}
            selectedFileId={selectedId}
            onSelectFile={handleSelectFile}
          />
        </section>

        <aside
          className={`atlas-details-panel ${detailsOpen ? 'open' : 'closed'}`}
          aria-label="Detalhes do arquivo"
          aria-hidden={!detailsOpen}
        >
          <NodeDetails
            project={sampleProject}
            selectedFileId={selectedId}
            onSelectFile={handleSelectFile}
            onClose={() => setDetailsOpen(false)}
          />
        </aside>
      </main>
    </div>
  );
}
