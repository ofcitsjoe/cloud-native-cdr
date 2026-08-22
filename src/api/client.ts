/* SENTINEL-X · unified API client
 *
 * Bridges the console to a live backend. Tries, in order:
 *
 *   1. The team Sentinel-X FastAPI detection engine (engine.py)
 *        VITE_CDR_API_URL  (default http://localhost:8000)
 *        GET /api/v1/incidents  →  { incidents: CdrIncident[] }
 *        GET /api/v1/rules      →  { rules: CdrRule[] }
 *
 *   2. The bundled Express + PostgreSQL / Standalone ML API
 *        VITE_API_URL           (login + /api/bootstrap + /api/ml/*)
 *
 *   3. Falls back to the simulated dataset — the demo never breaks.
 */
import { Alert, Incident, IncidentStatus, ResourceItem, RuleDef, Severity, NOW } from "../data/securityData";
import { MLEvaluationResult, NovelAttackChain, TrafficFlowPoint } from "../data/mlData";

const CDR_BASE: string = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CDR_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const BASE: string = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const TOKEN_KEY = "sentinelx_token";

export type DataSource = "cdr" | "postgres" | "simulated";

export const apiEnabled = () => BASE.length > 0;

function token(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 3000, base: string = BASE): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export interface Bootstrap {
  alerts: Alert[];
  incidents: Incident[];
  rules: RuleDef[];
  resources: ResourceItem[];
  source: DataSource;
}

/* ------------------------------------------------------------------ */
/*  Sentinel-X FastAPI engine (the team's detection-engine/engine.py)  */
/* ------------------------------------------------------------------ */

export interface CdrIncident {
  id: string;
  timestamp: string;
  rule_name: string;
  severity: string;
  action: string;
  user: string;
  source_ip: string;
  status: string;
}

export interface CdrRule {
  name: string;
  event_source?: string;
  target_actions?: string[];
  severity?: string;
  priority?: number;
  trusted_cidrs?: string[];
  [k: string]: unknown;
}

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const sevOf = (s: unknown): Severity =>
  SEVERITIES.includes(String(s).toUpperCase() as Severity) ? (String(s).toUpperCase() as Severity) : "MEDIUM";

function statusOf(s: string): IncidentStatus {
  const t = s.toLowerCase();
  if (t.includes("contained")) return "CONTAINED";
  if (t.includes("allowed") || t.includes("trusted")) return "CONTAINED";
  if (t.includes("failed")) return "OPEN";
  if (t.includes("investigat")) return "INVESTIGATING";
  return "OPEN";
}

/** Map a raw FastAPI incident into the console's Incident model. */
export function mapCdrIncident(raw: CdrIncident): Incident {
  const ts = Date.parse(raw.timestamp) || NOW;
  const contained = statusOf(raw.status) === "CONTAINED";
  return {
    id: raw.id,
    title: raw.rule_name,
    severity: sevOf(raw.severity),
    confidence: raw.severity === "CRITICAL" ? 95 : 85,
    status: statusOf(raw.status),
    ts,
    summary: `${raw.action} by ${raw.user} from ${raw.source_ip}. ${raw.status}.`,
    resourceIds: [],
    users: [raw.user],
    ips: [raw.source_ip],
    geo: [],
    mitre: [],
    timeline: [
      { ts, label: `Detected: ${raw.rule_name}`, detail: `${raw.action} · ${raw.user} · ${raw.source_ip}`, kind: "detect" },
      ...(contained ? [{ ts, label: raw.status, detail: "Automated containment executed by the response engine.", kind: "action" as const }] : []),
    ],
    relatedEventIds: [],
    recommendations: contained
      ? ["Review automated containment in the IAM console"]
      : ["Verify the identity and source IP", "Escalate to response if confirmed"],
    notes: [],
  };
}

/** Map a raw YAML rule into the console's RuleDef model. */
export function mapCdrRule(raw: CdrRule): RuleDef {
  return {
    id: raw.name.replace(/\s+/g, "-").toUpperCase(),
    name: raw.name,
    description: `Watches ${raw.event_source ?? "cloud API"} for ${(raw.target_actions ?? []).join(", ") || "targeted actions"}.`,
    severity: sevOf(raw.severity),
    enabled: true,
    triggers: 0,
    falsePositives: 0,
    lastTriggered: NOW,
    logic: `${raw.event_source ?? "*"}:${(raw.target_actions ?? ["*"]).join("|")}`,
    window: "realtime",
    threshold: raw.priority ?? 1,
  };
}

