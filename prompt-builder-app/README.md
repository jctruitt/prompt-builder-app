# Prompt Builder

## What Is This?

Prompt Builder is an interactive web application that helps you craft well-structured prompts for AI models like ChatGPT, Claude, and others. Instead of writing prompts from scratch and guessing at the right format, you fill in a guided form — task, context, audience, tone, examples, constraints — and the app generates clean XML-formatted output ready to paste into any AI chat interface.

## Why Was It Created?

Getting good results from AI depends heavily on how you write your prompts. Vague or unstructured prompts lead to vague or unhelpful responses. This tool was built to solve that problem by giving you a repeatable framework for prompt writing. It enforces best practices — like providing context, specifying tone, and including examples — so you get higher quality AI output every time, without needing to memorize prompt engineering techniques.

## Features

- **User Accounts & Authentication**: Register and log in with session-based auth. Each user has their own saved prompts and settings.
- **User Profile & Account Settings**: Edit your display name, email, and password from the profile and settings pages.
- **Encrypted API Key Storage**: Store your Anthropic API key and MCP/custom API keys securely. Keys are encrypted with AES-256-GCM before being saved to the database — they are never exposed to the browser after saving.
- **Community Prompt Sharing**: Share your prompts publicly and browse prompts shared by other users on the Community page. Toggle any saved prompt between public and private.
- **Per-User Prompt Storage**: Saved prompts are stored in a SQLite database and scoped to your account.
- **Smart XML Generation**: Only filled fields appear in the output.
- **Real-time Preview**: See your XML update as you type.
- **One-Click Copy**: Copy the generated prompt to clipboard.
- **Claude API Integration**: Send prompts directly to Claude API (uses your stored, encrypted API key server-side).
- **Claude Code CLI Integration**: Run prompts through the Claude Code CLI.
- **MCP Server**: Expose saved prompts and prompt building as MCP tools for programmatic use.
- **Mobile Responsive**: Works on desktop and mobile devices.
- **Dark Theme**: Easy on the eyes for long sessions.

---

## Local Installation Guide

### Prerequisites

Before you begin, make sure you have the following installed on your machine:

