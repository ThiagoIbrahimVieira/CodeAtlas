import { useMemo, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { AtlasProject } from '../../types/atlas';
import { CustomFileNode } from './CustomFileNode';

export interface DependencyGraphHandle {
  fitView: () => void;
}

interface DependencyGraphProps {
  project: AtlasProject;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

// Posições pré-calculadas para o mock e o projeto analisado (col × row)
const POSITIONS: Record<string, { x: number; y: number }> = {
  // Mock Demo Project
  'src/main.tsx':                         { x: 380, y:  20 },
  'src/index.css':                        { x: 640, y: 120 },
  'src/App.tsx':                          { x: 380, y: 140 },
  'src/components/Header.tsx':            { x:  80, y: 280 },
  'src/components/Sidebar.tsx':           { x: 320, y: 280 },
  'src/components/CodeViewer.tsx':        { x: 580, y: 280 },
  'src/hooks/useTheme.ts':                { x: 840, y: 280 },
  'src/components/common/Button.tsx':     { x: 180, y: 420 },
  'src/components/common/UserBadge.tsx':  { x:  20, y: 420 },
  'src/hooks/useNavigation.ts':           { x: 380, y: 420 },
  'src/utils/formatters.ts':              { x: 580, y: 420 },
  'src/services/authService.ts':          { x:  20, y: 560 },
  'src/utils/storage.ts':                 { x: 360, y: 560 },

  // Analyzed Demo Project
  'src/index.ts':                         { x: 380, y:  30 },
  'src/config.ts':                        { x: 650, y: 160 },
  'src/services/userService.ts':          { x: 140, y: 160 },
  'src/components/Dashboard.tsx':         { x: 650, y: 300 },
  'src/utils/logger.ts':                 { x:  60, y: 440 },
  'src/utils/crypto.ts':                 { x: 360, y: 440 },
  'src/standaloneHelper.ts':             { x: 650, y:  30 },
};

/**
 * Deterministic collision-free grid layout fallback for nodes not in POSITIONS dictionary.
 */
function calculateFallbackGridPosition(index: number, total: number): { x: number; y: number } {
  const cols = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(total))));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: 80 + col * 270,
    y: 50 + row * 160,
  };
}

const NODE_TYPES = { customFileNode: CustomFileNode };

function FlowInner({
  project,
  selectedFileId,
  onSelectFile,
  innerRef,
}: DependencyGraphProps & { innerRef: React.Ref<DependencyGraphHandle> }) {
  const { setCenter, getNode, fitView } = useReactFlow();
  const lastCentered = useRef<string | null>(null);

  useImperativeHandle(innerRef, () => ({
    fitView: () => fitView({ duration: 300, padding: 0.18 }),
  }));

  // Nós conectados ao selecionado (ele mesmo + vizinhos diretos)
  const connected = useMemo(() => {
    const s = new Set<string>();
    if (!selectedFileId) return s;
    s.add(selectedFileId);
    project.edges.forEach(e => {
      if (e.source === selectedFileId) s.add(e.target);
      if (e.target === selectedFileId) s.add(e.source);
    });
    return s;
  }, [selectedFileId, project.edges]);

  const rfNodes: Node[] = useMemo(() => project.files.map((file, index) => {
    const isSelected    = file.id === selectedFileId;
    const isHighlighted = connected.has(file.id) && !isSelected;
    const isDimmed      = selectedFileId !== null && !connected.has(file.id);
    return {
      id: file.id,
      type: 'customFileNode',
      position: POSITIONS[file.id] ?? calculateFallbackGridPosition(index, project.files.length),
      data: {
        file,
        isSelected,
        isHighlighted,
        isDimmed,
        hasDiagnostics: file.imports.some(i => i.type === 'unresolved'),
      },
    };
  }), [project.files, selectedFileId, connected]);

  const rfEdges: Edge[] = useMemo(() => project.edges.map(e => {
    const isActive = selectedFileId !== null &&
      (e.source === selectedFileId || e.target === selectedFileId);
    const isDimmed = selectedFileId !== null && !isActive;

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      animated: isActive,
      style: {
        stroke: isActive ? 'var(--mint-primary)'
               : isDimmed ? 'rgba(52,61,55,0.35)'
               : 'var(--border-subtle)',
        strokeWidth: isActive ? 2 : 1.2,
        opacity: isDimmed ? 0.2 : 1,
        transition: 'stroke 150ms ease, opacity 150ms ease',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12, height: 12,
        color: isActive ? 'var(--mint-primary)'
               : isDimmed ? 'rgba(52,61,55,0.35)'
               : 'var(--border-subtle)',
      },
    };
  }), [project.edges, selectedFileId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => { setNodes(rfNodes); }, [rfNodes, setNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges, setEdges]);

  // Centralizar suavemente apenas quando o nó selecionado muda
  useEffect(() => {
    if (!selectedFileId || lastCentered.current === selectedFileId) return;
    const n = getNode(selectedFileId);
    if (n) {
      lastCentered.current = selectedFileId;
      setCenter(n.position.x + 90, n.position.y + 40, { duration: 350, zoom: 1.05 });
    }
  }, [selectedFileId, getNode, setCenter]);

  return (
    <div className="atlas-graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_, node) => {
          lastCentered.current = node.id;
          onSelectFile(node.id);
        }}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.25}
        maxZoom={2}
        aria-label="Grafo de dependências do projeto"
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#242C27"
          gap={22}
          size={1.1}
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
          aria-label="Controles do grafo"
        />
        <MiniMap
          position="bottom-left"
          nodeColor={(n) => {
            const d = n.data as { isSelected?: boolean; isDimmed?: boolean };
            if (d.isSelected) return 'var(--mint-primary)';
            if (d.isDimmed)   return '#1e2620';
            return '#343D37';
          }}
          maskColor="rgba(21,25,23,0.7)"
          style={{ bottom: 12, left: 12 }}
        />
      </ReactFlow>

      {/* Legenda da convenção de arestas */}
      <div className="graph-legend" aria-label="Legenda do grafo">
        <div className="legend-row">
          <div className="legend-line" />
          <span>Importação (A → B: A importa B)</span>
        </div>
        <div className="legend-row">
          <div className="legend-line mint" />
          <span>Conexão do arquivo selecionado</span>
        </div>
      </div>
    </div>
  );
}

export const DependencyGraph = forwardRef<DependencyGraphHandle, DependencyGraphProps>((props, ref) => (
  <ReactFlowProvider>
    <FlowInner {...props} innerRef={ref} />
  </ReactFlowProvider>
));

DependencyGraph.displayName = 'DependencyGraph';
