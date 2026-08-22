import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { connectApi, persistAction, DataSource } from "./api/client";
import {
  ALERTS, INCIDENTS, RULES, RESPONSE_LOG_SEED, RECOMMENDED_ACTIONS,
  Alert, Incident, RuleDef,
} from "./data/securityData";
import {
  NOVEL_ATTACK_CHAINS, NovelAttackChain,
  FLOW_ANOMALIES, FlowAnomaly,
  WORKLOAD_FLOW_PROFILES, WorkloadFlowProfile
} from "./data/mlData";

export type View =
  | "overview"
  | "threats"
  | "novel_threats"
  | "traffic_anomalies"
  | "incidents"
  | "infrastructure"
  | "attackpath"
  | "events"
  | "response"
  | "rules";

export interface ToastMsg { id: number; msg: string; kind: "ok" | "warn" | "crit" | "info" }

export interface LogEntry { id: string; ts: number; action: string; target: string; status: "EXECUTED" | "QUEUED"; by: string }

interface Focus { threatId?: string; incidentId?: string; novelId?: string; workloadId?: string }

interface Store {
  view: View;
  focus: Focus;
  go: (v: View, f?: Focus) => void;
  alerts: Alert[];
  updateAlert: (id: string, patch: Partial<Alert>) => void;
  incidents: Incident[];
  updateIncident: (id: string, patch: Partial<Incident>) => void;
  addNote: (id: string, author: string, text: string) => void;
  novelChains: NovelAttackChain[];
  updateNovelChain: (id: string, patch: Partial<NovelAttackChain>) => void;
  flowAnomalies: FlowAnomaly[];
  quarantineFlow: (id: string) => void;
  workloadProfiles: WorkloadFlowProfile[];
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
  dataSource: DataSource;
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
  const [novelChains, setNovelChains] = useState<NovelAttackChain[]>(NOVEL_ATTACK_CHAINS);
  const [flowAnomalies, setFlowAnomalies] = useState<FlowAnomaly[]>(FLOW_ANOMALIES);
  const [workloadProfiles, setWorkloadProfiles] = useState<WorkloadFlowProfile[]>(WORKLOAD_FLOW_PROFILES);
  const [rules, setRules] = useState<RuleDef[]>(RULES);
  const [executed, setExecuted] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>(RESPONSE_LOG_SEED);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [analystOpen, setAnalystOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [apiConnected, setApiConnected] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("simulated");
  const idRef = useRef(1);
  const knownAlertIdsRef = useRef<Set<string>>(new Set(ALERTS.map((a) => a.id)));

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((msg: string, kind: ToastMsg["kind"] = "ok") => {
    const id = idRef.current++;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    window.setTimeout(() => dismissToast(id), 5200);
  }, [dismissToast]);

  const go = useCallback((v: View, f?: Focus) => {
    setView(v);
    setFocus(f ?? {});
    window.scrollTo({ top: 0 });
  }, []);

  // Sync state and poll live backend every 2.5 seconds
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await connectApi();
        if (cancelled || !data) return;

        setApiConnected(true);
        setDataSource(data.source);

        if (data.alerts?.length) {
          // Check for newly arriving alerts from terminal simulations
          const newAlerts = data.alerts.filter((a) => !knownAlertIdsRef.current.has(a.id));
          if (newAlerts.length > 0) {
            newAlerts.forEach((a) => {
              knownAlertIdsRef.current.add(a.id);
              toast(`🚨 ATTACK DETECTED: ${a.name} (${a.resource})`, "crit");
            });
          }
          setAlerts(data.alerts);
        }

        if (data.incidents?.length) setIncidents(data.incidents);
        if (data.rules?.length) setRules(data.rules);
      } catch {
        // quiet fallback
      }
    };

    poll();
    const interval = window.setInterval(poll, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
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

  const updateNovelChain = useCallback((id: string, patch: Partial<NovelAttackChain>) => {
    setNovelChains((chains) => chains.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const quarantineFlow = useCallback((id: string) => {
    setFlowAnomalies((flows) =>
      flows.map((f) => (f.id === id ? { ...f, status: "QUARANTINED" } : f))
    );
    toast(`Flow ${id} quarantined — NetworkPolicy applied`, "ok");
  }, [toast]);

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

    // containment side-effects
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
    novelChains, updateNovelChain,
    flowAnomalies, quarantineFlow,
    workloadProfiles,
    rules, toggleRule, saveRule,
    executed, executeAction, log,
    toasts, toast, dismissToast,
    analystOpen, setAnalystOpen,
    query, setQuery,
    apiConnected, dataSource,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
