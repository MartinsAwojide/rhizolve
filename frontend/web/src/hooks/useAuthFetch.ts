import { useAuth } from '@clerk/react'
import { useCallback } from 'react'

export function useAuthFetch() {
  const { getToken } = useAuth()

  return useCallback(
    async (url: string) => {
      const token = await getToken()
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        throw new Error(`Request to ${url} failed with ${res.status}`)
      }
      return res.json()
    },
    [getToken],
  )
}
