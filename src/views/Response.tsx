import React, { useState } from "react";
import ActionConfirm from "../components/ActionConfirm";
import { Icon } from "../components/icons";
import { RiskTag, SevDot, Toggle } from "../components/ui";
import { AUTOMATION_POLICIES, RECOMMENDED_ACTIONS, ResponseActionDef, timeAgo } from "../data/securityData";
import { useStore } from "../store";

export default function Response() {
  const { executed, executeAction, log, incidents, toast } = useStore();
  const [confirm, setConfirm] = useState<ResponseActionDef | null>(null);
  const [policies, setPolicies] = useState(AUTOMATION_POLICIES);

  const pending = RECOMMENDED_ACTIONS.filter((a) => !executed.includes(a.id));
  const done = RECOMMENDED_ACTIONS.filter((a) => executed.includes(a.id));

  const incOf = (id: string) => incidents.find((i) => i.id === id);

  return (
    <div className="max-w-[1320px] mx-auto space-y-6">
      {/* stat band */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Pending actions", v: String(pending.length), c: "#FF9838" },
          { l: "Executed this session", v: String(executed.length), c: "#2FD6B5" },
          { l: "Automated YTD", v: "145", c: "#E9EEF2" },
          { l: "Median containment", v: "34s", c: "#2FD6B5" },
        ].map((s) => (
          <div key={s.l} className="panel rounded-md px-4 py-4">
            <div className="lbl">{s.l}</div>
            <div className="font-disp font-bold text-[26px] leading-none mt-2.5 tracking-tight" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6 items-start">
        {/* pending queue */}
        <div className="space-y-6">
          <div className="panel rounded-md overflow-hidden">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <div>
                <div className="font-disp font-semibold text-[15px]">Recommended containment queue</div>
                <div className="font-mono text-[10px] text-dim mt-0.5">dangerous actions require explicit confirmation</div>
              </div>
              <span className="lbl text-high">{pending.length} pending</span>
            </div>
            {pending.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Icon name="check" size={22} className="text-sig mx-auto mb-3" />
                <div className="font-disp font-semibold">Queue clear</div>
                <p className="text-[12.5px] text-dim mt-1">Every recommended action has been executed or dismissed.</p>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                {pending.map((a) => {
                  const inc = incOf(a.incidentId);
                  return (
                    <div key={a.id} className="border border-edge rounded-sm p-4 hover:border-edge2 transition-colors">
                      <div className="flex items-start gap-3.5">
                        <span className={`w-9 h-9 rounded-sm border flex items-center justify-center shrink-0 ${a.risk === "dangerous" ? "border-crit/40 bg-crit/10 text-crit" : a.risk === "caution" ? "border-med/40 bg-med/10 text-med" : "border-sig/40 bg-sig/10 text-sig"}`}>
                          <Icon name={a.risk === "dangerous" ? "alertTriangle" : a.risk === "caution" ? "eye" : "check"} size={15} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[14px] text-ink font-medium">{a.label}</span>
                            <RiskTag risk={a.risk} />
                          </div>
                          <div className="font-mono text-[11px] text-mut mt-1">target: <span className="text-ink">{a.target}</span></div>
                          <p className="text-[12.5px] text-mut leading-relaxed mt-2">{a.why}</p>
                          <div className="flex items-center justify-between mt-3.5 flex-wrap gap-2">
                            {inc && (
                              <span className="lbl inline-flex items-center gap-2"><SevDot sev={inc.severity} /> {inc.id} · {inc.title.slice(0, 42)}…</span>
                            )}
                            <button
                              onClick={() => setConfirm(a)}
                              className={`inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] px-3.5 py-2 rounded-sm border transition-all active:scale-[0.98] ${a.risk === "dangerous" ? "border-crit/50 text-crit bg-crit/10 hover:bg-crit/20" : "border-sig/50 text-sig bg-sig/10 hover:bg-sig/20"}`}
                            >
                              <Icon name="zap" size={12} /> Execute
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {done.length > 0 && (
                  <div className="pt-3 border-t border-edge">
                    <div className="lbl mb-3 text-sig">Executed this session</div>
                    {done.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 py-2">
                        <Icon name="check" size={13} className="text-sig" />
                        <span className="text-[12.5px] text-mut line-through decoration-sig/40">{a.label}</span>
                        <span className="font-mono text-[10.5px] text-dim">· {a.target}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* audit trail */}
          <div className="panel rounded-md overflow-hidden">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <div className="font-disp font-semibold text-[15px]">Audit trail</div>
              <span className="lbl">append-only · {log.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[560px]">
                <tbody>
                  {log.map((l) => (
                    <tr key={l.id} className="border-b border-edge/60 last:border-0">
                      <td className="px-5 py-3 font-mono text-[10.5px] text-dim whitespace-nowrap w-24">{timeAgo(l.ts)}</td>
                      <td className="px-5 py-3">
                        <div className="text-[13px] text-ink">{l.action}</div>
                        <div className="font-mono text-[10px] text-dim mt-0.5">target {l.target}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-mut w-32">{l.by}</td>
                      <td className="px-5 py-3 w-28">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] px-2 py-1 rounded-sm border border-sig/40 text-sig bg-sig/8">{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* automation policies */}
        <div className="panel rounded-md overflow-hidden xl:sticky xl:top-24">
          <div className="px-5 py-4 border-b border-edge">
            <div className="font-disp font-semibold text-[15px]">Automation policies</div>
            <div className="font-mono text-[10px] text-dim mt-0.5">what the engine may do without asking</div>
          </div>
          <div className="p-5 space-y-4">
            {policies.map((p) => (
              <div key={p.id} className="border border-edge rounded-sm p-4 flex items-start gap-4 hover:border-edge2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[13.5px] text-ink font-medium">{p.name}</span>
                    {p.enabled && <span className="lbl text-sig">armed</span>}
                  </div>
                  <p className="text-[12px] text-mut leading-relaxed mt-1.5">{p.desc}</p>
                  <div className="font-mono text-[10px] text-dim mt-2">{p.executed} automatic executions YTD</div>
                </div>
                <Toggle
                  on={p.enabled}
                  onChange={(v) => {
                    setPolicies((ps) => ps.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)));
                    toast(`${p.name} ${v ? "armed" : "disarmed"}`, v ? "ok" : "warn");
                  }}
                />
              </div>
            ))}
            <div className="border border-med/30 bg-med/6 rounded-sm p-4 flex gap-3">
              <Icon name="alertTriangle" size={15} className="text-med mt-0.5 shrink-0" />
              <p className="text-[12px] text-mut leading-relaxed">
                Destructive actions — disabling identities, revoking credentials, terminating workloads — are
                <span className="text-ink"> never automated</span> in this build. They always require an analyst's explicit confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ActionConfirm def={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
