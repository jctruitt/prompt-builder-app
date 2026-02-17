import { useState, useEffect } from 'react'

export default function CommunityPage({ onNavigate, onUsePrompt }) {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    fetch('/api/prompts/public')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPrompts(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? prompts.filter(p =>
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        (p.formData.task || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.author?.displayName || '').toLowerCase().includes(search.toLowerCase())
      )
    : prompts

  const handleUse = (prompt) => {
    onUsePrompt(prompt.formData)
    onNavigate('builder')
  }

  const handleCopyXml = (prompt) => {
    // Generate a quick XML preview from formData
    const fd = prompt.formData
    let xml = '<prompt>\n'
    if (fd.task?.trim()) xml += `  <task>\n    ${fd.task.trim()}\n  </task>\n`
    if (fd.context?.trim()) xml += `  <context>\n    ${fd.context.trim()}\n  </context>\n`
    if (fd.audience?.trim()) xml += `  <audience>${fd.audience.trim()}</audience>\n`
    if (fd.tone?.trim()) xml += `  <tone>${fd.tone.trim()}</tone>\n`
    xml += '</prompt>'
    navigator.clipboard.writeText(xml)
    setCopiedId(prompt.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('builder')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Builder
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Community Prompts</h1>
          <p className="text-slate-400">Browse and use prompts shared by the community</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts by description, task, or author..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <svg className="w-8 h-8 animate-spin text-slate-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-slate-500">Loading community prompts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-slate-400 mb-1">
              {search ? 'No prompts match your search' : 'No public prompts yet'}
            </p>
            <p className="text-slate-500 text-sm">
              {search ? 'Try a different search term' : 'Be the first to share a prompt! Save a prompt and toggle it to public.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{filtered.length} prompt{filtered.length !== 1 ? 's' : ''} found</p>
            {filtered.map(prompt => (
              <div key={prompt.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium truncate">{prompt.description}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-emerald-600/30 flex items-center justify-center">
                        <span className="text-emerald-400 text-xs font-semibold">
                          {(prompt.author?.displayName || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400">
                        {prompt.author?.displayName || 'Unknown'}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-sm text-slate-500">
                        {new Date(prompt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyXml(prompt)}
                      className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    >
                      {copiedId === prompt.id ? 'Copied!' : 'Copy XML'}
                    </button>
                    <button
                      onClick={() => handleUse(prompt)}
                      className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
                    >
                      Use This Prompt
                    </button>
                  </div>
                </div>

                {/* Preview of task and context */}
                <div className="space-y-2">
                  {prompt.formData.task && (
                    <div>
                      <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Task</span>
                      <p className="text-sm text-slate-300 mt-0.5 line-clamp-2">{prompt.formData.task}</p>
                    </div>
                  )}
                  {prompt.formData.context && (
                    <div>
                      <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">Context</span>
                      <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{prompt.formData.context}</p>
                    </div>
                  )}
                </div>

                {/* Tags for filled fields */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {prompt.formData.audience && (
                    <span className="px-2 py-0.5 text-xs bg-blue-600/15 text-blue-400 rounded">audience</span>
                  )}
                  {prompt.formData.tone && (
                    <span className="px-2 py-0.5 text-xs bg-blue-600/15 text-blue-400 rounded">tone</span>
                  )}
                  {(prompt.formData.length || prompt.formData.structure || prompt.formData.style) && (
                    <span className="px-2 py-0.5 text-xs bg-purple-600/15 text-purple-400 rounded">format</span>
                  )}
                  {(prompt.formData.exampleGood || prompt.formData.exampleBad) && (
                    <span className="px-2 py-0.5 text-xs bg-amber-600/15 text-amber-400 rounded">examples</span>
                  )}
                  {(prompt.formData.include || prompt.formData.exclude || prompt.formData.requirements) && (
                    <span className="px-2 py-0.5 text-xs bg-rose-600/15 text-rose-400 rounded">constraints</span>
                  )}
                  {prompt.formData.inputData && (
                    <span className="px-2 py-0.5 text-xs bg-cyan-600/15 text-cyan-400 rounded">input data</span>
                  )}
                  {prompt.formData.useThinking && (
                    <span className="px-2 py-0.5 text-xs bg-indigo-600/15 text-indigo-400 rounded">thinking</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
