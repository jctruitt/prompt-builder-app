# Deploying AI Prompt Builder to Railway

This document covers the full deployment process for the AI Prompt Builder app on [Railway](https://railway.com). It notes which steps were done automatically by the AI and which steps require manual user action.

---

## Overview

| Component | Details |
|-----------|---------|
| **Platform** | Railway (PaaS) |
| **Runtime** | Node.js 18+ |
| **Database** | SQLite (file-based, stored on Railway volume) |
| **Build** | Vite builds React frontend into `dist/` |
| **Server** | Express serves both API and static files on a single port |
| **URL** | Railway assigns a `*.up.railway.app` domain (custom domain optional) |

---

## What the AI Did (Automated Steps)

These changes were made to the codebase to prepare for production deployment:

### 1. Added Node.js engine requirement to `package.json`

```json
"engines": {
  "node": ">=18.0.0"
}
```

This tells Railway (and other hosts) which Node.js version to use.

### 2. Updated `server.js` for production

- **Trust proxy**: Added `app.set('trust proxy', 1)` when `NODE_ENV=production`. Railway terminates SSL at its load balancer, so Express needs to trust the `X-Forwarded-Proto` header to know the original request was HTTPS.
- **Secure cookies**: Changed `cookie.secure` from hardcoded `false` to `isProd` (reads `NODE_ENV`). This ensures session cookies are only sent over HTTPS in production, preventing session hijacking.
- Added `NODE_ENV` detection: `const isProd = process.env.NODE_ENV === 'production'`

### 3. Created `railway.json`

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/api/prompts/public",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- **Build**: Installs dependencies and builds the Vite frontend
- **Start**: Runs `node server.js` (serves both API and static frontend)
- **Healthcheck**: Uses the public prompts endpoint (no auth required) to verify the app is alive
- **Restart policy**: Automatically restarts on crash (up to 10 retries)

### 4. Existing production-ready code (already in place)

- `npm start` script: runs `npm run build && node server.js`
- `server.js` reads `PORT` from `process.env.PORT` (Railway sets this automatically)
- `server.js` serves static files from `dist/` when the folder exists
- `crypto.js` reads `ENCRYPTION_KEY` and `SESSION_SECRET` from environment variables first, before falling back to `.env` file
- Database auto-creates `data/` directory and `app.db` on first run

---

## What You Need to Do (Manual Steps)

### Step 1: Push Your Code to GitHub

Railway deploys from a GitHub repository. If you haven't already:

```bash
cd "w:/Visual Studio Projects/Claude Promp Builder"

# If this is a new repo:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main

# If the remote already exists:
git add -A
git commit -m "Prepare for Railway deployment"
git push
```

> **Important:** Make sure `.env`, `data/*.db`, and `node_modules/` are in `.gitignore` (they already are).

---

### Step 2: Create a Railway Account

1. Go to [railway.com](https://railway.com)
2. Sign up with your GitHub account (this makes repo linking easier)
3. You get a free trial with $5 of credits — no credit card required to start

---

### Step 3: Create a New Project on Railway

1. From the Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub Repo"**
3. Find and select your repository
4. Railway will auto-detect the Node.js app and start building

> **Note:** If Railway deploys from the root of the repo, you need to set the **Root Directory** to `prompt-builder-app` in the service settings (Settings > Root Directory).

---

### Step 4: Set the Root Directory

Since the app lives in the `prompt-builder-app/` subfolder:

1. Click on your service in the Railway dashboard
2. Go to **Settings**
3. Under **Root Directory**, enter: `prompt-builder-app`
4. Save — Railway will re-deploy from this directory

---

### Step 5: Add a Persistent Volume (Required for SQLite)

Railway's filesystem is **ephemeral** — files are lost on every deploy. SQLite needs persistent storage.

1. In your service, go to **Settings** or click **"+ New"** on the service
2. Click **"Add Volume"**
3. Set the **Mount Path** to: `/app/data`
4. Give it a name like `sqlite-data`
5. Save — Railway will mount persistent storage at the `data/` directory

> This ensures `app.db` and `sessions.db` survive redeploys.

---

### Step 6: Set Environment Variables

In Railway, go to your service > **Variables** tab and add:

| Variable | Value | How to Generate |
|----------|-------|-----------------|
| `NODE_ENV` | `production` | Type it exactly |
| `ENCRYPTION_KEY` | 64-character hex string | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SESSION_SECRET` | Random string (32+ chars) | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | (leave blank) | Railway sets this automatically |

**To generate the keys locally**, open a terminal and run:

```bash
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy-paste the output values into Railway's Variables tab.

> **Critical:** The `ENCRYPTION_KEY` protects all stored API keys. Save it somewhere secure. If lost, users will need to re-enter their API keys.

---

### Step 7: Deploy

After setting variables and volume, Railway will automatically redeploy. If not:

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment

Wait for the build to complete (usually 1-2 minutes). Check the deploy logs for:

```
Server running at http://localhost:XXXX
```

---

### Step 8: Get Your Public URL

1. In your service, go to **Settings** > **Networking**
2. Click **"Generate Domain"** to get a `*.up.railway.app` URL
3. Your app is now live at that URL

Optional: Add a custom domain by clicking **"Add Custom Domain"** and following the DNS instructions.

---

### Step 9: Test the Deployment

1. Open your Railway URL in a browser
2. You should see the login page
3. Register a new account (this is a fresh database)
4. Test saving a prompt
5. Test the Community page
6. (Optional) Add your Anthropic API key in Account Settings and test "Send to Claude API"

---

## Deployment Checklist

| # | Step | Who | Status |
|---|------|-----|--------|
| 1 | Add `engines` field to package.json | AI | Done |
| 2 | Update server.js for production (trust proxy, secure cookies) | AI | Done |
| 3 | Create `railway.json` config | AI | Done |
| 4 | Push code to GitHub | **You** | |
| 5 | Create Railway account | **You** | |
| 6 | Create project from GitHub repo | **You** | |
| 7 | Set Root Directory to `prompt-builder-app` | **You** | |
| 8 | Add persistent volume mounted at `/app/data` | **You** | |
| 9 | Set environment variables (NODE_ENV, ENCRYPTION_KEY, SESSION_SECRET) | **You** | |
| 10 | Deploy and verify | **You** | |
| 11 | Generate public domain URL | **You** | |
| 12 | Register first account and test | **You** | |

---

## Troubleshooting

### Build fails with "better-sqlite3" errors

Railway uses Nixpacks which includes C++ build tools. If the build still fails, add a custom Nixpack:

Create a file `nixpacks.toml` in `prompt-builder-app/`:

```toml
[phases.setup]
nixPkgs = ["nodejs_18", "python3", "gcc", "gnumake"]
```

### "502 Bad Gateway" after deploy

- Check the deploy logs — the server may have crashed on startup
- Ensure all environment variables are set correctly
- Verify the volume is mounted at `/app/data`

### Sessions don't persist / "Not authenticated" errors

- Make sure `NODE_ENV=production` is set (enables secure cookies over HTTPS)
- Make sure `trust proxy` is working (the AI already added this)
- Check that `SESSION_SECRET` environment variable is set

### Database is empty after redeploy

- The volume wasn't attached, or the mount path is wrong
- Verify mount path is `/app/data` (matches where the app creates `data/app.db`)

### Claude API returns errors

- Users need to save their own Anthropic API key in Account Settings
- The server decrypts keys with `ENCRYPTION_KEY` — if you changed this, old keys are unrecoverable

---

## Updating the App

To deploy updates:

1. Make your changes locally
2. Commit and push to GitHub:
   ```bash
   git add -A
   git commit -m "Your update message"
   git push
   ```
3. Railway auto-deploys on push (if connected to the repo)

The volume persists across deploys, so the database and sessions survive.

---

## Cost

Railway pricing (as of 2025):

| Plan | Cost | Includes |
|------|------|----------|
| **Trial** | Free | $5 credit, no credit card needed |
| **Hobby** | $5/month | 8 GB RAM, 8 vCPU, 100 GB bandwidth |
| **Pro** | $20/month | More resources, team features |

A single instance of this app uses minimal resources (~50-100 MB RAM), so the Hobby plan is more than sufficient for personal or small-team use.
