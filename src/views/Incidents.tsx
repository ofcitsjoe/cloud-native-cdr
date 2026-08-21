import React, { useEffect, useMemo, useState } from "react";
import ActionConfirm from "../components/ActionConfirm";
import { Icon } from "../components/icons";
import { Btn, IncidentStatusBadge, SevBadge, SevDot } from "../components/ui";
import { EVENTS, INCIDENT_STATUS_META, IncidentStatus, RECOMMENDED_ACTIONS, ResponseActionDef, fmtClock, timeAgo } from "../data/securityData";
import { useStore } from "../store";

const KIND_META = {
  attack: { c: "#FF5D55", icon: "alertTriangle" as const, l: "Attack" },
  detect: { c: "#2FD6B5", icon: "radar" as const, l: "Detection" },
  action: { c: "#5CB8FF", icon: "zap" as const, l: "Response" },
  info: { c: "#8FA0AE", icon: "fileText" as const, l: "Context" },
};

export default function Incidents() {
  const { incidents, updateIncident, addNote, focus, go, executed, toast } = useStore();
  const [selId, setSelId] = useState(incidents[0]?.id ?? null);
  const [confirm, setConfirm] = useState<ResponseActionDef | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (focus.incidentId) setSelId(focus.incidentId);
  }, [focus.incidentId]);

  const sorted = useMemo(() => [...incidents].sort((a, b) => b.ts - a.ts), [incidents]);
  const sel = incidents.find((i) => i.id === selId) ?? sorted[0] ?? null;
  if (!sel) return null;

  const actions = RECOMMENDED_ACTIONS.filter((a) => a.incidentId === sel.id);
  const relatedEvents = EVENTS.filter((e) => sel.relatedEventIds.includes(e.id));

  const setStatus = (s: IncidentStatus) => {
    updateIncident(sel.id, { status: s });
    toast(`${sel.id} → ${INCIDENT_STATUS_META[s].label}`, s === "CONTAINED" || s === "RESOLVED" ? "ok" : "info");
  };

  return (
    <div className="max-w-[1320px] mx-auto grid lg:grid-cols-[340px_1fr] gap-6 items-start">
      {/* list */}
      <div className="space-y-2 lg:sticky lg:top-24">
        <div className="lbl mb-3">{incidents.length} incidents · 30d</div>
        {sorted.map((i) => (
          <button
            key={i.id}
            onClick={() => setSelId(i.id)}
            className={`w-full text-left panel rounded-md p-4 transition-all border-l-2 ${sel.id === i.id ? "border-l-sig bg-panel2" : "border-l-transparent hover:bg-panel2/70"}`}
          >
            <div className="flex items-center gap-2.5">
              <SevDot sev={i.severity} pulse={i.status === "OPEN"} />
              <span className="font-mono text-[10px] text-dim">{i.id}</span>
              <span className="ml-auto"><IncidentStatusBadge status={i.status} /></span>
            </div>
            <div className="text-[13.5px] text-ink leading-snug mt-2">{i.title}</div>
            <div className="font-mono text-[10px] text-dim mt-1.5">{timeAgo(i.ts)} · {i.resourceIds.length} resources · conf {i.confidence}%</div>
          </button>
        ))}
      </div>

      {/* detail */}
      <div className="space-y-6 min-w-0" key={sel.id}>
        <div className="panel rounded-md p-6 anim-fade-up">
          <div className="flex flex-wrap items-center gap-3">
            <SevBadge sev={sel.severity} />
            <IncidentStatusBadge status={sel.status} />
            <span className="lbl">{sel.id} · opened {timeAgo(sel.ts)}</span>
            <div className="ml-auto flex gap-2">
              {sel.status === "OPEN" && <Btn variant="line" onClick={() => setStatus("INVESTIGATING")}><Icon name="eye" size={12} /> Investigate</Btn>}
              {(sel.status === "OPEN" || sel.status === "INVESTIGATING") && <Btn variant="solid" onClick={() => setStatus("CONTAINED")}><Icon name="check" size={12} /> Mark contained</Btn>}
              {sel.status === "CONTAINED" && <Btn variant="line" onClick={() => setStatus("RESOLVED")}><Icon name="check" size={12} /> Resolve</Btn>}
            </div>
          </div>
          <h1 className="font-disp font-bold text-2xl md:text-3xl tracking-tight leading-tight mt-4">{sel.title}</h1>

          {/* quick answers */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
            {[
              { k: "What happened", v: sel.summary.split(".")[0] + "." },
              { k: "How serious", v: `${sel.severity.toLowerCase()} severity · ${sel.confidence}% confidence` },
              { k: "Blast radius", v: `${sel.resourceIds.length} resources · ${sel.users.length} identities` },
              { k: "Next step", v: actions.find((a) => !executed.includes(a.id))?.label ?? "Verify containment & close" },
            ].map((x) => (
              <div key={x.k} className="border border-edge rounded-sm p-3.5 bg-panel2/50">
                <div className="lbl mb-1.5">{x.k}</div>
                <div className="text-[12.5px] text-ink leading-snug">{x.v}</div>
              </div>
            ))}
          </div>

          <p className="text-mut text-[14px] leading-relaxed mt-6">{sel.summary}</p>

          {/* meta */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6 pt-5 border-t border-edge">
            <div>
              <div className="lbl mb-2.5">Users involved</div>
              {sel.users.map((u) => <div key={u} className="font-mono text-[12px] text-ink py-1 flex items-center gap-2"><Icon name="user" size={12} className="text-dim" />{u}</div>)}
            </div>
            <div>
              <div className="lbl mb-2.5">IP addresses</div>
              {sel.ips.map((ip) => <div key={ip} className="font-mono text-[12px] text-ink py-1 flex items-center gap-2"><Icon name="globe" size={12} className="text-dim" />{ip}</div>)}
            </div>
            <div>
              <div className="lbl mb-2.5">Geography</div>
              {sel.geo.map((g) => <div key={g} className="font-mono text-[12px] text-ink py-1 flex items-center gap-2"><Icon name="crosshair" size={12} className="text-dim" />{g}</div>)}
            </div>
            <div>
              <div className="lbl mb-2.5">MITRE ATT&CK</div>
              {sel.mitre.map((m) => <div key={m} className="font-mono text-[11px] text-high py-1">{m}</div>)}
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          {/* timeline */}
          <div className="panel rounded-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-disp font-semibold text-[15px]">Attack & response timeline</div>
              <button onClick={() => go("attackpath", { incidentId: sel.id })} className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sig hover:brightness-125 inline-flex items-center gap-1.5">
                Attack path <Icon name="arrowRight" size={12} />
              </button>
            </div>
            {[...sel.timeline].sort((a, b) => a.ts - b.ts).map((t, i, arr) => {
              const k = KIND_META[t.kind];
              return (
                <div key={t.label + t.ts} className="flex gap-4 pb-5 last:pb-0 relative">
                  {i < arr.length - 1 && <div className="absolute left-[13px] top-8 bottom-0 w-px bg-edge" />}
                  <span className="w-[27px] h-[27px] rounded-sm border flex items-center justify-center shrink-0" style={{ borderColor: k.c + "55", background: k.c + "12", color: k.c }}>
                    <Icon name={k.icon} size={13} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-[13.5px] text-ink font-medium">{t.label}</span>
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: k.c }}>{k.l}</span>
                    </div>
                    <p className="text-[12.5px] text-mut leading-relaxed mt-1">{t.detail}</p>
                    <div className="font-mono text-[10px] text-dim mt-1">{fmtClock(t.ts)} · {timeAgo(t.ts)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* response plan */}
          <div className="panel rounded-md p-6">
            <div className="font-disp font-semibold text-[15px] mb-1">Recommended response</div>
            <div className="font-mono text-[10px] text-dim mb-5">dangerous actions require explicit confirmation</div>
            <div className="space-y-2.5">
              {actions.length === 0 && <p className="text-mut text-[13px]">No playbook actions mapped to this incident — verify containment manually.</p>}
              {actions.map((a) => {
                const done = executed.includes(a.id);
                return (
                  <div key={a.id} className={`border rounded-sm px-4 py-3.5 flex items-center gap-3.5 ${done ? "border-sig/30 bg-sig/5" : "border-edge hover:border-edge2"} transition-colors`}>
                    <Icon name={done ? "check" : a.risk === "dangerous" ? "alertTriangle" : a.risk === "caution" ? "eye" : "check"} size={15} className={done ? "text-sig" : a.risk === "dangerous" ? "text-crit" : "text-med"} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] ${done ? "text-mut line-through decoration-sig/40" : "text-ink"}`}>{a.label}</div>
                      <div className="font-mono text-[10px] text-dim mt-0.5 truncate">{a.target}</div>
                    </div>
                    {done ? (
                      <span className="lbl text-sig">executed</span>
                    ) : (
                      <Btn variant={a.risk === "dangerous" ? "danger" : "line"} className="!px-3 !py-1.5" onClick={() => setConfirm(a)} disabled={sel.status === "RESOLVED"}>
                        Execute
                      </Btn>
                    )}
                  </div>
                );
              })}
            </div>

            {/* notes */}
            <div className="mt-7 pt-5 border-t border-edge">
              <div className="font-disp font-semibold text-[15px] mb-4">Analyst notes</div>
              {sel.notes.length === 0 && <p className="text-dim text-[12.5px] font-mono mb-4">— no notes yet —</p>}
              <div className="space-y-3">
                {sel.notes.map((n, i) => (
                  <div key={i} className="border-l-2 border-sig/50 pl-3.5">
                    <p className="text-[13px] text-ink leading-relaxed">{n.text}</p>
                    <div className="font-mono text-[10px] text-dim mt-1">{n.author} · {timeAgo(n.ts)}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && note.trim()) {
                      addNote(sel.id, "you", note.trim());
                      setNote("");
                      toast("Note added to incident", "info");
                    }
                  }}
                  placeholder="Add investigation note… (Enter to save)"
                  className="flex-1 bg-panel2 border border-edge rounded-sm px-3.5 py-2.5 text-[13px] outline-none focus:border-sig/50 placeholder:text-dim transition-colors"
                />
                <Btn variant="solid" className="!px-3.5" onClick={() => {
                  if (!note.trim()) return;
                  addNote(sel.id, "you", note.trim());
                  setNote("");
                  toast("Note added to incident", "info");
                }}><Icon name="send" size={13} /></Btn>
              </div>
            </div>
          </div>
        </div>

        {/* related events */}
        <div className="panel rounded-md overflow-hidden">
          <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
            <div className="font-disp font-semibold text-[15px]">Related events · {relatedEvents.length}</div>
            <button onClick={() => go("events")} className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sig hover:brightness-125 inline-flex items-center gap-1.5">
              Event explorer <Icon name="arrowRight" size={12} />
            </button>
          </div>
          {relatedEvents.map((e) => (
            <div key={e.id} className="px-6 py-3 border-b border-edge/60 last:border-0 flex items-center gap-4 hover:bg-panel2/60 transition-colors">
              <SevDot sev={e.severity} />
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-ink">{e.message}</span>
              </div>
              <span className="font-mono text-[10.5px] text-dim hidden sm:block">{e.type}</span>
              <span className="font-mono text-[10.5px] text-dim w-20 text-right">{fmtClock(e.ts)}</span>
            </div>
          ))}
        </div>
      </div>

      <ActionConfirm def={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
