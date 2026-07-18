# 📦 Khedma AI — Frontend

> React 19 + Vite 8 + TypeScript — AI-powered job description generator UI

---

## Overview

The Khedma AI frontend is a modern single-page application (SPA) that provides:

- **Real-time streaming** AI job description generation (SSE)
- **Multilingual UI** — English 🇺🇸 / French 🇫🇷 / Arabic 🇸🇦 (with full RTL layout)
- **Dynamic section rendering** — section schema driven by the backend
- **AI section refinement** — improve, expand, shorten, or make inclusive
- **Dashboard** — usage statistics and job management
- **Draft management** — save, favorite, and version-track descriptions
- **Settings panel** — switch LLM provider, model, and generation language

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Internationalisation | i18next + react-i18next |
| Server State | TanStack Query v5 |
| Linter | Oxlint |
| HTTP / Streaming | Fetch API + ReadableStream (SSE) |
| Flag Assets | FlagCDN (https://flagcdn.com) |

---

## Project Structure

```
frontend/
├── public/
│   ├── Khedma_logo.png         # Brand logo
│   ├── favicon.svg             # SVG favicon fallback
│   ├── icons.svg               # Icon sprite
│   └── locales/                # i18n translation files
│       ├── en/translation.json
│       ├── fr/translation.json
│       └── ar/translation.json
│
├── src/
│   ├── App.tsx                 # Root layout, routing, header, toasts, RTL
│   ├── main.tsx                # React DOM entry point
│   ├── index.css               # Global styles & design tokens
│   │
│   ├── components/
│   │   ├── dashboard/          # Stats cards and usage charts
│   │   ├── generator/          # Job form and streaming output
│   │   ├── drafts/             # Saved job listings and history
│   │   └── settings/           # AI provider / model / language settings
│   │
│   ├── hooks/
│   │   └── useJobGenerator.ts  # SSE streaming, auto-save, editor state
│   │
│   ├── services/
│   │   └── api.ts              # All API calls, TypeScript interfaces
│   │
│   ├── utils/
│   │   └── jsonParser.ts       # Quote-aware streaming JSON parser
│   │
│   └── i18n/
│       └── index.ts            # i18next initialisation
│
├── index.html                  # Entry HTML with favicons and Google Fonts
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json
```

---

## Local Development

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- Backend API running at `http://localhost:5000`

### Setup

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Create environment file
cp ../.env.example .env.local
# Edit .env.local and set:
# VITE_API_BASE_URL=http://localhost:5000/api/v1

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build production bundle |
| `npm run lint` | Run Oxlint on all source files |
| `npm run preview` | Preview the production build locally |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | ✅ | Backend API base URL (e.g. `https://khedma-ai-api.onrender.com/api/v1`) |

> **Note:** All frontend env variables must be prefixed with `VITE_` to be exposed to browser code by Vite.

---

## Internationalisation (i18n)

The UI supports three languages with automatic browser detection:

| Language | Code | Direction |
|----------|------|-----------|
| English | `en` | LTR |
| French | `fr` | LTR |
| Arabic | `ar` | RTL (full mirror layout) |

Translation files are in `public/locales/<lang>/translation.json`. RTL layout is applied dynamically via `dir="rtl"` on the root wrapper.

---

## Streaming Architecture

Job description generation uses **Server-Sent Events (SSE)** via the Fetch API:

```
User submits form
      │
      ▼
generateJobStream() → POST /api/v1/ai/generate
      │
      ▼   (SSE text/event-stream)
{ status: "started", provider, model, language }
{ chunk: "...partial JSON..." }   ← repeated
{ chunk: "...partial JSON..." }
{ status: "completed" }
      │
      ▼
jsonParser.ts parses streaming JSON chunks
      │
      ▼
Sections rendered dynamically as they arrive
```

The custom `jsonParser.ts` utility handles partial JSON and preserves string boundaries across chunk boundaries.

---

## Production Build

```bash
npm run build
# Output: dist/
# → dist/index.html
# → dist/assets/index-[hash].js
# → dist/assets/index-[hash].css
```

The `dist/` folder is deployed automatically to Netlify on every `main` branch push via the CI/CD pipeline.

---

## Netlify Deployment

Configured via [`netlify.toml`](../netlify.toml) at the root. Key settings:

- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist`
- **SPA routing:** All `/*` routes redirect to `/index.html` (HTTP 200)
- **Asset caching:** `/assets/*` cached for 1 year (`immutable`)
- **Deploy previews:** Enabled for all pull requests

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Fetch API + ReadableStream for SSE | `EventSource` doesn't support `POST` requests |
| FlagCDN instead of emoji flags | Windows browsers don't render country flag emoji glyphs |
| Custom `jsonParser.ts` | LLM output arrives as partial JSON tokens — native `JSON.parse` fails on chunks |
| `dir` attribute on root | Enables complete RTL layout mirror for Arabic without component-level changes |
| `useJobGenerator.ts` hook | Extracts all streaming + auto-save state from `App.tsx` to prevent 1000+ line god components |
