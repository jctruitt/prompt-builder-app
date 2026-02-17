import { useState, useEffect } from 'react'

export default function AccountSettings({ user, onUpdate, onNavigate }) {
  // Password change
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  // API keys
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('anthropic')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [keyMsg, setKeyMsg] = useState('')
  const [keyError, setKeyError] = useState('')
  const [keyLoading, setKeyLoading] = useState(false)

  // MCP config
  const [mcpKeyName, setMcpKeyName] = useState('')
  const [mcpKeyValue, setMcpKeyValue] = useState('')

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/api-keys')
      if (res.ok) {
        setApiKeys(await res.json())
      }
    } catch { /* ignore */ }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwMsg('')

    if (passwords.new !== passwords.confirm) {
      setPwError('New passwords do not match')
      return
    }
    if (passwords.new.length < 8) {
      setPwError('New password must be at least 8 characters')
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new })
      })
      const data = await res.json()
      if (!res.ok) {
        setPwError(data.error || 'Password change failed')
        return
      }
      setPwMsg('Password changed successfully')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch {
      setPwError('Connection error')
    } finally {
      setPwLoading(false)
    }
  }

  const handleSaveKey = async (keyName, keyValue) => {
    if (!keyValue) return
    setKeyError('')
    setKeyMsg('')
    setKeyLoading(true)

    try {
      const res = await fetch(`/api/api-keys/${encodeURIComponent(keyName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyValue })
      })
      const data = await res.json()
      if (!res.ok) {
        setKeyError(data.error || 'Failed to save key')
        return
      }
      setKeyMsg(`Key "${keyName}" saved successfully`)
      setNewKeyValue('')
      setMcpKeyName('')
      setMcpKeyValue('')
      fetchKeys()
    } catch {
      setKeyError('Connection error')
    } finally {
      setKeyLoading(false)
    }
  }

  const handleDeleteKey = async (keyName) => {
    if (!confirm(`Delete the "${keyName}" API key?`)) return

    try {
      await fetch(`/api/api-keys/${encodeURIComponent(keyName)}`, { method: 'DELETE' })
      setKeyMsg(`Key "${keyName}" deleted`)
      fetchKeys()
    } catch {
      setKeyError('Failed to delete key')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => onNavigate('builder')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Builder
        </button>

        <h1 className="text-2xl font-bold text-white mb-6">Account Settings</h1>

        {/* Password Change */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>

          {pwMsg && (
            <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-3 text-emerald-300 text-sm mb-4">
              {pwMsg}
            </div>
          )}
          {pwError && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm mb-4">
              {pwError}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors"
            >
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* API Key Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">API Keys</h2>
          <p className="text-sm text-slate-400 mb-4">
            API keys are encrypted with AES-256-GCM before storage. They are never exposed to the browser after saving.
          </p>

          {keyMsg && (
            <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-3 text-emerald-300 text-sm mb-4">
              {keyMsg}
            </div>
          )}
          {keyError && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm mb-4">
              {keyError}
            </div>
          )}

          {/* Existing keys */}
          {apiKeys.length > 0 && (
            <div className="space-y-2 mb-4">
              {apiKeys.map((k) => (
                <div key={k.keyName} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                  <div>
                    <span className="text-white font-medium text-sm">{k.keyName}</span>
                    <span className="text-slate-500 text-xs ml-3 font-mono">{k.preview}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(k.keyName)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Anthropic key */}
          <div className="border-t border-slate-800 pt-4 mt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Anthropic API Key</h3>
            <div className="flex gap-2">
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                placeholder="sk-ant-..."
              />
              <button
                onClick={() => handleSaveKey('anthropic', newKeyValue)}
                disabled={!newKeyValue || keyLoading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {keyLoading ? 'Saving...' : 'Save Key'}
              </button>
            </div>
          </div>

          {/* Add MCP / custom key */}
          <div className="border-t border-slate-800 pt-4 mt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">MCP / Custom API Key</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={mcpKeyName}
                onChange={(e) => setMcpKeyName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                placeholder="Key name (e.g., openai, github, mcp-weather)"
                pattern="[a-zA-Z0-9_-]+"
                title="Letters, numbers, hyphens, and underscores only"
              />
              <div className="flex gap-2">
                <input
                  type="password"
                  value={mcpKeyValue}
                  onChange={(e) => setMcpKeyValue(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                  placeholder="API key or token value"
                />
                <button
                  onClick={() => handleSaveKey(mcpKeyName, mcpKeyValue)}
                  disabled={!mcpKeyName || !mcpKeyValue || keyLoading}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Username</span>
              <span className="text-white">@{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Display Name</span>
              <span className="text-white">{user.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Email</span>
              <span className="text-white">{user.email}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  )
}
