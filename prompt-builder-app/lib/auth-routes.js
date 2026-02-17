import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from './db.js';

const router = Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { username, email, displayName, password } = req.body;

    // Validate inputs
    if (!username || !email || !displayName || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, hyphens, and underscores' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check uniqueness
    const existing = db.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).get(username, email);

    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    // Hash password and insert
    const passwordHash = bcrypt.hashSync(password, 12);
    const result = db.prepare(
      'INSERT INTO users (username, email, display_name, password_hash) VALUES (?, ?, ?, ?)'
    ).run(username, email, displayName, passwordHash);

    // Set session
    req.session.userId = result.lastInsertRowid;

    res.status(201).json({
      id: result.lastInsertRowid,
      username,
      email,
      displayName
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by username or email
    const user = db.prepare(
      'SELECT id, username, email, display_name, password_hash FROM users WHERE username = ? OR email = ?'
    ).get(login, login);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.userId = user.id;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = db.prepare(
    'SELECT id, username, email, display_name FROM users WHERE id = ?'
  ).get(req.session.userId);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name
  });
});

export default router;
