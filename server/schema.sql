-- SENTINEL-X · PostgreSQL schema
-- Run automatically by server/seed.js

CREATE TABLE IF NOT EXISTS analysts (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  pass_hash   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'analyst',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  provider    TEXT NOT NULL,
  region      TEXT NOT NULL,
  env         TEXT NOT NULL,
  score       INT  NOT NULL,
  vulns       INT  NOT NULL DEFAULT 0,
  open_ports  TEXT[] NOT NULL DEFAULT '{}',
  suspicious  INT  NOT NULL DEFAULT 0,
  identity    TEXT,
  activity    TEXT,
  status      TEXT NOT NULL,
  alerts      INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL,
  type        TEXT NOT NULL,
  severity    TEXT NOT NULL,
  source      TEXT,
  destination TEXT,
  resource    TEXT,
  actor       TEXT,
  message     TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_events_ts     ON events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_type   ON events (type, ts DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  severity        TEXT NOT NULL,
  confidence      INT  NOT NULL,
  ts              TIMESTAMPTZ NOT NULL,
  resource_id     TEXT REFERENCES resources(id) ON UPDATE CASCADE,
  resource        TEXT,
  source          TEXT,
  destination     TEXT,
  rule            TEXT,
  reason          TEXT,
  recommendation  TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status, severity);

CREATE TABLE IF NOT EXISTS incidents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  severity    TEXT NOT NULL,
  confidence  INT  NOT NULL,
  status      TEXT NOT NULL DEFAULT 'OPEN',
  ts          TIMESTAMPTZ NOT NULL,
  summary     TEXT,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb   -- users, ips, geo, mitre, timeline, notes, recommendations, relatedEventIds
);

CREATE TABLE IF NOT EXISTS incident_resources (
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  resource_id TEXT REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, resource_id)
);

CREATE TABLE IF NOT EXISTS rules (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  severity        TEXT NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  triggers        INT  NOT NULL DEFAULT 0,
  false_positives INT  NOT NULL DEFAULT 0,
  last_triggered  TIMESTAMPTZ,
  logic           TEXT,
  window          TEXT,
  threshold       INT
);

-- Append-only audit trail: never UPDATE or DELETE from this table.
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  target      TEXT,
  risk        TEXT,
  incident_id TEXT,
  reason      TEXT
);
