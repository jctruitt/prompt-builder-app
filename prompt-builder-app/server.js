import express from 'express'
import session from 'express-session'
import connectSqlite3 from 'connect-sqlite3'
import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

import db from './lib/db.js'
import { encrypt, decrypt, loadSessionSecret } from './lib/crypto.js'
import authRoutes from './lib/auth-routes.js'
import { migrateJsonPrompts } from './lib/migrate.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const DATA_DIR = join(__dirname, 'data')
const isProd = process.env.NODE_ENV === 'production'

// Trust proxy in production (Railway, Render, etc. terminate SSL at load balancer)
if (isProd) {
  app.set('trust proxy', 1)
}

// JSON body parser
app.use(express.json({ limit: '1mb' }))

// CORS for dev (Vite runs on a different port) — must allow credentials
app.use((req, res, next) => {
  const origin = req.headers.origin || 'http://localhost:5173'
  res.header('Access-Control-Allow-Origin', origin)
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Session middleware
const SQLiteStore = connectSqlite3(session)
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR }),
  secret: loadSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}))

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  next()
}

// Mount auth routes
app.use('/api/auth', authRoutes)

// --- Profile Routes ---

app.put('/api/profile', requireAuth, (req, res) => {
  const { displayName, email } = req.body
  if (!displayName || !email) {
    return res.status(400).json({ error: 'displayName and email are required' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  // Check email uniqueness (excluding current user)
  const existing = db.prepare(
    'SELECT id FROM users WHERE email = ? AND id != ?'
  ).get(email, req.session.userId)
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' })
  }

  db.prepare(
    "UPDATE users SET display_name = ?, email = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(displayName, email, req.session.userId)

  res.json({ message: 'Profile updated' })
})

app.put('/api/profile/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.userId)
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  const newHash = bcrypt.hashSync(newPassword, 12)
  db.prepare(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newHash, req.session.userId)

  res.json({ message: 'Password updated' })
})

// --- API Key Management ---

app.get('/api/api-keys', requireAuth, (req, res) => {
  const keys = db.prepare(
    'SELECT key_name, encrypted_key, updated_at FROM user_api_keys WHERE user_id = ?'
  ).all(req.session.userId)

  // Return masked previews only
  const result = keys.map(k => {
    let preview = '****'
    try {
      const row = db.prepare(
        'SELECT encrypted_key, iv, auth_tag FROM user_api_keys WHERE user_id = ? AND key_name = ?'
      ).get(req.session.userId, k.key_name)
      const full = decrypt(row.encrypted_key, row.iv, row.auth_tag)
      if (full.length > 11) {
        preview = full.slice(0, 7) + '...' + full.slice(-4)
      }
    } catch { /* keep masked */ }

    return {
      keyName: k.key_name,
      preview,
      updatedAt: k.updated_at
    }
  })

  res.json(result)
})

app.put('/api/api-keys/:keyName', requireAuth, (req, res) => {
  const { keyName } = req.params
  const { apiKey } = req.body

  if (!apiKey) {
    return res.status(400).json({ error: 'apiKey is required' })
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(keyName)) {
    return res.status(400).json({ error: 'Invalid key name' })
  }

  const { encrypted, iv, authTag } = encrypt(apiKey)

  db.prepare(`
    INSERT INTO user_api_keys (user_id, key_name, encrypted_key, iv, auth_tag)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, key_name) DO UPDATE SET
      encrypted_key = excluded.encrypted_key,
      iv = excluded.iv,
      auth_tag = excluded.auth_tag,
      updated_at = datetime('now')
  `).run(req.session.userId, keyName, encrypted, iv, authTag)

  res.json({ message: 'API key saved' })
})

app.delete('/api/api-keys/:keyName', requireAuth, (req, res) => {
  db.prepare(
    'DELETE FROM user_api_keys WHERE user_id = ? AND key_name = ?'
  ).run(req.session.userId, req.params.keyName)
  res.json({ ok: true })
})

// --- Prompt Storage (per-user, SQLite) ---

app.get('/api/prompts', requireAuth, (req, res) => {
  const prompts = db.prepare(
    'SELECT id, description, form_data, created_at, is_public FROM prompts WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.session.userId)

  res.json(prompts.map(p => ({
    id: p.id,
    description: p.description,
    formData: JSON.parse(p.form_data),
    createdAt: p.created_at,
    isPublic: !!p.is_public
  })))
})

// Public community prompts (no auth required)
app.get('/api/prompts/public', (req, res) => {
  const prompts = db.prepare(
    `SELECT p.id, p.description, p.form_data, p.created_at, u.display_name, u.username
     FROM prompts p JOIN users u ON p.user_id = u.id
     WHERE p.is_public = 1
     ORDER BY p.created_at DESC`
  ).all()

  res.json(prompts.map(p => ({
    id: p.id,
    description: p.description,
    formData: JSON.parse(p.form_data),
    createdAt: p.created_at,
    author: { displayName: p.display_name, username: p.username }
  })))
})

app.post('/api/prompts', requireAuth, (req, res) => {
  const { description, formData, isPublic } = req.body
  if (!description || !formData) {
    return res.status(400).json({ error: 'description and formData are required' })
  }

  const result = db.prepare(
    'INSERT INTO prompts (user_id, description, form_data, is_public) VALUES (?, ?, ?, ?)'
  ).run(req.session.userId, String(description).slice(0, 40), JSON.stringify(formData), isPublic ? 1 : 0)

  res.json({
    id: result.lastInsertRowid,
    description: String(description).slice(0, 40),
    formData,
    createdAt: new Date().toISOString(),
    isPublic: !!isPublic
  })
})

app.put('/api/prompts/:id/visibility', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const { isPublic } = req.body

  const result = db.prepare(
    'UPDATE prompts SET is_public = ? WHERE id = ? AND user_id = ?'
  ).run(isPublic ? 1 : 0, id, req.session.userId)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Prompt not found or not owned by you' })
  }
  res.json({ ok: true, isPublic: !!isPublic })
})

app.delete('/api/prompts/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  db.prepare(
    'DELETE FROM prompts WHERE id = ? AND user_id = ?'
  ).run(id, req.session.userId)
  res.json({ ok: true })
})

