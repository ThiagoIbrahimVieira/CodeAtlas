import { useState, useCallback, useRef, useEffect } from 'react';
import type { AtlasProject } from './types/atlas';
import { sampleProject } from './mock/sampleProject';
import { LandingPage } from './components/LandingPage';
import { HeaderBar } from './components/layout/HeaderBar';
import { FileTree } from './components/fileTree/FileTree';
import { DependencyGraph, type DependencyGraphHandle } from './components/graph/DependencyGraph';
import { NodeDetails } from './components/details/NodeDetails';
import { readFilesFromInput, loadLocalProjectFromMemory } from './services/localProjectLoader';
import './App.css';

type View = 'landing' | 'workspace';
type DatasetMode = 'mock' | 'analyzed' | 'local';

export default function App() {
  const [view, setView]                             = useState<View>('landing');
  const [dataset, setDataset]                       = useState<DatasetMode>('mock');
  const [selectedId, setSelectedId]                 = useState<string | null>(null);
  const [searchQuery, setSearchQuery]               = useState('');
  const [sidebarOpen, setSidebarOpen]               = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [detailsOpen, setDetailsOpen]               = useState(() => typeof window !== 'undefined' ? window.innerWidth > 1024 : true);

  // Dynamic projects state
  const [analyzedProjectState, setAnalyzedProject]  = useState<AtlasProject | null>(null);
  const [localProject, setLocalProject]             = useState<AtlasProject | null>(null);
  const [isAnalyzing, setIsAnalyzing]               = useState(false);
  const [analysisError, setAnalysisError]           = useState<string | null>(null);

  const graphRef = useRef<DependencyGraphHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active project calculation
  const currentProject: AtlasProject =
    dataset === 'local' && localProject
      ? localProject
      : dataset === 'analyzed' && analyzedProjectState
        ? analyzedProjectState
        : sampleProject;

  const handleSelectFile = useCallback((id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setDetailsOpen(true);
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as unknown as { __loadLocalProject?: (p: AtlasProject) => void }).__loadLocalProject = (p: AtlasProject) => {
        setLocalProject(p);
        setDataset('local');
        setView('workspace');
        setSelectedId(p.files[0]?.id ?? null);
      };
      (window as unknown as { __setSelectedFileId?: (id: string) => void }).__setSelectedFileId = (id: string) => {
        setSelectedId(id);
      };
    }
  }, []);

  const handleDatasetChange = useCallback(
    async (newDataset: DatasetMode) => {
      setAnalysisError(null);

      if (newDataset === 'analyzed' && !analyzedProjectState) {
        setIsAnalyzing(true);
        try {
          // Dynamic code-splitting: TS Compiler API is only loaded when needed
          const mod = await import('./mock/analyzedProject');
          setAnalyzedProject(mod.analyzedProject);
          setDataset('analyzed');
          setSelectedId('src/index.ts');
        } catch {
          setAnalysisError('Falha ao carregar projeto de demonstração analisado.');
        } finally {
          setIsAnalyzing(false);
        }
        return;
      }

      setDataset(newDataset);
      if (newDataset === 'mock') {
        setSelectedId('src/App.tsx');
      } else if (newDataset === 'analyzed') {
        setSelectedId('src/index.ts');
      } else if (newDataset === 'local' && localProject) {
        setSelectedId(localProject.files[0]?.id ?? null);
      }
    },
    [analyzedProjectState, localProject]
  );

  const handleClearSelection = useCallback(() => setSelectedId(null), []);
  const handleFitView        = useCallback(() => graphRef.current?.fitView(), []);

  const handleOpenDemo = useCallback(() => {
    setView('workspace');
    setSelectedId(dataset === 'mock' ? 'src/App.tsx' : 'src/index.ts');
  }, [dataset]);

  const handleOpenLocalProject = useCallback(() => {
    setAnalysisError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        // Determine folder name from the first relative path if available
        const firstRelative = files[0]?.webkitRelativePath;
        const folderName = firstRelative ? firstRelative.split('/')[0] : 'Projeto Local';

        const virtualFiles = await readFilesFromInput(files);
        const result = await loadLocalProjectFromMemory(virtualFiles, folderName);

        setLocalProject(result.project);
        setDataset('local');
        setView('workspace');
        setSelectedId(result.project.files[0]?.id ?? null);
      } catch (err) {
        setAnalysisError(
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro ao ler e analisar o projeto selecionado.'
        );
      } finally {
        setIsAnalyzing(false);
        // Reset input value to allow selecting the same directory again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    []
  );

  return (
    <>
      {/* Hidden folder input selector */}
      <input
        ref={fileInputRef}
        id="local-project-file-input"
        name="local-project-file-input"
        type="file"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
      />

      {/* Global notifications (Loading spinner / Error alerts) */}
      {(isAnalyzing || analysisError) && (
        <div className="atlas-notification-container" aria-live="polite">
          {isAnalyzing && (
            <div className="atlas-notification atlas-notification-info" role="status">
              <span className="atlas-spinner" aria-hidden="true" />
              <span>Lendo e analisando dependências do projeto…</span>
            </div>
          )}
          {analysisError && (
            <div className="atlas-notification atlas-notification-error" role="alert">
              <span>{analysisError}</span>
              <button
                type="button"
                className="atlas-notification-close"
                onClick={() => setAnalysisError(null)}
                aria-label="Fechar mensagem de erro"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'landing' ? (
        <LandingPage
          onOpenDemo={handleOpenDemo}
          onOpenLocalProject={handleOpenLocalProject}
        />
      ) : (
        <div className="atlas-app">
          <HeaderBar
            projectName={currentProject.name}
            filesCount={currentProject.files.length}
            edgesCount={currentProject.edges.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isSidebarOpen={sidebarOpen}
            onToggleSidebar={() => {
              setSidebarOpen(prev => {
                const next = !prev;
                if (next && typeof window !== 'undefined' && window.innerWidth <= 768) {
                  setDetailsOpen(false);
                }
                return next;
              });
            }}
            isDetailsOpen={detailsOpen}
            onToggleDetails={() => {
              setDetailsOpen(prev => {
                const next = !prev;
                if (next && typeof window !== 'undefined' && window.innerWidth <= 768) {
                  setSidebarOpen(false);
                }
                return next;
              });
            }}
            onFitView={handleFitView}
            onClearSelection={handleClearSelection}
            hasSelection={selectedId !== null}
            dataset={dataset}
            onDatasetChange={handleDatasetChange}
            hasLocalProject={localProject !== null}
            onOpenLocalProject={handleOpenLocalProject}
            isAnalyzing={isAnalyzing}
          />

          <main className="atlas-main-content">
            <aside
              className={`atlas-sidebar ${sidebarOpen ? 'open' : 'closed'}`}
              aria-label="Árvore de arquivos"
              aria-hidden={!sidebarOpen}
            >
              <FileTree
                files={currentProject.files}
                selectedFileId={selectedId}
                onSelectFile={handleSelectFile}
                searchQuery={searchQuery}
              />
            </aside>

            <section className="atlas-canvas-area" aria-label="Grafo de dependências">
              <DependencyGraph
                ref={graphRef}
                project={currentProject}
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
                project={currentProject}
                selectedFileId={selectedId}
                onSelectFile={handleSelectFile}
                onClose={() => setDetailsOpen(false)}
              />
            </aside>

            {/* Mobile panel backdrop */}
            {(sidebarOpen || detailsOpen) && (
              <div
                className="atlas-panel-backdrop"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                    setSidebarOpen(false);
                    setDetailsOpen(false);
                  }
                }}
                aria-hidden="true"
              />
            )}
          </main>
        </div>
      )}
    </>
  );
}
