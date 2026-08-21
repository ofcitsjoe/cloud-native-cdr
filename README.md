# SENTINEL-X

**Cloud-Native Intrusion Detection & Response.**
A security operations platform that monitors cloud workloads, detects anomalous
behavior, correlates events into attack paths, and guides — or automates —
containment before a threat spreads.

```
Visibility → Detection → Investigation → Decision → Response
```

Two faces, one codebase:

- **Product site** — story-driven presentation of the platform (threat → visibility →
  detection → investigation → response → evidence), interactive infrastructure
  diagrams and a case study.
- **Operations console** — an 8-view SOC platform: Overview, Threats, Incidents,
  Attack Paths, Event Explorer, Infrastructure, Response Center and Detection Rules,
  plus an AI security analyst grounded in console telemetry.

Runs fully standalone on a realistic **simulated telemetry dataset** — and switches to a
**live PostgreSQL-backed REST API** the moment a backend is reachable.

---

## Stack

| Layer     | Technology                                        |
|-----------|---------------------------------------------------|
| Frontend  | React 18 · TypeScript · Vite · Tailwind CSS v4     |
| Backend   | Node.js · Express · zod · JWT · bcryptjs           |
| Database  | PostgreSQL 16 (parameterized queries only)         |
| Detection | Server-side rule engine (windowed SQL evaluation)  |

## Repository layout

```
├── index.html                  # entry — fonts, meta, product title
├── src/
│   ├── App.tsx                 # mode switch: product site ↔ console
│   ├── store.tsx               # state, workflows, response engine, live-API fallback
│   ├── api/client.ts           # REST client (login, bootstrap, actions, detect)
│   ├── data/securityData.ts    # typed simulated telemetry model (demo mode)
│   ├── components/             # icons, UI kit, SVG charts, AI analyst, confirmations
│   ├── landing/                # product site sections
│   ├── app/AppShell.tsx        # sidebar, topbar, command palette search
│   └── views/                  # Dashboard · Threats · Incidents · AttackPath ·
│                               # Events · Infrastructure · Response · Rules
└── server/
    ├── index.js                # REST API — auth, validation, rate limits, audit log
    ├── schema.sql              # PostgreSQL schema
    ├── seed.js                 # schema + dataset + demo analyst seeder
    ├── detect.js               # detection engine (rule evaluation)
    └── ingest-cloudtrail.js    # production data-path example (AWS → SQS → events)
```

---

## Quick start — demo mode (no backend needed)

```bash
npm install
npm run dev          # http://localhost:5173
```

Everything runs on the simulated dataset. No database, no secrets, no API keys.
The console top bar shows an amber **"Simulated telemetry"** badge.

## Full-stack mode — real, persisted data

```bash
# 1. PostgreSQL (any install works; Docker shown)
docker run --name sentinelx-pg \
  -e POSTGRES_PASSWORD=sentinel -e POSTGRES_DB=sentinelx \
  -p 5432:5432 -d postgres:16

# 2. Schema + data
DATABASE_URL=postgres://postgres:sentinel@localhost:5432/sentinelx node server/seed.js

# 3. API  (port 8080)
DATABASE_URL=postgres://postgres:sentinel@localhost:5432/sentinelx \
JWT_SECRET=change-me node server/index.js

# 4. Frontend wired to the API
VITE_API_URL=http://localhost:8080 npm run dev
```

The badge flips to teal **"Live · PostgreSQL"**, the console signs in automatically,
and containment actions / rule changes persist server-side. If the API is ever
unreachable, the app falls back to simulated data without breaking.

**Console login:** `analyst@sentinel-x.local` / `sentinel-demo`

## Environment variables

| Variable                | Purpose                                   | Default              |
|-------------------------|-------------------------------------------|----------------------|
| `VITE_API_URL`          | Frontend → API base URL (enables live mode) | —                  |
| `DATABASE_URL`          | PostgreSQL connection string               | —                   |
| `JWT_SECRET`            | Token signing secret                       | —                   |
| `JWT_EXPIRES_IN`        | Session lifetime                           | `12h`               |
| `PORT`                  | API port                                   | `8080`              |
| `CLIENT_ORIGIN`         | CORS allow-list                            | `http://localhost:5173` |
| `RATE_WINDOW_MS` / `RATE_MAX` | Global rate limit                  | `60000` / `120`     |

## API surface

| Endpoint                  | Notes                                                    |
|---------------------------|----------------------------------------------------------|
| `POST /api/auth/login`    | bcrypt-verified, tightened rate limit → JWT              |
| `GET  /api/bootstrap`     | alerts + incidents + rules + resources (console hydration) |
| `GET  /api/events`        | `sev`, `type`, `q`, `from`, `to`, `page` filters          |
| `GET /api/alerts` · `PATCH /api/alerts/:id` | status workflow                        |
| `GET/POST/PATCH /api/rules` · `POST /api/rules/:id/test` | rule lifecycle |
| `POST /api/actions/execute` | dangerous actions require confirmation + reason; transactional; audited |
| `GET /api/audit`          | append-only action log                                    |
| `POST /api/detect/run`    | trigger a detection pass                                  |

## Data flow (production path)

```
CloudTrail / Defender / SCC        Kubernetes audit logs
        │ (S3 → EventBridge → SQS)         │
        ▼                                  ▼
   ingest worker ────────────►  events table (normalized)
                                     │
                               detect.js (rules + thresholds)
                                     │
                                alerts table ──► console
                                     │
                       response engine ──► provider APIs (AWS/Azure/GCP SDK)
                                     │
                              audit_log (append-only)
```

`server/ingest-cloudtrail.js` contains the working normalizer; Azure/GCP/K8s map to
the same `events` shape, after which detection, rules and the console work unchanged.

## Security practices

- Parameterized SQL everywhere; no string-built queries
- Passwords bcrypt-hashed; secrets only in env vars (never committed)
- Helmet, CORS allow-list, global + per-route rate limiting, zod input validation
- Least-privilege IAM sketches for ingest; destructive actions require explicit
  analyst confirmation with reason, executed transactionally, and audited
- No client-side secrets; audit trail is append-only

## Deployment

- **Frontend:** any static host (Vercel, Netlify, `npx serve dist`) — set `VITE_API_URL`
  to your deployed API.
- **API + DB:** Railway / Render / Fly.io — point `DATABASE_URL` at managed Postgres
  and set `JWT_SECRET` + `CLIENT_ORIGIN`.

> **Note:** all bundled telemetry is synthetic and internally consistent, clearly
> labeled in the UI. No real cloud account is accessed anywhere in this codebase.
