import React, { useState } from "react";
import { Icon } from "../components/icons";
import { Btn, EmptyState, Modal, SevBadge, Toggle } from "../components/ui";
import { EVENTS, EventItem, RuleDef, Severity, timeAgo } from "../data/securityData";
import { useStore } from "../store";

const MATCHERS: Record<string, (e: EventItem) => boolean> = {
  "NET-BRUTEFORCE-SSH-01": (e) => e.type === "ssh.auth",
  "ID-IMPOSSIBLE-TRAVEL-02": (e) => e.type === "identity.signin",
  "NET-EGRESS-TOR-01": (e) => e.type === "network.egress",
  "IAM-PRIV-ESC-07": (e) => e.type.startsWith("iam."),
  "K8S-SECRET-ENUM-04": (e) => e.type === "k8s.api",
  "DATA-EGRESS-VOL-03": (e) => e.type === "storage.read",
  "PROC-CRYPTO-02": (e) => e.type === "process.exec",
  "SRVLESS-BURST-05": (e) => e.type === "serverless.invoke",
  "ID-ROOT-LOGIN-01": (e) => e.type === "identity.signin" && e.actor === "root",
};

const blank: RuleDef = { id: "", name: "", description: "", severity: "HIGH", enabled: true, triggers: 0, falsePositives: 0, lastTriggered: Date.now(), logic: "", window: "5m", threshold: 10 };