// --- Claude API Proxy (uses server-side stored key) ---

app.post('/api/claude', requireAuth, async (req, res) => {
  const { prompt, model } = req.body
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' })
  }

  // Decrypt the user's stored Anthropic key
  const keyRow = db.prepare(
    'SELECT encrypted_key, iv, auth_tag FROM user_api_keys WHERE user_id = ? AND key_name = ?'
  ).get(req.session.userId, 'anthropic')

  if (!keyRow) {
    return res.status(400).json({ error: 'No Anthropic API key configured. Add one in Account Settings.' })
  }

  let apiKey
  try {
    apiKey = decrypt(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag)
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt API key. It may need to be re-saved.' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API request failed' })
    }
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Claude Code CLI Pipe ---

app.post('/api/cli', requireAuth, (req, res) => {
  const { prompt } = req.body
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' })
  }

  execFile('claude', ['--print', prompt], {
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 5,
    shell: true
  }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        error: error.message,
        stderr: stderr || '',
        hint: 'Make sure Claude Code CLI is installed and on your PATH'
      })
    }
    res.json({ response: stdout })
  })
})

// --- Static files (production) ---
if (existsSync(join(__dirname, 'dist'))) {
  app.use(express.static(join(__dirname, 'dist')))
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'))
  })
}

// Run migration on startup
migrateJsonPrompts(DATA_DIR)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`API endpoints:`)
  console.log(`  POST /api/auth/register  — Create account`)
  console.log(`  POST /api/auth/login     — Login`)
  console.log(`  POST /api/auth/logout    — Logout`)
  console.log(`  GET  /api/auth/me        — Current user`)
  console.log(`  PUT  /api/profile        — Update profile`)
  console.log(`  PUT  /api/profile/password — Change password`)
  console.log(`  GET  /api/api-keys       — List API keys`)
  console.log(`  PUT  /api/api-keys/:name — Save API key`)
  console.log(`  POST /api/claude         — Send prompt to Claude API`)
  console.log(`  POST /api/cli            — Send prompt to Claude Code CLI`)
  console.log(`  GET  /api/prompts        — List saved prompts`)
  console.log(`  GET  /api/prompts/public — Browse community prompts`)
  console.log(`  POST /api/prompts        — Save a prompt`)
  console.log(`  PUT  /api/prompts/:id/visibility — Toggle public/private`)
  console.log(`  DELETE /api/prompts/:id   — Delete a prompt`)
})
