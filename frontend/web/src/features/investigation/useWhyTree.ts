import { useCallback, useEffect, useState } from 'react'
import { useAuthFetch } from '../../hooks/useAuthFetch'
import type { WhyNode } from '../chat/types'

type NodeUpdateEvent = {
  type: string
  payload?: {
    updated_nodes?: WhyNode[]
  }
}

export function useWhyTree(projectId: string, investigationId: string) {
  const authFetch = useAuthFetch()
  const [nodes, setNodes] = useState<WhyNode[]>([])

  const fetchTree = useCallback(async () => {
    const data: WhyNode[] = await authFetch(
      `/api/v1/projects/${projectId}/investigations/${investigationId}/tree`,
    )
    setNodes(data)
  }, [authFetch, projectId, investigationId])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  useEffect(() => {
    const source = new EventSource(
      `/api/v1/projects/${projectId}/investigations/${investigationId}/stream`,
    )
    source.onmessage = (event) => {
      const parsed: NodeUpdateEvent = JSON.parse(event.data)
      if (parsed.type !== 'node_update') return

      const updatedNodes = parsed.payload?.updated_nodes
      if (updatedNodes) {
        setNodes((prev) => {
          const byId = new Map(prev.map((n) => [n.id, n]))
          for (const node of updatedNodes) byId.set(node.id, node)
          return Array.from(byId.values())
        })
      } else {
        fetchTree()
      }
    }
    return () => source.close()
  }, [projectId, investigationId, fetchTree])

  return { nodes }
}
