import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { connectApi, persistAction } from "./api/client";
import {
  ALERTS, INCIDENTS, RULES, RESPONSE_LOG_SEED, RECOMMENDED_ACTIONS,
  Alert, Incident, RuleDef,
} from "./data/securityData";

export type View = "overview" | "threats" | "incidents" | "infrastructure" | "attackpath" | "events" | "response" | "rules";

export interface ToastMsg { id: number; msg: string; kind: "ok" | "warn" | "crit" | "info" }

export interface LogEntry { id: string; ts: number; action: string; target: string; status: "EXECUTED" | "QUEUED"; by: string }

interface Focus { threatId?: string; incidentId?: string }

interface Store {
  view: View;
  focus: Focus;
  go: (v: View, f?: Focus) => void;
  alerts: Alert[];
  updateAlert: (id: string, patch: Partial<Alert>) => void;
  incidents: Incident[];
  updateIncident: (id: string, patch: Partial<Incident>) => void;
  addNote: (id: string, author: string, text: string) => void;
  rules: RuleDef[];
  toggleRule: (id: string) => void;
  saveRule: (r: RuleDef) => void;
  executed: string[];
  executeAction: (id: string, by?: string) => void;
  log: LogEntry[];
  toasts: ToastMsg[];
  toast: (msg: string, kind?: ToastMsg["kind"]) => void;
  dismissToast: (id: number) => void;
  analystOpen: boolean;
  setAnalystOpen: (b: boolean) => void;
  query: string;
  setQuery: (s: string) => void;
  apiConnected: boolean;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("Store missing");
  return s;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>("overview");
  const [focus, setFocus] = useState<Focus>({});
  const [alerts, setAlerts] = useState<Alert[]>(ALERTS);
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const [rules, setRules] = useState<RuleDef[]>(RULES);
  const [executed, setExecuted] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>(RESPONSE_LOG_SEED);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [analystOpen, setAnalystOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [apiConnected, setApiConnected] = useState(false);
  const idRef = useRef(1);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((msg: string, kind: ToastMsg["kind"] = "ok") => {
    const id = idRef.current++;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    window.setTimeout(() => dismissToast(id), 4600);
  }, [dismissToast]);

  const go = useCallback((v: View, f?: Focus) => {
    setView(v);
    setFocus(f ?? {});
    window.scrollTo({ top: 0 });
  }, []);

  // Live mode: if a backend is reachable (VITE_API_URL), prefer persisted
  // PostgreSQL data; otherwise keep the simulated dataset. Demo build never breaks.
  useEffect(() => {
    let cancelled = false;
    connectApi().then((data) => {
      if (cancelled || !data) return;
      setApiConnected(true);
      if (data.alerts?.length) setAlerts(data.alerts);
      if (data.incidents?.length) setIncidents(data.incidents);
      if (data.rules?.length) setRules(data.rules);
      toast("Live API connected — serving data from PostgreSQL", "ok");
    });
    return () => { cancelled = true; };
  }, [toast]);

  const updateAlert = useCallback((id: string, patch: Partial<Alert>) => {
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const updateIncident = useCallback((id: string, patch: Partial<Incident>) => {
    setIncidents((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const addNote = useCallback((id: string, author: string, text: string) => {
    setIncidents((a) => a.map((x) => (x.id === id ? { ...x, notes: [...x.notes, { ts: Date.now(), author, text }] } : x)));
  }, []);

  const toggleRule = useCallback((id: string) => {
    setRules((r) => {
      const next = r.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x));
      const rule = r.find((x) => x.id === id);
      if (rule) toast(`Rule ${rule.name} ${rule.enabled ? "disabled" : "enabled"}`, rule.enabled ? "warn" : "ok");
      return next;
    });
  }, [toast]);

  const saveRule = useCallback((r: RuleDef) => {
    setRules((rs) => {
      const exists = rs.some((x) => x.id === r.id);
      if (exists) {
        toast(`Rule ${r.name} updated`, "ok");
        return rs.map((x) => (x.id === r.id ? r : x));
      }
      toast(`Rule ${r.name} created`, "ok");
      return [r, ...rs];
    });
  }, [toast]);

  const executeAction = useCallback((id: string, by = "analyst") => {
    const def = RECOMMENDED_ACTIONS.find((a) => a.id === id);
    if (!def) return;
    setExecuted((e) => (e.includes(id) ? e : [...e, id]));
    setLog((l) => [{ id: `log-${Date.now()}`, ts: Date.now(), action: def.label, target: def.target, status: "EXECUTED", by }, ...l]);

    if (apiConnected) {
      // Persist to the append-only audit log server-side (fire-and-forget).
      void persistAction({
        actionId: id, label: def.label, target: def.target, risk: def.risk,
        incidentId: def.incidentId, confirmed: true,
        reason: `${def.label} on ${def.target} — approved via response center`,
      });
    }

    if (def.id === "act-verify-fp") {
      setAlerts((a) => a.map((x) => (x.id === "AL-3098" ? { ...x, status: "FALSE_POSITIVE" } : x)));
      toast("Alert marked as false positive", "info");
      return;
    }
    toast(`${def.label} executed on ${def.target}`, def.risk === "dangerous" ? "warn" : "ok");
    if (def.risk === "safe") return;

    // containment side-effects: close the incident and its active alerts
    setIncidents((inc) =>
      inc.map((x) => {
        if (x.id !== def.incidentId) return x;
        return { ...x, status: "CONTAINED", timeline: [...x.timeline, { ts: Date.now(), label: `${def.label} — ${def.target}`, detail: `Executed by ${by} via response center.`, kind: "action" as const }] };
      })
    );
    const incident = incidents.find((x) => x.id === def.incidentId);
    if (incident) {
      setAlerts((a) => a.map((al) => (incident.resourceIds.includes(al.resourceId) && al.status === "ACTIVE" ? { ...al, status: "CONTAINED" } : al)));
    }
  }, [toast, apiConnected, incidents]);

  const value: Store = {
    view, focus, go,
    alerts, updateAlert,
    incidents, updateIncident, addNote,
    rules, toggleRule, saveRule,
    executed, executeAction, log,
    toasts, toast, dismissToast,
    analystOpen, setAnalystOpen,
    query, setQuery,
    apiConnected,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
