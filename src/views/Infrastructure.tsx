import React, { useMemo, useState } from "react";
import { Icon } from "../components/icons";
import { Drawer, EmptyState, KV, SevDot } from "../components/ui";
import { EVENTS, Provider, RESOURCES, ResourceItem, fmtClock } from "../data/securityData";
import { useStore } from "../store";

const PROVIDERS: (Provider | "ALL")[] = ["ALL", "AWS", "Azure", "GCP"];

const scoreColor = (s: number) => (s < 60 ? "#FF5D55" : s < 75 ? "#FF9838" : s < 85 ? "#FFCE5C" : "#2FD6B5");

export default function Infrastructure() {
  const { alerts, go } = useStore();
  const [prov, setProv] = useState<Provider | "ALL">("ALL");
  const [env, setEnv] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);

  const types = useMemo(() => ["ALL", ...Array.from(new Set(RESOURCES.map((r) => r.type)))], []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return RESOURCES.filter((r) =>
      (prov === "ALL" || r.provider === prov) &&
      (env === "ALL" || r.env === env) &&
      (type === "ALL" || r.type === type) &&
      (!term || r.name.toLowerCase().includes(term) || r.region.toLowerCase().includes(term))
    ).sort((a, b) => a.score - b.score);
  }, [prov, env, type, q]);

  const sel: ResourceItem | null = RESOURCES.find((r) => r.id === selId) ?? null;
  const selAlerts = sel ? alerts.filter((a) => a.resourceId === sel.id) : [];
  const selEvents = sel ? EVENTS.filter((e) => e.resource === sel.name || e.resource.includes(sel.name.split("-")[0])).slice(0, 5) : [];

  const summary = {
    workloads: 18421,
    exposed: RESOURCES.reduce((s, r) => s + r.openPorts.length, 0),
    vulnerable: RESOURCES.reduce((s, r) => s + r.vulns, 0),
    critical: RESOURCES.filter((r) => r.status === "critical").length,
  };

  return (
    <div className="max-w-[1320px] mx-auto">
      {/* summary band */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { l: "Workloads monitored", v: summary.workloads.toLocaleString(), c: "#E9EEF2" },
          { l: "Exposed services / ports", v: String(summary.exposed), c: "#FFCE5C" },
          { l: "Open vulnerabilities", v: String(summary.vulnerable), c: "#FF9838" },
          { l: "Critical resources", v: String(summary.critical), c: "#FF5D55" },
        ].map((s) => (
          <div key={s.l} className="panel rounded-md px-4 py-4">
            <div className="lbl">{s.l}</div>
            <div className="font-disp font-bold text-[26px] leading-none mt-2.5 tracking-tight" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1.5">
          {PROVIDERS.map((p) => (
            <button key={p} onClick={() => setProv(p)} className={`px-3 py-2 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.14em] border transition-all ${prov === p ? "border-sig/60 text-sig bg-sig/10" : "border-edge text-mut hover:text-ink"}`}>
              {p === "ALL" ? "All clouds" : p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border border-edge rounded-sm px-3 py-2 bg-panel/60 focus-within:border-sig/50 transition-colors flex-1 min-w-[200px] max-w-sm">
          <Icon name="search" size={14} className="text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources, regions…" className="bg-transparent outline-none text-[12.5px] font-mono placeholder:text-dim w-full text-ink" />
        </div>
        <select value={env} onChange={(e) => setEnv(e.target.value)} className="bg-panel border border-edge rounded-sm px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-mut outline-none" aria-label="Environment">
          {["ALL", "prod", "staging", "dev"].map((x) => <option key={x} value={x}>{x === "ALL" ? "All envs" : x}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-panel border border-edge rounded-sm px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-mut outline-none" aria-label="Resource type">
          {types.map((x) => <option key={x} value={x}>{x === "ALL" ? "All types" : x}</option>)}
        </select>
      </div>

      <div className="lbl mb-3">{filtered.length} resources · sorted by security score (lowest first)</div>

      {filtered.length === 0 ? (
        <div className="panel rounded-md"><EmptyState title="No resources match" hint="Loosen the provider, environment or type filters to widen the inventory." /></div>
      ) : (
        <div className="panel rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-edge bg-panel2/50">
                  {["Resource", "Cloud", "Type", "Score", "Vulns", "Open ports", "Suspicious", "Alerts"].map((h) => (
                    <th key={h} className="lbl px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => setSelId(r.id)} className="border-b border-edge/60 last:border-0 hover:bg-panel2 cursor-pointer transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <SevDot sev={r.status === "critical" ? "CRITICAL" : r.status === "at-risk" ? "HIGH" : r.status === "watch" ? "MEDIUM" : "INFO"} />
                        <div>
                          <div className="font-mono text-[12.5px] text-ink group-hover:text-sig transition-colors">{r.name}</div>
                          <div className="font-mono text-[9.5px] text-dim">{r.region} · {r.env} · {r.identity}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span className="font-mono text-[10px] px-2 py-1 rounded-sm border border-edge2 text-mut">{r.provider}</span></td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-mut">{r.type}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5 w-28">
                        <div className="flex-1 h-[4px] bg-panel3 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: scoreColor(r.score) }} />
                        </div>
                        <span className="font-mono text-[11.5px]" style={{ color: scoreColor(r.score) }}>{r.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[12px]" style={{ color: r.vulns > 3 ? "#FF9838" : "#8FA0AE" }}>{r.vulns}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-mut">{r.openPorts.length ? r.openPorts.join(", ") : "—"}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px]" style={{ color: r.suspicious > 10 ? "#FF5D55" : "#8FA0AE" }}>{r.suspicious}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-mut">{r.alerts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* detail drawer */}
      <Drawer open={!!sel} onClose={() => setSelId(null)} width={520}>
        {sel && (
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="lbl">{sel.provider} · {sel.region} · {sel.env}</div>
                <h2 className="font-disp font-semibold text-xl mt-2">{sel.name}</h2>
                <div className="font-mono text-[11px] text-dim mt-1">{sel.type}</div>
              </div>
              <button onClick={() => setSelId(null)} className="text-dim hover:text-ink transition-colors p-1" aria-label="Close"><Icon name="x" size={18} /></button>
            </div>

            <div className="mt-6 flex items-center gap-5 panel rounded-sm p-4">
              <div className="font-disp font-bold text-4xl tracking-tight" style={{ color: scoreColor(sel.score) }}>{sel.score}</div>
              <div>
                <div className="lbl">Security score</div>
                <div className="text-[12px] text-mut mt-1 leading-snug">{sel.status === "critical" ? "Active compromise signals — treat as hostile" : sel.status === "at-risk" ? "Elevated suspicion — prioritize review" : sel.status === "watch" ? "Minor anomalies under observation" : "Baseline-consistent behavior"}</div>
              </div>
            </div>

            <div className="mt-5 panel rounded-sm p-4">
              <KV k="Identity" v={sel.identity} />
              <KV k="Vulnerabilities" v={<span style={{ color: sel.vulns > 3 ? "#FF9838" : "#2FD6B5" }}>{sel.vulns} open</span>} />
              <KV k="Open ports" v={sel.openPorts.length ? sel.openPorts.join(", ") : "none"} />
              <KV k="Suspicious events (30d)" v={<span style={{ color: sel.suspicious > 10 ? "#FF5D55" : "#E9EEF2" }}>{sel.suspicious}</span>} />
              <KV k="Associated alerts" v={sel.alerts} />
            </div>

            <div className="mt-6">
              <div className="lbl text-sig mb-2">Recent activity</div>
              <p className="text-[13.5px] text-ink leading-relaxed">{sel.activity}</p>
            </div>

            {selAlerts.length > 0 && (
              <div className="mt-6">
                <div className="lbl mb-3">Associated alerts</div>
                <div className="space-y-2">
                  {selAlerts.map((a) => (
                    <button key={a.id} onClick={() => { setSelId(null); go("threats", { threatId: a.id }); }} className="w-full flex items-center gap-3 border border-edge rounded-sm px-3.5 py-3 hover:border-sig/50 transition-colors text-left">
                      <SevDot sev={a.severity} />
                      <span className="flex-1 text-[12.5px] text-ink truncate">{a.name}</span>
                      <span className="font-mono text-[10px] text-dim">{a.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selEvents.length > 0 && (
              <div className="mt-6">
                <div className="lbl mb-3">Recent events</div>
                <div className="space-y-2">
                  {selEvents.map((e) => (
                    <div key={e.id} className="border border-edge rounded-sm px-3.5 py-3">
                      <div className="text-[12.5px] text-ink leading-snug">{e.message}</div>
                      <div className="font-mono text-[9.5px] text-dim mt-1">{fmtClock(e.ts)} · {e.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