| Tool | Version | How to Check | Download |
|------|---------|-------------|----------|
| **Node.js** | 18 or higher | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | Comes with Node.js | `npm --version` | Included with Node.js |
| **Git** | Any recent version | `git --version` | [git-scm.com](https://git-scm.com/) |
| **Visual Studio Code** | Latest | Open the app | [code.visualstudio.com](https://code.visualstudio.com/) |

Optional (for Claude integrations):

| Tool | Purpose | Download |
|------|---------|----------|
| **Claude Code CLI** | Run prompts via "Run in Claude Code" button | [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code) |
| **Anthropic API Key** | Send prompts via "Send to Claude API" button | [console.anthropic.com](https://console.anthropic.com/) |

---

### Step 1: Clone the Repository

Open a terminal (Command Prompt, PowerShell, or Git Bash on Windows) and run:

```bash
git clone <your-repo-url>
cd "Claude Promp Builder/prompt-builder-app"
```

Or if you already have the project folder, navigate to it:

```bash
cd "w:/Visual Studio Projects/Claude Promp Builder/prompt-builder-app"
```

---

### Step 2: Open in Visual Studio Code

You can open the project in VS Code from the terminal:

```bash
code .
```

Or open VS Code manually:

1. Launch **Visual Studio Code**
2. Go to **File > Open Folder...**
3. Navigate to the `prompt-builder-app` folder and click **Select Folder**

#### Recommended VS Code Extensions

These extensions improve the development experience. Install them from the Extensions panel (`Ctrl+Shift+X`):

| Extension | Purpose |
|-----------|---------|
| **ES7+ React/Redux/React-Native snippets** | React code snippets |
| **Tailwind CSS IntelliSense** | Autocomplete for Tailwind classes |
| **ESLint** | JavaScript linting |
| **SQLite Viewer** | Browse the database files in `data/` |

---

### Step 3: Install Dependencies

Open the VS Code integrated terminal (`` Ctrl+` `` or **Terminal > New Terminal**) and run:

```bash
npm install
```

This installs all required packages including React, Express, SQLite, bcrypt, and the MCP SDK. It may take a minute or two.

> **Note (Windows):** If `better-sqlite3` fails to install, you may need the [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload installed.

---

### Step 4: Start the Application

The app requires **two servers** running at the same time:

| Server | Command | Port | Purpose |
|--------|---------|------|---------|
| **Backend** (Express API) | `npm run server` | 3001 | Authentication, database, API proxying |
| **Frontend** (Vite dev) | `npm run dev` | 5173 | Serves the React app with hot reload |

#### Option A: Using Two VS Code Terminals (Recommended)

**Terminal 1 — Start the Backend Server:**

1. In VS Code, open a terminal (`` Ctrl+` ``)
2. Run:
   ```bash
   npm run server
   ```
3. You should see:
   ```
   Server running at http://localhost:3001
   API endpoints:
     POST /api/auth/register  — Create account
     POST /api/auth/login     — Login
     ...
   ```

**Terminal 2 — Start the Frontend Dev Server:**

1. Open a **second** terminal in VS Code: click the **+** icon in the terminal panel, or press `` Ctrl+Shift+` ``
2. Run:
   ```bash
   npm run dev
   ```
3. You should see:
   ```
   VITE v5.x.x  ready in 300 ms

   ➜  Local:   http://localhost:5173/
   ```

#### Option B: Using Split Terminals in VS Code

1. Open a terminal (`` Ctrl+` ``)
2. Click the **split terminal** icon (rectangle split in half) in the top-right of the terminal panel
3. Run `npm run server` in the left terminal
4. Run `npm run dev` in the right terminal

#### Option C: Using External Terminal Windows

Open two separate Command Prompt or PowerShell windows:

**Window 1:**
```bash
cd "w:/Visual Studio Projects/Claude Promp Builder/prompt-builder-app"
npm run server
```

**Window 2:**
```bash
cd "w:/Visual Studio Projects/Claude Promp Builder/prompt-builder-app"
npm run dev
```

---

### Step 5: Open the App in Your Browser

Once **both** servers are running, open your browser and go to:

> **http://localhost:5173**

You will see the **login page**. Since this is your first time, click **"Create one"** to register a new account.

---

### Step 6: First-Time Setup

1. **Register an account** — Enter a username, display name, email, and password (8+ characters)
2. **Add your Anthropic API key** (optional) — Click your avatar in the top-right > **Account Settings** > scroll to **API Keys** > paste your `sk-ant-...` key and click **Save Key**
3. **Start building prompts** — Fill in the Task and Context fields, then copy the XML or send it directly to Claude

---

## Running the Servers — Quick Reference

| Command | What It Does | Port | When to Use |
|---------|-------------|------|-------------|
| `npm run server` | Starts the Express backend API | 3001 | Always needed |
| `npm run dev` | Starts the Vite frontend with hot reload | 5173 | During development |
| `npm run build` | Builds production frontend to `dist/` | — | Before deploying |
| `npm start` | Builds frontend + starts backend (all-in-one) | 3001 | Production / single-server mode |
| `npm run mcp` | Starts the MCP server (stdio transport) | — | When using MCP tools |

### Development Mode (two servers)

```bash
# Terminal 1 — Backend
npm run server

# Terminal 2 — Frontend
npm run dev
```

- **Frontend:** http://localhost:5173 (open this URL in your browser)
- **Backend API:** http://localhost:3001 (Vite proxies `/api/*` calls here automatically)

### Production Mode (single server)

```bash
npm start
```

This builds the React frontend into the `dist/` folder, then starts the Express server which serves both the API and the static files from a single port:

- **Everything:** http://localhost:3001

---

## Using Claude Code with This Project

If you have [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed, you can use it in two ways:

### 1. "Run in Claude Code" Button (in the app)

The app has a **"Run in Claude Code"** button that pipes your generated XML prompt directly to the Claude Code CLI. Requirements:

- Claude Code CLI installed and available on your system PATH
- Both the backend and frontend servers running
- You must be logged in

### 2. MCP Server Integration (programmatic access)

The MCP server lets Claude access your saved prompts as tools. Start it with:

```bash
npm run mcp
```

Or add it to your Claude Code / MCP client configuration:

```json
{
  "mcpServers": {
    "ai-prompt-builder": {
      "command": "node",
      "args": ["mcp-server.js"],
      "cwd": "/path/to/prompt-builder-app"
    }
  }
}
```

**MCP tools available:**

| Tool | Description |
|------|-------------|
| `list_prompts` | List all saved prompt templates with IDs, descriptions, and owners |
| `get_prompt` | Get the full XML for a saved prompt by ID or description search |
| `build_prompt` | Build a new XML prompt from parameters (task, context, tone, etc.) |

---

## Environment Variables

On first server startup, a `.env` file is **auto-generated** with random secrets. You don't need to configure anything for local development.

For production or to set your own values:

```bash
cp .env.example .env
```

Then edit the `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `SESSION_SECRET` | Secret for signing session cookies | Auto-generated |
| `ENCRYPTION_KEY` | 64-char hex string for AES-256-GCM API key encryption | Auto-generated |
| `PORT` | Backend server port | `3001` |

**Important:** The `ENCRYPTION_KEY` protects all stored API keys. If you lose it, stored API keys cannot be recovered and will need to be re-entered.

To generate your own encryption key manually:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

### "localhost refused to connect" / ERR_CONNECTION_REFUSED

**Cause:** The server you're trying to reach isn't running.

- If on **http://localhost:5173** — run `npm run dev` in a terminal.
- If on **http://localhost:3001** — run `npm run server` in a terminal.
- Both servers must be running at the same time during development.

### "Connection error. Is the server running?" (in the login/register form)

**Cause:** The frontend can't reach the backend API.

- Make sure `npm run server` is running in a separate terminal.
- Check the server terminal for any error messages.

### "No Anthropic API key configured"

**Cause:** You haven't saved an API key yet.

- Click your avatar (top-right) > **Account Settings** > **API Keys**
- Paste your Anthropic API key (`sk-ant-...`) and click **Save Key**

### `npm install` fails with native module errors

**Cause:** `better-sqlite3` requires a C++ compiler for native compilation.

| OS | Fix |
|----|-----|
| **Windows** | Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload |
| **macOS** | Run `xcode-select --install` |
| **Linux** | Run `sudo apt install build-essential python3` |

### Port already in use

**Cause:** Another process is using port 3001 or 5173.

```bash
# Use a different backend port
PORT=3002 npm run server

# Use a different frontend port
npx vite --port 5174
```

If you change the backend port, update the proxy target in `vite.config.js` to match.

---

## How to Use the App

1. **Register / Log In** — Create an account or sign in to access the builder.
2. **Fill in the Task** (required) — Describe what you want the AI to do.
3. **Add Context** (required) — Provide background information.
4. **Set Audience & Tone** (optional) — Specify who the output is for and how it should sound.
5. **Choose a Format** (optional) — Define length, structure, and style.
6. **Provide Examples** (optional) — Paste good/bad examples.
7. **Set Constraints** (optional) — Must-include, must-exclude, and rules.
8. **Add Input Data** (optional) — Paste text, code, or data for the AI.
9. **Copy or Send** — Copy the XML to clipboard, or send directly to Claude API / Claude Code CLI.
10. **Share Publicly** (optional) — When saving a prompt, check "Share publicly in Community" to make it visible to all users.

### Community Page

Click **Community** in the header to browse prompts shared by other users:

- **Search** by description, task, or author name
- **Use This Prompt** loads a shared prompt into your builder form
- **Copy XML** copies the prompt's XML output to your clipboard
- Toggle any of your saved prompts between public and private using the globe/lock icon

### Account Settings

Click your avatar in the top-right corner, then **Account Settings** to:

- Change your password
- Add/update your **Anthropic API key** (encrypted at rest)
- Add **MCP / custom API keys** for other services
- View your account information

---

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Log in (sets session cookie) |
| POST | `/api/auth/logout` | Log out (destroys session) |
| GET | `/api/auth/me` | Get current user profile |

### Profile
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/api/profile` | Update display name and email |
| PUT | `/api/profile/password` | Change password |

### API Keys (encrypted storage)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/api-keys` | List stored keys (masked previews) |
| PUT | `/api/api-keys/:keyName` | Store/update an API key |
| DELETE | `/api/api-keys/:keyName` | Delete a stored key |

### Prompts (per-user)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prompts` | List your saved prompts |
| POST | `/api/prompts` | Save a new prompt (optional `isPublic` flag) |
| DELETE | `/api/prompts/:id` | Delete a prompt |

### Community (public prompts)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prompts/public` | Browse all public prompts (no auth required) |
| PUT | `/api/prompts/:id/visibility` | Toggle a prompt's public/private visibility |

### AI Integration
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/claude` | Send prompt to Claude API (server-side key) |
| POST | `/api/cli` | Run prompt through Claude Code CLI |

---

## Project Structure

```
prompt-builder-app/
├── lib/
│   ├── db.js              # SQLite database setup & schema
│   ├── crypto.js           # AES-256-GCM encryption for API keys
│   ├── auth-routes.js      # Auth endpoints (register, login, logout)
│   └── migrate.js          # JSON-to-SQLite migration
├── src/
│   ├── components/
│   │   ├── LoginForm.jsx       # Login page
│   │   ├── RegisterForm.jsx    # Registration page
│   │   ├── UserMenu.jsx        # Header user dropdown
│   │   ├── ProfilePage.jsx     # Profile view/edit
│   │   ├── AccountSettings.jsx # Password, API keys, preferences
│   │   └── CommunityPage.jsx   # Browse public shared prompts
│   ├── App.jsx             # Main app with auth routing
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── data/
│   ├── app.db              # SQLite database (auto-created)
│   └── sessions.db         # Session store (auto-created)
├── server.js               # Express API server
├── mcp-server.js           # MCP server for tool integration
├── .env                    # Secrets (auto-generated, do not commit)
├── .env.example            # Template for environment variables
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Prompt Engineering Resources

- [Anthropic: Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [OpenAI: Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Google: Introduction to Prompt Design](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/introduction-prompt-design)
- [Brex: Prompt Engineering Guide](https://github.com/brexhq/prompt-engineering)
- [Learn Prompting](https://learnprompting.org/)

## Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **Express.js** — API server
- **SQLite** (better-sqlite3) — Database
- **bcryptjs** — Password hashing
- **express-session** + **connect-sqlite3** — Session management
- **Node.js crypto** — AES-256-GCM key encryption
- **MCP SDK** — Model Context Protocol integration

## License

MIT License — feel free to use this for any purpose.
