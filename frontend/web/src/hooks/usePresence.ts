import { useEffect, useState } from 'react'
import { useAuthFetch } from './useAuthFetch'

const HEARTBEAT_INTERVAL_MS = 5000

export type PresenceParticipant = {
  user_id: string
  name: string | null
  role: string
  joined_at: string
  editing: boolean
  editing_node: string | null
}

type PresenceEvent = {
  type: string
  payload?: {
    users?: PresenceParticipant[]
    driver?: PresenceParticipant | null
  }
}

export function usePresence(projectId: string, investigationId: string) {
  const authFetch = useAuthFetch()
  const [participants, setParticipants] = useState<PresenceParticipant[]>([])
  const [driver, setDriver] = useState<PresenceParticipant | null>(null)

  useEffect(() => {
    const heartbeat = () =>
      authFetch(`/api/v1/projects/${projectId}/investigations/${investigationId}/presence/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then((data: { users: PresenceParticipant[] }) => {
        setParticipants(data.users)
      })

    heartbeat()
    const interval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [authFetch, projectId, investigationId])

  useEffect(() => {
    const source = new EventSource(
      `/api/v1/projects/${projectId}/investigations/${investigationId}/stream`,
    )
    source.onmessage = (event) => {
      const parsed: PresenceEvent = JSON.parse(event.data)
      if (parsed.type === 'presence_snapshot' && parsed.payload?.users) {
        setParticipants(parsed.payload.users)
      } else if (parsed.type === 'driver_changed') {
        setDriver(parsed.payload?.driver ?? null)
      }
    }
    return () => source.close()
  }, [projectId, investigationId])

  return { participants, driver }
}
