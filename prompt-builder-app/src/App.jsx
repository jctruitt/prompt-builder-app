import React, { useState, useEffect } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import UserMenu from './components/UserMenu'
import ProfilePage from './components/ProfilePage'
import AccountSettings from './components/AccountSettings'
import CommunityPage from './components/CommunityPage'

function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [view, setView] = useState('builder') // 'builder' | 'login' | 'register' | 'profile' | 'settings' | 'community'

  const emptyForm = {
    task: '', context: '', audience: '', tone: '',
    length: '', structure: '', style: '',
    exampleGood: '', exampleBad: '',
    include: '', exclude: '', requirements: '',
    inputData: '',
    useThinking: false,
    usePromptingGuide: false,
    useCompletionCheck: false,
    useContradictionCheck: false
  }

  const [formData, setFormData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ai-prompt-builder-draft')) || emptyForm
    } catch { return emptyForm }
  })
  const [draftSaved, setDraftSaved] = useState(false)

  const [copied, setCopied] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [savedPrompts, setSavedPrompts] = useState([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveDescription, setSaveDescription] = useState('')
  const [savePublic, setSavePublic] = useState(false)
  const [showSavedList, setShowSavedList] = useState(false)

  // Claude integration state
  const [claudeResponse, setClaudeResponse] = useState('')
  const [claudeLoading, setClaudeLoading] = useState(false)
  const [claudeError, setClaudeError] = useState('')
  const [claudeSource, setClaudeSource] = useState('')

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
        if (r.ok) return r.json()
        throw new Error('Not authenticated')
      })
      .then(user => {
        setCurrentUser(user)
        setView('builder')
      })
      .catch(() => {
        setView('login')
      })
      .finally(() => setAuthChecked(true))
  }, [])

  // Load saved prompts when authenticated
  useEffect(() => {
    if (!currentUser) return
    fetch('/api/prompts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSavedPrompts(data)
      })
      .catch(() => {})
  }, [currentUser])

  const handleLogin = (user) => {
    setCurrentUser(user)
    setView('builder')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setSavedPrompts([])
    setView('login')
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const generateXML = () => {
    let xml = '<prompt>\n'

    if (formData.usePromptingGuide) {
      xml += '  <instructions>\n'
      xml += '    Be specific and detailed in your response. Follow the task precisely.\n'
      xml += '    Use the provided context to inform your answer.\n'
      xml += '    Match the requested tone, audience, and format.\n'
      xml += '    If examples are provided, use them as a reference for style and quality.\n'
      xml += '    Respect all constraints — include what is required and exclude what is forbidden.\n'
      xml += '  </instructions>\n'
    }

    if (formData.useThinking) {
      xml += '  <thinking>\n'
      xml += '    Before responding, think step by step:\n'
      xml += '    1. What exactly is being asked in the task?\n'
      xml += '    2. What context and constraints apply?\n'
      xml += '    3. What is the best approach to fulfill this request?\n'
      xml += '    4. Draft your response, then review it before finalizing.\n'
      xml += '  </thinking>\n'
    }

    if (formData.task.trim()) {
      xml += `  <task>\n    ${formData.task.trim()}\n  </task>\n`
    }

    if (formData.context.trim()) {
      xml += `  <context>\n    ${formData.context.trim()}\n  </context>\n`
    }

    if (formData.audience.trim()) {
      xml += `  <audience>${formData.audience.trim()}</audience>\n`
    }

    if (formData.tone.trim()) {
      xml += `  <tone>${formData.tone.trim()}</tone>\n`
    }

    const hasFormat = formData.length.trim() || formData.structure.trim() || formData.style.trim()
    if (hasFormat) {
      xml += '  <format>\n'
      if (formData.length.trim()) xml += `    <length>${formData.length.trim()}</length>\n`
      if (formData.structure.trim()) xml += `    <structure>${formData.structure.trim()}</structure>\n`
      if (formData.style.trim()) xml += `    <style>${formData.style.trim()}</style>\n`
      xml += '  </format>\n'
    }

    const hasExamples = formData.exampleGood.trim() || formData.exampleBad.trim()
    if (hasExamples) {
      xml += '  <examples>\n'
      if (formData.exampleGood.trim()) {
        xml += `    <example type="good">\n      ${formData.exampleGood.trim()}\n    </example>\n`
      }
      if (formData.exampleBad.trim()) {
        xml += `    <example type="bad">\n      ${formData.exampleBad.trim()}\n    </example>\n`
      }
      xml += '  </examples>\n'
    }

    const hasConstraints = formData.include.trim() || formData.exclude.trim() || formData.requirements.trim()
    if (hasConstraints) {
      xml += '  <constraints>\n'
      if (formData.include.trim()) xml += `    <include>${formData.include.trim()}</include>\n`
      if (formData.exclude.trim()) xml += `    <exclude>${formData.exclude.trim()}</exclude>\n`
      if (formData.requirements.trim()) xml += `    <requirements>${formData.requirements.trim()}</requirements>\n`
      xml += '  </constraints>\n'
    }

    if (formData.inputData.trim()) {
      xml += `  <input_data>\n    ${formData.inputData.trim()}\n  </input_data>\n`
    }

    if (formData.useCompletionCheck || formData.useContradictionCheck) {
      xml += '  <verification>\n'
      if (formData.useCompletionCheck) {
        xml += '    <completeness_check>\n'
        xml += '      Before outputting your final response, review it to ensure every point\n'
        xml += '      and requirement from the task has been fully addressed. If anything is\n'
        xml += '      missing, add it before responding.\n'
        xml += '    </completeness_check>\n'
      }
      if (formData.useContradictionCheck) {
        xml += '    <contradiction_check>\n'
        xml += '      Before outputting your final response, verify that nothing in your\n'
        xml += '      response contradicts the original task description. Ensure your output\n'
        xml += '      is fully aligned with what was requested.\n'
        xml += '    </contradiction_check>\n'
      }
      xml += '  </verification>\n'
    }

    xml += '</prompt>'
    return xml
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateXML())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveDraft = () => {
    localStorage.setItem('ai-prompt-builder-draft', JSON.stringify(formData))
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
  }

  const clearForm = () => {
    setFormData(emptyForm)
    localStorage.removeItem('ai-prompt-builder-draft')
  }

  const savePrompt = async () => {
    if (!saveDescription.trim()) return
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: saveDescription.trim().slice(0, 40), formData: { ...formData }, isPublic: savePublic })
      })
      const newPrompt = await res.json()
      if (res.ok) {
        setSavedPrompts(prev => [newPrompt, ...prev])
      }
    } catch {}
    setSaveDescription('')
    setSavePublic(false)
    setShowSaveDialog(false)
  }

  const togglePromptVisibility = async (id, currentlyPublic) => {
    const newValue = !currentlyPublic
    try {
      const res = await fetch(`/api/prompts/${id}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: newValue })
      })
      if (res.ok) {
        setSavedPrompts(prev => prev.map(p => p.id === id ? { ...p, isPublic: newValue } : p))
      }
    } catch {}
  }

  const loadPrompt = (prompt) => {
    setFormData(prompt.formData)
    setShowSavedList(false)
  }

  const deletePrompt = async (id) => {
    setSavedPrompts(prev => prev.filter(p => p.id !== id))
    try { await fetch(`/api/prompts/${id}`, { method: 'DELETE' }) } catch {}
  }

  // Send prompt to Claude API (server decrypts key)
  const sendToClaude = async () => {
    if (!hasContent) return
    setClaudeLoading(true)
    setClaudeError('')
    setClaudeResponse('')
    setClaudeSource('api')
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generateXML() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API request failed')
      const text = data.content?.map(c => c.text).join('\n') || 'No response'
      setClaudeResponse(text)
    } catch (err) {
      setClaudeError(err.message)
    } finally {
      setClaudeLoading(false)
    }
  }

  // Send prompt to Claude Code CLI
  const sendToCli = async () => {
    if (!hasContent) return
    setClaudeLoading(true)
    setClaudeError('')
    setClaudeResponse('')
    setClaudeSource('cli')
    try {
      const res = await fetch('/api/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generateXML() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.hint || 'CLI request failed')
      setClaudeResponse(data.response)
    } catch (err) {
      setClaudeError(err.message)
    } finally {
      setClaudeLoading(false)
    }
  }

  const hasContent = formData.task.trim() || formData.context.trim()

  // Loading screen
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <span className="text-emerald-400 font-mono text-2xl font-bold">&lt;/&gt;</span>
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Auth screens
  if (!currentUser) {
    if (view === 'register') {
      return <RegisterForm onRegister={handleLogin} onSwitchToLogin={() => setView('login')} />
    }
    return <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setView('register')} />
  }

  // Profile page
  if (view === 'profile') {
    return (
      <ProfilePage
        user={currentUser}
        onUpdate={setCurrentUser}
        onNavigate={setView}
      />
    )
  }

  // Account settings
  if (view === 'settings') {
    return (
      <AccountSettings
        user={currentUser}
        onUpdate={setCurrentUser}
        onNavigate={setView}
      />
    )
  }

  // Community page
  if (view === 'community') {
    return (
      <CommunityPage
        onNavigate={setView}
        onUsePrompt={(formData) => {
          setFormData(formData)
          setView('builder')
        }}
      />
    )
  }

  // Main builder UI
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-emerald-400 font-mono text-lg font-bold">&lt;/&gt;</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Claude Prompt Builder</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('community')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Community
              </button>
              <UserMenu user={currentUser} onNavigate={setView} onLogout={handleLogout} />
            </div>
          </div>
          <p className="text-slate-400 text-center mb-4">Build well-structured XML prompts for AI models like ChatGPT, Claude, and others. Fill in the fields you need — empty fields are automatically excluded.</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowAbout(!showAbout)}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
            >
              {showAbout ? 'Hide' : 'Learn more about this tool'}
              <svg className={`w-4 h-4 transition-transform ${showAbout ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* About Section */}
        {showAbout && (
          <div className="mb-8 space-y-4">
            {/* Why & How */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-3">Why Use This?</h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Getting good results from AI depends heavily on how you write your prompts. Vague or unstructured prompts lead to vague responses. This tool gives you a repeatable framework that enforces best practices — like providing context, specifying tone, and including examples — so you get higher quality AI output every time.
                </p>
              </div>
              <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">How to Use</h2>
                <ol className="text-sm text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li><span className="text-emerald-400 font-medium">Task</span> — Describe what you want the AI to do</li>
                  <li><span className="text-emerald-400 font-medium">Context</span> — Provide background info and situation</li>
                  <li>Set audience, tone, format, examples, and constraints as needed</li>
                  <li>Click <span className="text-emerald-400 font-medium">Copy</span> and paste the XML into your AI tool</li>
                </ol>
              </div>
            </div>

            {/* Resources */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">Prompt Engineering Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <a href="https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-3 bg-slate-900 rounded-md border border-slate-700 hover:border-purple-500/50 transition-colors group">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  <div>
                    <div className="text-sm text-slate-200 group-hover:text-purple-300 transition-colors">Anthropic Guide</div>
                    <div className="text-xs text-slate-500">Official Claude prompt engineering guide</div>
                  </div>
                </a>
                <a href="https://platform.openai.com/docs/guides/prompt-engineering" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-3 bg-slate-900 rounded-md border border-slate-700 hover:border-purple-500/50 transition-colors group">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  <div>
                    <div className="text-sm text-slate-200 group-hover:text-purple-300 transition-colors">OpenAI Guide</div>
                    <div className="text-xs text-slate-500">Strategies for better GPT results</div>
                  </div>
                </a>
                <a href="https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/introduction-prompt-design" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-3 bg-slate-900 rounded-md border border-slate-700 hover:border-purple-500/50 transition-colors group">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  <div>
                    <div className="text-sm text-slate-200 group-hover:text-purple-300 transition-colors">Google Guide</div>
                    <div className="text-xs text-slate-500">Prompt design for Gemini models</div>
                  </div>
                </a>
                <a href="https://github.com/brexhq/prompt-engineering" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-3 bg-slate-900 rounded-md border border-slate-700 hover:border-purple-500/50 transition-colors group">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  <div>
                    <div className="text-sm text-slate-200 group-hover:text-purple-300 transition-colors">Brex Guide</div>
                    <div className="text-xs text-slate-500">Community prompt engineering tips</div>
                  </div>
                </a>
                <a href="https://learnprompting.org/" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-3 bg-slate-900 rounded-md border border-slate-700 hover:border-purple-500/50 transition-colors group">
                  <svg className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  <div>
                    <div className="text-sm text-slate-200 group-hover:text-purple-300 transition-colors">Learn Prompting</div>
                    <div className="text-xs text-slate-500">Free open-source prompt course</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-6">
            {/* Required Section */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-4">Required</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Task <span className="text-emerald-400">*</span>
                  </label>
                  <textarea
                    value={formData.task}
                    onChange={(e) => handleChange('task', e.target.value)}
                    placeholder="What do you want the AI to do? (e.g., Write a product description for...)"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Context <span className="text-emerald-400">*</span>
                  </label>
                  <textarea
                    value={formData.context}
                    onChange={(e) => handleChange('context', e.target.value)}
                    placeholder="Background info: Who are you? What's the situation? Why do you need this?"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Audience & Tone */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-4">Audience & Tone</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Audience</label>
                  <input
                    type="text"
                    value={formData.audience}
                    onChange={(e) => handleChange('audience', e.target.value)}
                    placeholder="e.g., technical developers, executives"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
                  <input
                    type="text"
                    value={formData.tone}
                    onChange={(e) => handleChange('tone', e.target.value)}
                    placeholder="e.g., professional, casual, friendly"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Format */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-4">Format</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Length</label>
                    <input
                      type="text"
                      value={formData.length}
                      onChange={(e) => handleChange('length', e.target.value)}
                      placeholder="e.g., 200 words, 2 paragraphs"
                      className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Style</label>
                    <input
                      type="text"
                      value={formData.style}
                      onChange={(e) => handleChange('style', e.target.value)}
                      placeholder="e.g., markdown, plain text, HTML"
                      className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Structure</label>
                  <input
                    type="text"
                    value={formData.structure}
                    onChange={(e) => handleChange('structure', e.target.value)}
                    placeholder="e.g., bullet points, numbered steps, prose paragraphs"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-4">Examples</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Good Example</label>
                  <textarea
                    value={formData.exampleGood}
                    onChange={(e) => handleChange('exampleGood', e.target.value)}
                    placeholder="Paste an example of the style/format you want"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Bad Example</label>
                  <textarea
                    value={formData.exampleBad}
                    onChange={(e) => handleChange('exampleBad', e.target.value)}
                    placeholder="Paste an example of what to avoid (optional)"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Constraints */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-rose-400 uppercase tracking-wide mb-4">Constraints</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Must Include</label>
                  <input
                    type="text"
                    value={formData.include}
                    onChange={(e) => handleChange('include', e.target.value)}
                    placeholder="Things that MUST be in the response"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Must Exclude</label>
                  <input
                    type="text"
                    value={formData.exclude}
                    onChange={(e) => handleChange('exclude', e.target.value)}
                    placeholder="Things to avoid or leave out"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Requirements</label>
                  <input
                    type="text"
                    value={formData.requirements}
                    onChange={(e) => handleChange('requirements', e.target.value)}
                    placeholder="Any specific rules or standards to follow"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Input Data */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-4">Input Data</h2>
              <textarea
                value={formData.inputData}
                onChange={(e) => handleChange('inputData', e.target.value)}
                placeholder="Paste any text, code, or data the AI should work with"
                className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none"
                rows={4}
              />
            </div>

            {/* AI Instructions */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-4">AI Instructions</h2>
              <p className="text-xs text-slate-500 mb-4">Toggle these options to add special instruction blocks to your prompt output.</p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.usePromptingGuide}
                    onChange={(e) => handleChange('usePromptingGuide', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm text-slate-200 group-hover:text-indigo-300 transition-colors">Prompting instructions</span>
                    <p className="text-xs text-slate-500 mt-0.5">Adds general instructions telling the AI to be specific, follow the task, match tone, and respect constraints.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.useThinking}
                    onChange={(e) => handleChange('useThinking', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm text-slate-200 group-hover:text-indigo-300 transition-colors">Thinking tag</span>
                    <p className="text-xs text-slate-500 mt-0.5">Adds a &lt;thinking&gt; block that asks the AI to reason step by step before responding.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.useCompletionCheck}
                    onChange={(e) => handleChange('useCompletionCheck', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm text-slate-200 group-hover:text-indigo-300 transition-colors">Completeness check</span>
                    <p className="text-xs text-slate-500 mt-0.5">Before outputting, the AI verifies that every point and requirement has been addressed.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.useContradictionCheck}
                    onChange={(e) => handleChange('useContradictionCheck', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm text-slate-200 group-hover:text-indigo-300 transition-colors">Contradiction check</span>
                    <p className="text-xs text-slate-500 mt-0.5">Before outputting, the AI verifies nothing in its response contradicts the original task.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">XML Output</h2>
                <div className="flex gap-2">
                  <button
                    onClick={clearForm}
                    className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={saveDraft}
                    disabled={!hasContent}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                      hasContent
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {draftSaved ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Draft Saved!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Save Draft
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowSaveDialog(true); setSaveDescription('') }}
                    disabled={!hasContent}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                      hasContent
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </button>
                  <button
                    onClick={copyToClipboard}
                    disabled={!hasContent}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                      hasContent
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Claude Integration Buttons */}
              <div className="flex gap-2 p-3 border-b border-slate-700 bg-slate-800/50">
                <button
                  onClick={sendToClaude}
                  disabled={!hasContent || claudeLoading}
                  className={`flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
                    hasContent && !claudeLoading
                      ? 'bg-violet-600 hover:bg-violet-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {claudeLoading && claudeSource === 'api' ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Sending...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Send to Claude API</>
                  )}
                </button>
                <button
                  onClick={sendToCli}
                  disabled={!hasContent || claudeLoading}
                  className={`flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
                    hasContent && !claudeLoading
                      ? 'bg-teal-600 hover:bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {claudeLoading && claudeSource === 'cli' ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Running...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Run in Claude Code</>
                  )}
                </button>
              </div>

              {/* Save Dialog */}
              {showSaveDialog && (
                <div className="p-4 border-b border-slate-700 bg-slate-800">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description <span className="text-slate-500">({saveDescription.length}/40)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value.slice(0, 40))}
                      placeholder="e.g., Product description for keyboards"
                      maxLength={40}
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') savePrompt(); if (e.key === 'Escape') setShowSaveDialog(false) }}
                    />
                    <button
                      onClick={savePrompt}
                      disabled={!saveDescription.trim()}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        saveDescription.trim()
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={savePublic}
                      onChange={(e) => setSavePublic(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-slate-400 group-hover:text-slate-300">Share publicly in Community</span>
                  </label>
                </div>
              )}

              <pre className="p-4 text-sm text-emerald-300 bg-slate-900 overflow-x-auto min-h-[400px] max-h-[calc(100vh-200px)] overflow-y-auto">
                {hasContent ? generateXML() : '<prompt>\n  <!-- Fill in the form to generate XML -->\n</prompt>'}
              </pre>
            </div>

            {/* Claude Response */}
            {(claudeResponse || claudeError || claudeLoading) && (
              <div className="mt-4 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-slate-700">
                  <h2 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                    {claudeSource === 'api' ? (
                      <span className="text-violet-400">Claude API Response</span>
                    ) : (
                      <span className="text-teal-400">Claude Code Response</span>
                    )}
                  </h2>
                  <button
                    onClick={() => { setClaudeResponse(''); setClaudeError('') }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="p-4 bg-slate-900 max-h-96 overflow-y-auto">
                  {claudeLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Waiting for response...
                    </div>
                  )}
                  {claudeError && (
                    <div className="text-rose-400 text-sm">
                      <p className="font-medium mb-1">Error</p>
                      <p>{claudeError}</p>
                    </div>
                  )}
                  {claudeResponse && (
                    <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">{claudeResponse}</pre>
                  )}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Tips</h3>
              <ul className="text-sm text-slate-500 space-y-1">
                <li>• Task + Context are the minimum for a good prompt</li>
                <li>• Add examples for consistent style/formatting</li>
                <li>• Use constraints to prevent common mistakes</li>
              </ul>
            </div>

            {/* Saved Prompts */}
            <div className="mt-4 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => setShowSavedList(!showSavedList)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                    Saved Prompts
                  </span>
                  <span className="text-xs text-slate-500">({savedPrompts.length})</span>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${showSavedList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSavedList && (
                <div className="border-t border-slate-700">
                  {savedPrompts.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500 text-center">No saved prompts yet. Fill in the form and click Save.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-700">
                      {savedPrompts.map(prompt => (
                        <div key={prompt.id} className="p-3 hover:bg-slate-800/80 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm text-slate-200 truncate">{prompt.description}</p>
                                {prompt.isPublic && (
                                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] bg-emerald-600/20 text-emerald-400 rounded font-medium">PUBLIC</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {new Date(prompt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => togglePromptVisibility(prompt.id, prompt.isPublic)}
                                title={prompt.isPublic ? 'Make private' : 'Share publicly'}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  prompt.isPublic
                                    ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                {prompt.isPublic ? (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={() => loadPrompt(prompt)}
                                className="px-2.5 py-1 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded transition-colors"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => deletePrompt(prompt.id)}
                                className="px-2.5 py-1 text-xs bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-slate-500 text-sm">
          <p>Claude Prompt Builder • Generate better prompts, get better results</p>
        </footer>
      </div>
    </div>
  )
}

export default App
