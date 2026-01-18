import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

type HealthStatus = {
  status: string
  message?: string
  timestamp?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '')

function App() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkBackend = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get<HealthStatus>(`${API_ROOT_URL}/health`, {
        timeout: 5000
      })
      setHealthStatus(response.data)
    } catch (err) {
      console.error('Backend connection failed:', err)
      setHealthStatus(null)
      setError('Unable to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkBackend()
  }, [checkBackend])

  const renderStatus = () => {
    if (loading) {
      return <p className="text-gray-500">Checking connection...</p>
    }

    if (healthStatus?.status === 'OK') {
      return (
        <div className="text-green-600 space-y-1">
          <p className="font-medium">✓ Connected</p>
          <p className="text-sm">{healthStatus.message}</p>
          {healthStatus.timestamp && (
            <p className="text-xs text-gray-500">Updated: {healthStatus.timestamp}</p>
          )}
        </div>
      )
    }

    return (
      <div className="text-red-600 space-y-1">
        <p className="font-medium">✗ Disconnected</p>
        <p className="text-sm">
          {error ?? `The backend is unavailable. Verify it is running at ${API_ROOT_URL}.`}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">🚀 Project Apollo</h1>
        <p className="text-xl text-gray-600 mb-6">Unified Educational Platform</p>

        <div className="bg-gray-50 rounded-lg p-5 mb-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Backend Status</h2>
            <span className="text-xs text-gray-500">{API_ROOT_URL}/health</span>
          </div>
          {renderStatus()}
          <button
            className="mt-4 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition"
            onClick={checkBackend}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Retry'}
          </button>
        </div>

        <div className="space-y-2 text-left">
          <h3 className="font-semibold text-gray-700">Tech Stack</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Frontend: React 18 + Vite + TypeScript + Tailwind CSS</li>
            <li>Backend: Node.js + Express + TypeScript</li>
            <li>Database: PostgreSQL (pending setup)</li>
            <li>Payments: Stripe</li>
          </ul>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Team: Andy, Bryan, Michel, Angie, Richard</p>
        </div>
      </div>
    </div>
  )
}

export default App
