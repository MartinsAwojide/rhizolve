import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('loading...')

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main>
      <h1>Rhizolve</h1>
      <p>Backend health: {status}</p>
    </main>
  )
}

export default App