export default function Rules() {
  const { rules, toggleRule, saveRule, toast } = useStore();
  const [editing, setEditing] = useState<RuleDef | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; matched: number } | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");

  const shown = rules.filter((r) => (filter === "ALL" ? true : filter === "ENABLED" ? r.enabled : !r.enabled));

  const openNew = () => { setIsNew(true); setErrors({}); setEditing({ ...blank, id: `CUSTOM-${String(rules.length + 1).padStart(2, "0")}` }); };
  const openEdit = (r: RuleDef) => { setIsNew(false); setErrors({}); setEditing({ ...r }); };

  const submit = () => {
    if (!editing) return;
    const errs: Record<string, string> = {};
    if (editing.name.trim().length < 5) errs.name = "Name must be at least 5 characters.";
    if (editing.description.trim().length < 10) errs.description = "Describe what the rule detects (10+ chars).";
    if (!editing.logic.trim()) errs.logic = "Detection logic is required.";
    if (!Number.isFinite(editing.threshold) || editing.threshold <= 0) errs.threshold = "Threshold must be a positive number.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveRule(editing);
    setEditing(null);
  };

  const runTest = (r: RuleDef) => {
    setTesting(r.id);
    setTestResult(null);
    window.setTimeout(() => {
      const matcher = MATCHERS[r.id] ?? ((e: EventItem) => e.severity === r.severity);
      const matched = EVENTS.filter(matcher).length;
      setTesting(null);
      setTestResult({ id: r.id, matched });
      toast(`Rule test complete — ${matched}/${EVENTS.length} events would fire`, matched > 0 ? "ok" : "info");
    }, 950);
  };

  return (
    <div className="max-w-[1320px] mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1.5">
          {(["ALL", "ENABLED", "DISABLED"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.14em] border transition-all ${filter === f ? "border-sig/60 text-sig bg-sig/10" : "border-edge text-mut hover:text-ink"}`}>
              {f === "ALL" ? `All rules · ${rules.length}` : f.toLowerCase()}
            </button>
          ))}
        </div>
        <Btn variant="solid" className="ml-auto" onClick={openNew}><Icon name="terminal" size={13} /> New rule</Btn>
      </div>

      {shown.length === 0 ? (
        <div className="panel rounded-md"><EmptyState title="No rules in this state" hint="Create a rule or toggle an existing one to change this view." /></div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((r) => {
            const fpRate = r.triggers > 0 ? Math.round((r.falsePositives / r.triggers) * 100) : 0;
            const isTesting = testing === r.id;
            const result = testResult?.id === r.id ? testResult : null;
            return (
              <div key={r.id} className="panel rounded-md px-5 py-4 hover:border-edge2 transition-colors">
                <div className="grid lg:grid-cols-[1fr_220px_200px_auto] gap-x-6 gap-y-3 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-[14.5px] font-medium ${r.enabled ? "text-ink" : "text-dim"}`}>{r.name}</span>
                      <SevBadge sev={r.severity} small />
                      <span className="font-mono text-[10px] text-dim">{r.id}</span>
                    </div>
                    <div className="text-[12.5px] text-mut mt-1.5 leading-relaxed">{r.description}</div>
                    <div className="font-mono text-[10.5px] text-dim mt-2 bg-panel2/70 border border-edge rounded-sm px-3 py-2 inline-block max-w-full truncate">
                      {r.logic} <span className="text-sig">· window {r.window} · threshold {r.threshold}</span>
                    </div>
                    {result && (
                      <div className="font-mono text-[10.5px] mt-2 text-sig anim-fade-up">
                        ✓ test run: {result.matched}/{EVENTS.length} events in the sample set would fire this rule
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><div className="lbl">Triggers</div><div className="font-mono text-[15px] text-ink mt-1">{r.triggers}</div></div>
                    <div><div className="lbl">False pos.</div><div className="font-mono text-[15px] mt-1" style={{ color: fpRate > 20 ? "#FF9838" : "#8FA0AE" }}>{fpRate}%</div></div>
                    <div><div className="lbl">Last fired</div><div className="font-mono text-[11px] text-mut mt-1.5">{timeAgo(r.lastTriggered)}</div></div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`lbl ${r.enabled ? "text-sig" : ""}`}>{r.enabled ? "enabled" : "disabled"}</span>
                    <Toggle on={r.enabled} onChange={() => toggleRule(r.id)} />
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="line" className="!px-3 !py-2" onClick={() => runTest(r)} disabled={isTesting}>
                      {isTesting ? <><Icon name="pulse" size={12} className="animate-pulse" /> Testing</> : <><Icon name="play" size={12} /> Test</>}
                    </Btn>
                    <Btn variant="ghost" className="!px-3 !py-2" onClick={() => openEdit(r)}><Icon name="settings" size={13} /></Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* create / edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} kicker={isNew ? "Author detection rule" : "Edit detection rule"} title={isNew ? "New rule" : editing?.name ?? ""} width={620}>
        {editing && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="lbl block mb-1.5" htmlFor="r-name">Rule name</label>
                <input id="r-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. DNS tunneling burst" className={`w-full bg-panel2 border rounded-sm px-3.5 py-2.5 text-[13px] outline-none focus:border-sig/50 transition-colors ${errors.name ? "border-crit/60" : "border-edge"}`} />
                {errors.name && <p className="text-[11px] text-crit mt-1.5 font-mono">{errors.name}</p>}
              </div>
              <div>
                <label className="lbl block mb-1.5" htmlFor="r-sev">Severity</label>
                <select id="r-sev" value={editing.severity} onChange={(e) => setEditing({ ...editing, severity: e.target.value as Severity })} className="w-full bg-panel2 border border-edge rounded-sm px-3.5 py-2.5 text-[13px] outline-none focus:border-sig/50">
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="lbl block mb-1.5" htmlFor="r-desc">Description</label>
              <input id="r-desc" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="What does this rule detect, and why does it matter?" className={`w-full bg-panel2 border rounded-sm px-3.5 py-2.5 text-[13px] outline-none focus:border-sig/50 transition-colors ${errors.description ? "border-crit/60" : "border-edge"}`} />
              {errors.description && <p className="text-[11px] text-crit mt-1.5 font-mono">{errors.description}</p>}
            </div>
            <div>
              <label className="lbl block mb-1.5" htmlFor="r-logic">Detection logic</label>
              <textarea id="r-logic" rows={3} value={editing.logic} onChange={(e) => setEditing({ ...editing, logic: e.target.value })} placeholder={"count(event.type == 'dns.query') group by src_ip"} className={`w-full bg-panel2 border rounded-sm px-3.5 py-2.5 text-[12.5px] font-mono outline-none focus:border-sig/50 transition-colors resize-none ${errors.logic ? "border-crit/60" : "border-edge"}`} />
              {errors.logic && <p className="text-[11px] text-crit mt-1.5 font-mono">{errors.logic}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="lbl block mb-1.5" htmlFor="r-thr">Threshold</label>
                <input id="r-thr" type="number" min={1} value={editing.threshold} onChange={(e) => setEditing({ ...editing, threshold: Number(e.target.value) })} className={`w-full bg-panel2 border rounded-sm px-3.5 py-2.5 text-[13px] font-mono outline-none focus:border-sig/50 transition-colors ${errors.threshold ? "border-crit/60" : "border-edge"}`} />
                {errors.threshold && <p className="text-[11px] text-crit mt-1.5 font-mono">{errors.threshold}</p>}
              </div>
              <div>
                <label className="lbl block mb-1.5" htmlFor="r-win">Window</label>
                <select id="r-win" value={editing.window} onChange={(e) => setEditing({ ...editing, window: e.target.value })} className="w-full bg-panel2 border border-edge rounded-sm px-3.5 py-2.5 text-[13px] font-mono outline-none focus:border-sig/50">
                  {["realtime", "1m", "5m", "15m", "30m", "1h", "24h"].map((w) => <option key={w}>{w}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-edge">
              <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn variant="solid" onClick={submit}><Icon name="check" size={13} /> {isNew ? "Create rule" : "Save changes"}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