async function connectCdr(): Promise<Bootstrap | null> {
  try {
    const [inc, rul] = await Promise.all([
      request<{ incidents: CdrIncident[] }>("/api/v1/incidents", {}, 2000, CDR_BASE),
      request<{ rules: CdrRule[] }>("/api/v1/rules", {}, 2000, CDR_BASE),
    ]);
    const incidents = (inc.incidents ?? []).map(mapCdrIncident);
    const rules = (rul.rules ?? []).map(mapCdrRule);
    return {
      incidents,
      rules,
      alerts: incidents.map((i) => ({
        id: i.id,
        name: i.title,
        severity: i.severity,
        confidence: i.confidence,
        ts: i.ts,
        resourceId: i.ips[0] ?? "",
        resource: i.users[0] ?? "—",
        source: i.ips[0] ?? "—",
        destination: "—",
        rule: i.title,
        reason: i.summary,
        recommendation: i.recommendations[0] ?? "",
        status: i.status === "CONTAINED" ? "CONTAINED" : i.status === "INVESTIGATING" ? "INVESTIGATING" : "ACTIVE",
      })),
      resources: [],
      source: "cdr",
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Bundled Express + PostgreSQL / Standalone API                      */
/* ------------------------------------------------------------------ */

export async function connectApi(): Promise<Bootstrap | null> {
  // 1. Team FastAPI engine
  const cdr = await connectCdr();
  if (cdr) return cdr;

  // 2. Express API
  if (apiEnabled()) {
    try {
      const { token: jwt } = await request<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "analyst@sentinel-x.local", password: "sentinel-demo" }),
      });
      try { localStorage.setItem(TOKEN_KEY, jwt); } catch { /* private mode */ }
      const boot = await request<Omit<Bootstrap, "source">>("/api/bootstrap");
      return { ...boot, source: "postgres" };
    } catch { /* fall through */ }
  }

  // 3. Simulated
  return null;
}

export async function persistAction(action: {
  actionId: string; label: string; target: string; risk: "safe" | "caution" | "dangerous";
  incidentId?: string; confirmed: boolean; reason: string;
}): Promise<boolean> {
  if (!apiEnabled() || !token()) return false;
  try {
    await request("/api/actions/execute", { method: "POST", body: JSON.stringify(action) }, 5000);
    return true;
  } catch {
    return false;
  }
}

export async function runDetectionPass(): Promise<{ created: string[] } | null> {
  if (!apiEnabled() || !token()) return null;
  try {
    return await request("/api/detect/run", { method: "POST" }, 5000);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Machine Learning & AI Endpoints                                   */
/* ------------------------------------------------------------------ */

export async function analyzeNovelSequenceApi(actions: string[]): Promise<MLEvaluationResult | null> {
  try {
    return await request<MLEvaluationResult>("/api/ml/novel-attacks/analyze", {
      method: "POST",
      body: JSON.stringify({ actions }),
    }, 4000);
  } catch {
    return null;
  }
}

export async function fetchTrafficBaselineApi(workload: string): Promise<{ points: TrafficFlowPoint[] } | null> {
  try {
    return await request<{ points: TrafficFlowPoint[] }>(`/api/ml/traffic-baseline?workload=${encodeURIComponent(workload)}`, {}, 3000);
  } catch {
    return null;
  }
}

export interface CopilotResponse {
  query: string;
  timestamp: string;
  fact: string;
  inference: string;
  recommendation: string;
  blastRadius: string;
  remediationPlaybook?: {
    kubectl: string;
    awsCli: string;
    terraform: string;
  };
}

export async function queryAiCopilotApi(query: string, context?: Record<string, unknown>): Promise<CopilotResponse | null> {
  try {
    return await request<CopilotResponse>("/api/ai/copilot", {
      method: "POST",
      body: JSON.stringify({ query, context }),
    }, 5000);
  } catch {
    return null;
  }
}
