# ⚙️ Khedma AI — Backend API

> Node.js + Express + TypeScript + Prisma — AI generation API with SSE streaming

---

## Overview

The Khedma AI backend is a RESTful API server that:

- **Abstracts multiple LLM providers** behind a single unified interface
- **Streams AI-generated** job descriptions in real-time via SSE
- **Stores and versions** job descriptions in PostgreSQL
- **Manages AI configuration** (provider, model, language) in the database
- **Tracks usage statistics** per generation and refinement action
- **Validates all inputs** with Zod middleware schemas

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Language | TypeScript 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL (Supabase) |
| Validation | Zod 4 |
| Logging | Winston |
| Testing | Vitest |
| Build | `tsc` (output: `dist/`) |

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Data models, enums, indexes
│   └── migrations/             # Generated migration files
│
├── src/
│   ├── app.ts                  # Express app, CORS, routes, error handler
│   │
│   ├── config/
│   │   ├── db.ts               # Prisma client singleton
│   │   └── logger.ts           # Winston logger configuration
│   │
│   ├── middleware/
│   │   ├── validate.ts         # Generic Zod validation middleware factory
│   │   └── schemas.ts          # Zod schemas: generate, refine, settings, jobs
│   │
│   ├── routes/
│   │   ├── ai.routes.ts        # AI generation, refinement, settings endpoints
│   │   ├── jobs.routes.ts      # Job CRUD endpoints with version history
│   │   └── stats.routes.ts     # Dashboard statistics endpoint
│   │
│   ├── services/
│   │   ├── llm.service.ts      # LLM provider abstraction + SSE streaming
│   │   └── config.service.ts   # AI settings + sections schema service
│   │
│   └── types/
│       └── llm.ts              # LLM types, provider configs, section schemas
│
├── tests/
│   ├── parser.test.ts          # Streaming JSON parser unit tests (8 tests)
│   └── validation.test.ts      # Zod middleware schema tests (5 tests)
│
├── package.json
└── tsconfig.json
```

---

## Local Development

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- A **PostgreSQL** database (local or Supabase)
- At least one AI provider API key (or run in sandbox mode without one)

### Setup

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create environment file
cp ../.env.example .env
# Edit .env with your database URL and API keys

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate dev

# 5. Start dev server (with hot reload)
npm run dev
# → http://localhost:5000
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with `tsx watch` (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled production server |
| `npm test` | Run Vitest unit tests |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:migrate` | Apply pending database migrations |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | `development` / `production` / `test` |
| `PORT` | ✅ | Server port (default: `5000`) |
| `DATABASE_URL` | ✅ | Postgres connection string (session pooler) |
| `DIRECT_URL` | ✅ | Postgres direct connection (for migrations) |
| `frontend_URL` | ✅ | Allowed CORS origin (e.g. `https://khedma-ai.netlify.app`) |
| `OPENAI_API_KEY` | Optional | OpenAI GPT-4o / GPT-4o-mini |
| `ANTHROPIC_API_KEY` | Optional | Anthropic Claude 3.5 Sonnet / Haiku |
| `OPENROUTER_API_KEY` | Optional | OpenRouter (Llama, Mistral, DeepSeek, Gemma…) |
| `LOCAL_LLM_URL` | Optional | Local Ollama endpoint (default: `http://localhost:11434/v1`) |

> If no API key is configured, the server runs in **sandbox mode** and simulates a streaming response for development.

---

## API Reference

### Health

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Service health check |

### AI

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/ai/schema` | Dynamic job description sections schema |
| `GET` | `/api/v1/ai/providers` | All supported LLM providers and their models |
| `GET` | `/api/v1/ai/settings` | Active provider / model / language settings |
| `PUT` | `/api/v1/ai/settings` | Update active AI settings |
| `POST` | `/api/v1/ai/generate` | **SSE** — Stream full job description generation |
| `POST` | `/api/v1/ai/refine-section` | AI-refine a single section (improve/expand/shorten/inclusive) |

### Jobs

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/jobs` | List all jobs (filterable: `?isFavorite=true&isDraft=false`) |
| `POST` | `/api/v1/jobs` | Create and save a new job description |
| `GET` | `/api/v1/jobs/:id` | Get a single job with its full version history |
| `PUT` | `/api/v1/jobs/:id` | Update a job (creates a new version snapshot if sections change) |
| `DELETE` | `/api/v1/jobs/:id` | Permanently delete a job |

### Stats

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/stats` | Dashboard metrics (generations, tokens, seniority distribution) |

---

## Data Models

### `JobDescription`

```prisma
model JobDescription {
  id              String            @id @default(uuid())
  title           String
  seniority       Seniority         @default(Mid)   // Junior | Mid | Senior | Lead | Executive
  location        String
  workType        WorkType          @default(Remote) // Remote | Hybrid | Onsite
  employmentType  EmploymentType    @default(FullTime) // FullTime | PartTime | Contract | Internship
  language        String            @default("en")
  tone            String            @default("professional")
  sections        Json              // Dynamic key-value section map
  atsKeywords     String[]          @default([])
  isFavorite      Boolean           @default(false)
  isDraft         Boolean           @default(true)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  versions        DescriptionVersion[]
}
```

### `DescriptionVersion`

```prisma
model DescriptionVersion {
  id               String         @id @default(uuid())
  jobDescriptionId String
  versionNumber    Int
  sections         Json           // Full snapshot of sections at this version
  createdAt        DateTime       @default(now())

  @@unique([jobDescriptionId, versionNumber])  // Race-condition guard
}
```

---

## Supported LLM Providers

| Provider | Models |
|----------|--------|
| **OpenRouter** | `llama-3.1-8b`, `llama-3.1-70b`, `mistral-7b`, `deepseek-chat`, `gemma-7b` |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini` |
| **Anthropic** | `claude-3-5-sonnet`, `claude-3-haiku` |
| **Local (Ollama)** | Any model via local Ollama endpoint |

All providers share the same `OpenRouterLLMProvider` class interface. When no API key is configured, the server automatically falls back to **sandbox mode** (simulated streaming).

---

## SSE Streaming Protocol

`POST /api/v1/ai/generate` responds with `Content-Type: text/event-stream`:

```
data: {"status":"started","provider":"openrouter","model":"llama-3.1-8b","language":"en"}

data: {"chunk":"{\"title\":\"Senior"}
data: {"chunk":" Software Engineer\","}
data: {"chunk":"\"summary\":\"..."}
...
data: {"status":"completed"}
```

The client accumulates chunks and uses the custom JSON parser to extract sections as they complete.

---

## Testing

```bash
npm test
```

**13 tests pass** across two suites:

| Suite | File | Tests |
|-------|------|-------|
| Streaming JSON Parser | `tests/parser.test.ts` | 8 |
| Zod Validation Schemas | `tests/validation.test.ts` | 5 |

---

## Production Deployment (Render)

Configured via [`render.yaml`](../render.yaml) at the root. Build and start sequence:

```bash
# Build
npm ci && npx prisma generate && npm run build

# Start (with auto-migration)
npx prisma migrate deploy && node dist/app.js
```

Health check: `GET /health` — Render checks this endpoint after every deploy. Set all secret environment variables in the Render dashboard (never in `render.yaml`).
