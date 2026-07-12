import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { useAuthFetch } from '../../hooks/useAuthFetch'

export function ProjectCreatePage() {
  const authFetch = useAuthFetch()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    const project: { id: string } = await authFetch('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, domain: domain || null, visibility: 'private' }),
    })
    navigate(`/projects/${project.id}`)
  }

  return (
    <div className="p-lg">
      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-sm">
        <label htmlFor="name" className="text-sm text-text-secondary">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-control bg-surface-1 px-sm py-xs text-text-primary"
        />

        <label htmlFor="domain" className="text-sm text-text-secondary">
          Domain
        </label>
        <input
          id="domain"
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-control bg-surface-1 px-sm py-xs text-text-primary"
        />

        <Button type="submit">Create project</Button>
      </form>
    </div>
  )
}
