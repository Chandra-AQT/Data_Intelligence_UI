# 🔍 DocLens AI — Frontend

> React + TanStack Router UI for the DocLens AI document intelligence and extraction platform.

## Overview

This is the frontend for **DocLens AI** — a schema-driven document extraction platform that turns documents (PDF, DOCX, images, spreadsheets) into clean, structured data using 9+ AI engines.

The UI connects to the [FastAPI backend](../Data_Intelligence-main) and provides a full-featured workspace for uploading documents, building extraction schemas, running AI extractions, comparing results, and exporting to Excel/CSV.

## Tech Stack

- **React 19** + **TypeScript**
- **TanStack Router** — type-safe file-based routing
- **TanStack Query** — server state management
- **Tailwind CSS v4** — utility-first styling
- **shadcn/ui** + **Radix UI** — accessible component primitives
- **Vite** — build tool
- **Axios** — HTTP client

## Getting Started

```bash
cd Data_Intelligence_UI-main
npm install
cp .env.example .env.local
# Set VITE_API_BASE=http://localhost:8000/api/v1
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE` | Backend API URL (e.g. `https://data-intelligence-production.up.railway.app/api/v1`) |

## Build & Deploy

```bash
# Vercel (recommended)
npm run build:vercel   # outputs to dist/spa

# Standard build
npm run build          # outputs to dist
```

## Project Structure

```
src/
├── components/
│   ├── aqt/              # App-specific components
│   │   ├── app-shell.tsx         # Layout, sidebar, nav
│   │   ├── chatbot.tsx           # Document chat widget
│   │   ├── provider-config.tsx   # LLM provider selector
│   │   └── ...
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── aqt.ts            # API client, auth helpers, provider config
│   └── utils.ts
└── routes/               # File-based pages
    ├── index.tsx         # Landing page
    ├── dashboard.tsx
    ├── documents.tsx
    ├── extract.tsx
    ├── schemas.tsx
    ├── results.tsx
    ├── batch.tsx
    ├── compare.tsx
    ├── intelligence.tsx
    ├── jobs.tsx
    ├── webextract.tsx
    ├── settings.tsx
    ├── login.tsx
    └── register.tsx
```

## License

MIT © DocLens AI
