import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/icons";
import { EmptyState, Pagination, SevDot } from "../components/ui";
import { EVENTS, NOW, Severity, SEV_META, fmtClock, fmtDay } from "../data/securityData";
import { useStore } from "../store";

const PAGE = 8;
const RANGES = [
  { id: "ALL", label: "All time", min: 0 },
  { id: "1H", label: "Last hour", min: 60 },
  { id: "24H", label: "Last 24h", min: 60 * 24 },
  { id: "7D", label: "Last 7d", min: 60 * 24 * 7 },
];

export default function Events() {
  const { query, setQuery } = useStore();
  const [q, setQ] = useState(query);
  const [sev, setSev] = useState<Severity | "ALL">("ALL");
  const [type, setType] = useState("ALL");
  const [res, setRes] = useState("ALL");
  const [range, setRange] = useState("ALL");
  const [sortKey, setSortKey] = useState<"ts" | "severity">("ts");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => setQ(query), [query]);
  useEffect(() => setPage(1), [q, sev, type, res, range, sortKey, dir]);

  const types = useMemo(() => ["ALL", ...Array.from(new Set(EVENTS.map((e) => e.type)))], []);
  const resources = useMemo(() => ["ALL", ...Array.from(new Set(EVENTS.map((e) => e.resource)))], []);

  const sevRank: Record<Severity, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const r = RANGES.find((x) => x.id === range)!;
    const minTs = NOW - r.min * 60_000;
    const list = EVENTS.filter(
      (e) =>
        (sev === "ALL" || e.severity === sev) &&
        (type === "ALL" || e.type === type) &&
        (res === "ALL" || e.resource === res) &&
        (r.min === 0 || e.ts >= minTs) &&
        (!term || [e.message, e.source, e.destination, e.actor, e.type, e.resource, e.id].some((f) => f.toLowerCase().includes(term)))
    );
    return list.sort((a, b) => {
      const d = sortKey === "ts" ? a.ts - b.ts : sevRank[a.severity] - sevRank[b.severity];
      return dir === "asc" ? d : -d;
    });
  }, [q, sev, type, res, range, sortKey, dir]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);

  const toggleSort = (k: "ts" | "severity") => {
    if (sortKey === k) setDir(dir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setDir("desc"); }
  };

  return (
    <div className="max-w-[1320px] mx-auto">
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border border-edge rounded-sm px-3 py-2.5 bg-panel/60 focus-within:border-sig/50 transition-colors w-full sm:w-80">
          <Icon name="search" size={14} className="text-dim" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setQuery(e.target.value); }}
            placeholder="Search messages, actors, IPs, resources…"
            className="bg-transparent outline-none text-[12.5px] font-mono placeholder:text-dim w-full text-ink"
          />
          {q && <button onClick={() => { setQ(""); setQuery(""); }} className="text-dim hover:text-ink" aria-label="Clear search"><Icon name="x" size={13} /></button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className={`px-3 py-2 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] border transition-all ${range === r.id ? "border-sig/60 text-sig bg-sig/10" : "border-edge text-mut hover:text-ink"}`}>
              {r.label}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-panel border border-edge rounded-sm px-3 py-2 font-mono text-[11px] text-mut outline-none" aria-label="Event type">
          {types.map((t) => <option key={t} value={t}>{t === "ALL" ? "All types" : t}</option>)}
        </select>
        <select value={res} onChange={(e) => setRes(e.target.value)} className="bg-panel border border-edge rounded-sm px-3 py-2 font-mono text-[11px] text-mut outline-none max-w-[220px]" aria-label="Resource">
          {resources.map((t) => <option key={t} value={t}>{t === "ALL" ? "All resources" : t}</option>)}
        </select>
        <div className="ml-auto flex gap-1.5">
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map((s) => (
            <button key={s} onClick={() => setSev(s)} title={s} className={`px-2.5 py-2 rounded-sm font-mono text-[10px] uppercase border transition-all ${sev === s ? "border-sig/60 text-sig bg-sig/10" : "border-edge text-mut hover:text-ink"}`}>
              {s === "ALL" ? "ALL" : s.slice(0, 1)}
            </button>
          ))}
        </div>
      </div>

      <div className="lbl mb-3">{filtered.length} events match · expand a row for raw telemetry</div>

      <div className="panel rounded-md overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No events match" hint="Widen the time range or clear filters. Telemetry is simulated and finite in this demo." />
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[110px_90px_1fr_180px_150px_60px] gap-3 px-5 py-2.5 border-b border-edge bg-panel2/50">
              <button onClick={() => toggleSort("ts")} className="lbl text-left hover:text-sig transition-colors inline-flex items-center gap-1.5">
                Time {sortKey === "ts" && <Icon name="chevronDown" size={11} className={dir === "asc" ? "rotate-180" : ""} />}
              </button>
              <button onClick={() => toggleSort("severity")} className="lbl text-left hover:text-sig transition-colors inline-flex items-center gap-1.5">
                Severity {sortKey === "severity" && <Icon name="chevronDown" size={11} className={dir === "asc" ? "rotate-180" : ""} />}
              </button>
              <span className="lbl">Event</span>
              <span className="lbl">Source → destination</span>
              <span className="lbl">Resource</span>
              <span className="lbl" />
            </div>
            {rows.map((e) => (
              <div key={e.id} className="border-b border-edge/60 last:border-0">
                <button onClick={() => setOpen(open === e.id ? null : e.id)} className="w-full text-left grid grid-cols-[auto_1fr_auto] md:grid-cols-[110px_90px_1fr_180px_150px_60px] gap-3 items-center px-5 py-3.5 hover:bg-panel2/70 transition-colors">
                  <span className="font-mono text-[11px] text-dim tabular-nums hidden md:block">{fmtDay(e.ts)} {fmtClock(e.ts).slice(0, 5)}</span>
                  <span className="hidden md:block"><SevDot sev={e.severity} /></span>
                  <span className="min-w-0">
                    <span className="block text-[13px] text-ink leading-snug truncate">{e.message}</span>
                    <span className="block font-mono text-[9.5px] text-dim mt-0.5 md:hidden">{fmtClock(e.ts)} · {e.type}</span>
                    <span className="hidden md:block font-mono text-[9.5px] text-dim mt-0.5">{e.id} · {e.type} · actor {e.actor}</span>
                  </span>
                  <span className="hidden md:block font-mono text-[10.5px] text-mut truncate">{e.source} → {e.destination}</span>
                  <span className="hidden md:block font-mono text-[10.5px] text-mut truncate">{e.resource}</span>
                  <span className="justify-self-end">
                    <Icon name="chevronDown" size={14} className={`text-dim transition-transform duration-200 ${open === e.id ? "rotate-180 text-sig" : ""}`} />
                  </span>
                </button>
                {open === e.id && (
                  <div className="px-5 pb-4 anim-fade-up">
                    <div className="grid md:grid-cols-[1fr_280px] gap-4">
                      <div className="border border-edge rounded-sm bg-abyss/70 p-4 font-mono text-[11px] leading-relaxed">
                        <div className="lbl mb-2">Raw event · JSON</div>
                        <div><span className="text-dim">{"{"}</span></div>
                        {Object.entries({ id: e.id, timestamp: new Date(e.ts).toISOString(), type: e.type, severity: e.severity, actor: e.actor, source: e.source, destination: e.destination, resource: e.resource, ...e.raw }).map(([k, v]) => (
                          <div key={k} className="pl-5">
                            <span className="text-low">"{k}"</span><span className="text-dim">: </span>
                            <span className={typeof v === "number" ? "text-high" : "text-ink"}>{typeof v === "number" ? v : `"${v}"`}</span><span className="text-dim">,</span>
                          </div>
                        ))}
                        <div><span className="text-dim">{"}"}</span></div>
                      </div>
                      <div className="border border-edge rounded-sm p-4 space-y-3">
                        <div>
                          <div className="lbl mb-1.5">Severity</div>
                          <span className="font-mono text-[11px]" style={{ color: SEV_META[e.severity].hex }}>{e.severity}</span>
                        </div>
                        <div>
                          <div className="lbl mb-1.5">Actor</div>
                          <div className="font-mono text-[11.5px] text-ink">{e.actor}</div>
                        </div>
                        <div>
                          <div className="lbl mb-1.5">Collection source</div>
                          <div className="font-mono text-[11.5px] text-mut">{e.type.startsWith("k8s") ? "EKS audit log" : e.type.startsWith("iam") || e.type.startsWith("identity") ? "CloudTrail" : e.type.startsWith("db") ? "Database audit" : e.type.startsWith("network") ? "VPC flow / DNS" : e.type.startsWith("response") ? "Response engine" : "Workload agent"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="px-5 pb-4">
              <Pagination page={page} pages={pages} onPage={setPage} total={filtered.length} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
