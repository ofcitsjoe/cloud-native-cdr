/* SENTINEL-X · API client
 *
 * When VITE_API_URL points at the Express backend (or the app is served
 * behind it), the console runs on live PostgreSQL data. When no backend
 * answers, the store transparently falls back to the simulated dataset —
 * the demo build never breaks.
 */
import { Alert, Incident, ResourceItem, RuleDef } from "../data/securityData";

const BASE: string = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "sentinelx_token";

export const apiEnabled = () => BASE.length > 0;

function token(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 2500): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
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
}

/** Demo-mode convenience login. Returns null when no backend is reachable. */
export async function connectApi(): Promise<Bootstrap | null> {
  if (!apiEnabled()) return null;
  try {
    const { token: jwt } = await request<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "analyst@sentinel-x.local", password: "sentinel-demo" }),
    });
    try { localStorage.setItem(TOKEN_KEY, jwt); } catch { /* private mode */ }
    return await request<Bootstrap>("/api/bootstrap");
  } catch {
    return null;
  }
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
