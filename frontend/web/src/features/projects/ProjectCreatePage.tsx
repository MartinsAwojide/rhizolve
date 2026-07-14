import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
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
      <form onSubmit={handleSubmit} className="flex max-w-[24rem] flex-col gap-sm">
        <Input
          id="name"
          type="text"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          id="domain"
          type="text"
          label="Domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />

        <Button type="submit">Create project</Button>
      </form>
    </div>
  )
}
