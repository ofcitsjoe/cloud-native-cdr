import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/icons";
import { AlertStatusBadge, Btn, Drawer, EmptyState, KV, SevBadge, SevDot } from "../components/ui";
import { Alert, AlertStatus, Severity, SEV_META, fmtClock, timeAgo } from "../data/securityData";
import { useStore } from "../store";

const SEVS: (Severity | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const STATUSES: (AlertStatus | "ALL")[] = ["ALL", "ACTIVE", "INVESTIGATING", "CONTAINED", "FALSE_POSITIVE"];

export default function Threats() {
  const { alerts, updateAlert, focus, go, incidents, toast } = useStore();
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<Severity | "ALL">("ALL");
  const [status, setStatus] = useState<AlertStatus | "ALL">("ALL");
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    if (focus.threatId) setSelId(focus.threatId);
  }, [focus.threatId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...alerts]
      .filter((a) => (sev === "ALL" ? true : a.severity === sev))
      .filter((a) => (status === "ALL" ? true : a.status === status))
      .filter((a) => !term || a.name.toLowerCase().includes(term) || a.resource.toLowerCase().includes(term) || a.rule.toLowerCase().includes(term) || a.id.toLowerCase().includes(term))
      .sort((a, b) => b.ts - a.ts);
  }, [alerts, q, sev, status]);

  const sel: Alert | null = alerts.find((a) => a.id === selId) ?? null;
  const linkedIncident = sel ? incidents.find((i) => i.resourceIds.includes(sel.resourceId)) : null;

  const setStatusOf = (a: Alert, s: AlertStatus, msg: string) => {
    updateAlert(a.id, { status: s });
    toast(msg, s === "CONTAINED" ? "ok" : "info");
  };

  return (
    <div className="max-w-[1320px] mx-auto">
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 border border-edge rounded-sm px-3 py-2.5 bg-panel/60 focus-within:border-sig/50 transition-colors w-full sm:w-72">
          <Icon name="search" size={14} className="text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search detections, rules, resources…" className="bg-transparent outline-none text-[12.5px] font-mono placeholder:text-dim w-full text-ink" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SEVS.map((s) => (
            <button
              key={s}
              onClick={() => setSev(s)}
              className={`px-3 py-2 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] border transition-all ${sev === s ? "border-sig/60 text-sig bg-sig/10" : "border-edge text-mut hover:text-ink hover:border-edge2"}`}
            >
              {s !== "ALL" ? <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: SEV_META[s].hex }} />{s}</span> : "All sev"}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AlertStatus | "ALL")}
          className="ml-auto bg-panel border border-edge rounded-sm px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-mut outline-none focus:border-sig/50"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="lbl">{filtered.length} detections · sorted by recency</span>
        <span className="lbl text-crit">{filtered.filter((a) => a.status === "ACTIVE").length} require action</span>
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <div className="panel rounded-md"><EmptyState title="No detections match" hint="Adjust severity, status or search term — quiet is good, but double-check the filters." /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelId(a.id)}
              className="w-full text-left panel rounded-md px-5 py-4 hover:border-edge2 hover:bg-panel2/70 transition-all group grid grid-cols-[auto_1fr] md:grid-cols-[auto_1.6fr_1fr_auto_auto] gap-x-5 gap-y-2 items-center"
            >
              <SevDot sev={a.severity} pulse={a.severity === "CRITICAL" && a.status === "ACTIVE"} />
              <div className="min-w-0">
                <div className="text-[14px] text-ink group-hover:text-sig transition-colors leading-snug">{a.name}</div>
                <div className="font-mono text-[10px] text-dim mt-1">{a.id} · rule {a.rule} · {fmtClock(a.ts)}</div>
              </div>
              <div className="hidden md:block min-w-0">
                <div className="font-mono text-[11.5px] text-mut truncate">{a.resource}</div>
                <div className="font-mono text-[10px] text-dim mt-1 truncate">{a.source} → {a.destination}</div>
              </div>
              <div className="hidden md:flex flex-col items-end gap-1">
                <span className="font-mono text-[11px] text-mut">conf <span style={{ color: a.confidence >= 90 ? "#2FD6B5" : "#FFCE5C" }}>{a.confidence}%</span></span>
                <span className="font-mono text-[10px] text-dim">{timeAgo(a.ts)}</span>
              </div>
              <div className="col-start-2 md:col-start-auto"><AlertStatusBadge status={a.status} /></div>
            </button>
          ))}
        </div>
      )}

      {/* detail drawer */}
      <Drawer open={!!sel} onClose={() => setSelId(null)} width={560}>
        {sel && (
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <SevBadge sev={sel.severity} />
                  <AlertStatusBadge status={sel.status} />
                  <span className="lbl">{sel.id}</span>
                </div>
                <h2 className="font-disp font-semibold text-xl leading-tight mt-3">{sel.name}</h2>
              </div>
              <button onClick={() => setSelId(null)} className="text-dim hover:text-ink transition-colors p-1" aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="mt-5 panel rounded-sm p-4">
              <KV k="Confidence" v={<span style={{ color: sel.confidence >= 90 ? "#2FD6B5" : "#FFCE5C" }}>{sel.confidence}%</span>} />
              <KV k="Detected" v={`${fmtClock(sel.ts)} · ${timeAgo(sel.ts)}`} />
              <KV k="Detection rule" v={sel.rule} />
              <KV k="Affected resource" v={sel.resource} />
              <KV k="Source" v={sel.source} />
              <KV k="Destination" v={sel.destination} />
            </div>

            <div className="mt-6">
              <div className="lbl text-sig mb-2">Why it fired</div>
              <p className="text-[13.5px] text-ink leading-relaxed">{sel.reason}</p>
            </div>

            <div className="mt-5 border border-sig/25 bg-sig/5 rounded-sm p-4">
              <div className="lbl text-sig mb-2">Recommended action</div>
              <p className="text-[13.5px] text-ink leading-relaxed">{sel.recommendation}</p>
            </div>

            {linkedIncident && (
              <button onClick={() => { setSelId(null); go("incidents", { incidentId: linkedIncident.id }); }} className="mt-5 w-full flex items-center justify-between panel rounded-sm px-4 py-3.5 hover:border-sig/50 transition-colors group">
                <span className="flex items-center gap-3">
                  <Icon name="siren" size={15} className="text-high" />
                  <span className="text-left">
                    <span className="block text-[12.5px] text-ink group-hover:text-sig transition-colors">Correlated incident {linkedIncident.id}</span>
                    <span className="block font-mono text-[10px] text-dim mt-0.5">{linkedIncident.title}</span>
                  </span>
                </span>
                <Icon name="arrowRight" size={14} className="text-sig" />
              </button>
            )}

            <div className="mt-6 pt-5 border-t border-edge flex flex-wrap gap-3">
              {sel.status !== "CONTAINED" && sel.status !== "FALSE_POSITIVE" && (
                <>
                  <Btn variant="solid" onClick={() => setStatusOf(sel, "CONTAINED", `${sel.id} marked contained`)}><Icon name="check" size={13} /> Mark contained</Btn>
                  <Btn variant="line" onClick={() => setStatusOf(sel, "INVESTIGATING", `${sel.id} moved to investigating`)}><Icon name="eye" size={13} /> Investigate</Btn>
                  <Btn variant="ghost" danger onClick={() => setStatusOf(sel, "FALSE_POSITIVE", `${sel.id} marked false positive`)}><Icon name="ban" size={13} /> False positive</Btn>
                </>
              )}
              {(sel.status === "CONTAINED" || sel.status === "FALSE_POSITIVE") && (
                <span className="lbl text-sig flex items-center gap-2"><Icon name="check" size={14} /> Closed — {sel.status.replace("_", " ").toLowerCase()}</span>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
