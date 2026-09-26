import { useCallback, useEffect, useMemo } from 'react'
import {
  Background,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

/**
 * Flat 2D galaxy used on mobile, on reduced-motion, and when WebGL is missing.
 * Same data, same interactions — just draggable nodes instead of planets.
 */

function OrbNode({ data }) {
  const size = data.kind === 'core' ? 130 : data.kind === 'category' ? 104 : 88
  return (
    <div
      className="flex items-center justify-center rounded-full border text-center transition-transform duration-200"
      style={{
        width: size,
        height: size,
        borderColor: `${data.color}66`,
        background: `radial-gradient(circle at 32% 28%, ${data.color}44, rgba(7,11,26,0.92) 68%)`,
        boxShadow: `0 0 ${data.active ? 34 : 18}px -6px ${data.color}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="px-2">
        <div className="text-[10px] uppercase tracking-widest" style={{ color: data.color }}>
          {data.glyph}
        </div>
        <div className="mt-0.5 line-clamp-2 font-display text-[11px] leading-tight text-white">{data.label}</div>
        {data.sublabel && <div className="text-[10px] text-slate-400">{data.sublabel}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}

const nodeTypes = { orb: OrbNode }

function buildFlow(architecture, layout, focus, visibleCategories) {
  const nodes = [
    {
      id: 'core',
      type: 'orb',
      position: { x: 0, y: 0 },
      data: { kind: 'core', label: architecture.projectName, color: '#a78bfa', glyph: '◉', active: true },
    },
  ]
  const edges = []
  const radius = 320

  const visible = layout.categories.filter((category) => visibleCategories.has(category.key))
  visible.forEach((category, index) => {
    const angle = (index / Math.max(1, visible.length)) * Math.PI * 2
    const position = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
    nodes.push({
      id: category.id,
      type: 'orb',
      position,
      data: {
        kind: 'category',
        label: category.label,
        sublabel: `${category.count} nodes`,
        color: category.color,
        glyph: category.glyph,
        categoryKey: category.key,
        active: focus.categoryKey === category.key,
      },
    })
    edges.push({
      id: `core-${category.id}`,
      source: 'core',
      target: category.id,
      animated: focus.categoryKey === category.key,
      style: { stroke: category.color, strokeWidth: focus.categoryKey === category.key ? 2 : 1, opacity: 0.55 },
      type: 'default',
    })

    if (focus.level >= 2 && focus.categoryKey === category.key) {
      const childRadius = 190
      category.children.forEach((child, childIndex) => {
        const childAngle = (childIndex / Math.max(1, category.children.length)) * Math.PI * 2
        nodes.push({
          id: child.id,
          type: 'orb',
          position: {
            x: position.x + Math.cos(childAngle) * childRadius,
            y: position.y + Math.sin(childAngle) * childRadius,
          },
          data: {
            kind: 'child',
            label: child.name,
            color: category.color,
            glyph: '✦',
            categoryKey: category.key,
            active: focus.nodeId === child.id,
          },
        })
        edges.push({
          id: `${category.id}-${child.id}`,
          source: category.id,
          target: child.id,
          style: { stroke: category.color, strokeWidth: 1, opacity: 0.4 },
        })
      })
    }
  })

  return { nodes, edges }
}

function FlowInner({ architecture, layout, focus, visibleCategories, onSelect, commands }) {
  const computed = useMemo(
    () => buildFlow(architecture, layout, focus, visibleCategories),
    [architecture, focus, layout, visibleCategories],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(computed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(computed.edges)
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  // Share the workspace's floating zoom controls with the 2D map.
  useEffect(() => {
    if (!commands) return undefined
    commands.current = {
      zoomIn: () => zoomIn({ duration: 200 }),
      zoomOut: () => zoomOut({ duration: 200 }),
      fit: () => fitView({ padding: 0.25, duration: 400 }),
    }
    return () => {
      commands.current = null
    }
  }, [commands, fitView, zoomIn, zoomOut])

  useEffect(() => {
    setNodes(computed.nodes)
    setEdges(computed.edges)
    const timer = setTimeout(() => fitView({ padding: 0.25, duration: 500 }), 60)
    return () => clearTimeout(timer)
  }, [computed, fitView, setEdges, setNodes])

  const handleNodeClick = useCallback(
    (_, node) => {
      if (node.id === 'core') return onSelect({ kind: 'core' })
      onSelect({ kind: node.data.kind, id: node.id, categoryKey: node.data.categoryKey })
    },
    [onSelect],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="bg-transparent"
    >
      <Background color="#1e293b" gap={40} size={1} />
      <MiniMap
        pannable
        zoomable
        className="!border !border-white/10 !bg-void-800/80"
        nodeColor={(node) => node.data?.color ?? '#8b5cf6'}
        maskColor="rgba(4,6,15,0.7)"
      />
    </ReactFlow>
  )
}

export default function GalaxyFlow(props) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  )
}
