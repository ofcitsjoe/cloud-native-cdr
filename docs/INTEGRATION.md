# Integrating the Sentinel-X Console with the Detection Engine

This console is built to run against the team's real detection pipeline
(`detection-engine/engine.py`) — not just the simulated dataset.

## How the console finds a backend

On boot the client (`src/api/client.ts`) tries, in order:

| # | Backend | Env var | Default | Contract |
|---|---------|---------|---------|----------|
| 1 | **Team FastAPI engine** (`engine.py`) | `VITE_CDR_API_URL` | `http://localhost:8000` | `GET /api/v1/incidents`, `GET /api/v1/rules` |
| 2 | Bundled Express + PostgreSQL | `VITE_API_URL` | — | `POST /api/auth/login`, `GET /api/bootstrap` |
| 3 | Simulated dataset | — | always | built-in |

The first backend that answers wins. The console top-bar badge shows the
active source: **"Live · Sentinel-X Engine"**, **"Live · PostgreSQL"**, or
**"Simulated telemetry"**.

## Field mapping: engine → console

`engine.py` emits incidents like:

```json
{
  "id": "INC-1724256000",
  "timestamp": "2026-08-21T02:00:00",
  "rule_name": "Untrusted IAM Console Login",
  "severity": "CRITICAL",
  "action": "ConsoleLogin",
  "user": "admin",
  "source_ip": "203.0.113.7",
  "status": "Contained (Automated)"
}
```

The adapter (`mapCdrIncident`) normalizes this into the console's richer
model so every view lights up:

| Engine field | Console field |
|---|---|
| `rule_name` | incident title / threat name / detection rule |
| `severity` | severity (CRITICAL/HIGH/MEDIUM/LOW/INFO) |
| `user` | involved user, affected resource |
| `source_ip` | source IP, destination |
| `status` | status — "Contained (Automated)" → `CONTAINED`, "Allowed (Trusted VPN)" → `CONTAINED`, "Containment Failed" → `OPEN`, else `OPEN` |
| `timestamp` | detection time + timeline event |

YAML rules (`/api/v1/rules`) map via `mapCdrRule`:

| Rule field | Console field |
|---|---|
| `name` | rule name |
| `event_source` + `target_actions` | logic expression |
| `severity` | severity |
| `priority` | threshold (priority score) |
| `trusted_cidrs` | surfaced in rule description |

## Run the console against the live engine

```bash
# Terminal 1 — the team's detection engine (already in the repo)
cd detection-engine
pip install -r requirements.txt
python engine.py                      # serves http://localhost:8000

# Terminal 2 — this console
VITE_CDR_API_URL=http://localhost:8000 npm run dev
```

Incidents detected by the engine (including automated Lambda containment
and Trusted-VPN allowlist events) stream into the Overview, Threats,
Incidents and Rules views in real time.

## Feature coverage vs. the existing repo

| Capability | Repo today | Added by this console |
|---|---|---|
| Threat detection | YAML rules, priority sort, CIDR allowlist | Same engine, surfaced with severity/confidence, filters, drill-down |
| Incident view | Flat list | Full investigation: timeline, blast radius, MITRE, notes, status workflow |
| Containment | Automated Lambda Deny-All | Response center with risk-tagged queue + mandatory confirmation + audit trail |
| Rules | YAML files | Live rule browser, enable/disable, create/edit, simulated test, FP-rate |
| Visibility | Live KPIs | Infrastructure inventory, attack-path graphs, event explorer |
| Analysis | — | AI security analyst grounded in console telemetry |
