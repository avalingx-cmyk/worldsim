# WorldSim-1 — A Living Digital World

A 48-hour persistent AI civilization simulation powered by your SuperGrok subscription. No API key needed.

## How It Works

- You run Grok in one browser tab (grok.com with SuperGrok)
- This dashboard displays the world live in another tab
- A bookmarklet bridges them — one click sends Grok's output to the dashboard

## Setup (5 minutes)

### 1. Deploy to Vercel
```bash
git clone <your-repo>
cd worldsim-1
npm install
```

Push to GitHub, then in Vercel:
- Import your GitHub repo
- Add Vercel KV storage (Storage tab → Create KV database → connect to project)
- The KV env vars are added automatically
- Deploy

### 2. Start the World
1. Open your deployed Vercel URL
2. Open grok.com in another tab (SuperGrok subscription required)
3. Copy the World Prompt from the dashboard
4. Paste into a new Grok chat — Grok creates the first 4 people
5. Copy Grok's JSON response
6. Paste into the dashboard OR install the bookmarklet

### 3. Keep It Running
- After each Grok tick, click the bookmarklet (or paste JSON manually)
- The dashboard auto-refreshes every 15 seconds
- Share your Vercel URL — anyone can watch the world live

## Environment Variables

These are set automatically when you add Vercel KV:
```
KV_URL
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
```

Optional:
```
INGEST_TOKEN=worldsim2024  (default is worldsim2024, change for security)
```

## API Endpoints

- `POST /api/ingest` — receive a tick from Grok (requires x-worldsim-token header)
- `GET /api/state` — get current world state + logs
- `POST /api/reset` — reset the world (requires token)
