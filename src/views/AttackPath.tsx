import React, { useEffect, useState } from "react";
import { Icon } from "../components/icons";
import { SevBadge, SevDot } from "../components/ui";
import { ATTACK_PATH, PathEdge, PathNode, SEV_META, Severity } from "../data/securityData";
import { useStore } from "../store";

const IAM_PATH: { id: string; title: string; incident: string; nodes: PathNode[]; edges: PathEdge[] } = {
  id: "ap-2213",
  title: "IAM privilege escalation chain",
  incident: "INC-2213",
  nodes: [
    { id: "i1", x: 60, y: 210, label: "Attacker session", sub: "103.28.55.12 · Singapore", kind: "attacker", sev: "CRITICAL", risk: "Stolen session credentials", events: ["Impossible travel Oslo→SG", "sts:GetSessionToken 12h"], permissions: ["—"], related: ["AL-3124"] },
    { id: "i2", x: 280, y: 100, label: "ci-runner role", sub: "Assumed outside schedule", kind: "identity", sev: "HIGH", risk: "Pipeline identity abused", events: ["AssumeRole outside window", "No matching pipeline run"], permissions: ["sts:AssumeRole"], related: ["AL-3121"] },
    { id: "i3", x: 280, y: 330, label: "svc-deploy", sub: "IAM user · target", kind: "identity", sev: "CRITICAL", risk: "Account fully controlled", events: ["CreateAccessKey •••T2M8", "AttachUserPolicy admin"], permissions: ["iam:*", "s3:GetObject"], related: ["AL-3121", "AL-3119"] },
    { id: "i4", x: 540, y: 210, label: "AdministratorAccess", sub: "Policy attachment", kind: "api", sev: "CRITICAL", risk: "Full account control granted", events: ["iam:AttachUserPolicy outside change window"], permissions: ["*:*"], related: ["AL-3121"] },
    { id: "i5", x: 780, y: 110, label: "finance-exports", sub: "S3 · 4.2 GB egress", kind: "data", sev: "HIGH", risk: "Data already targeted", events: ["Bulk GetObject burst", "Egress to unclassified ASN"], permissions: ["s3:GetObject"], related: ["AL-3119"] },
    { id: "i6", x: 780, y: 320, label: "EKS control plane", sub: "Next probable target", kind: "compute", sev: "MEDIUM", risk: "Deploy path available to role", events: ["Role trust allows eks:Describe*"], permissions: ["eks:Describe*"], related: ["AL-3126"] },
  ],
  edges: [
    { from: "i1", to: "i2", threat: true, label: "stolen runner creds" },
    { from: "i2", to: "i3", threat: true, label: "key + policy write" },
    { from: "i3", to: "i4", threat: true, label: "attach admin" },
    { from: "i4", to: "i5", threat: true, label: "data access" },
    { from: "i4", to: "i6", threat: true, label: "cluster path" },
  ],
};

const PATHS = [ATTACK_PATH, IAM_PATH];
const KIND_ICON: Record<PathNode["kind"], "crosshair" | "user" | "terminal" | "cpu" | "database"> = {
  attacker: "crosshair", identity: "user", api: "terminal", compute: "cpu", data: "database",
};

export default function AttackPath() {
  const { incidents, focus, go } = useStore();
  const [pathIdx, setPathIdx] = useState(0);
  const [selNode, setSelNode] = useState<string | null>("n5");

  useEffect(() => {
    if (focus.incidentId === "INC-2213") { setPathIdx(1); setSelNode("i3"); }
    if (focus.incidentId === "INC-2214") { setPathIdx(0); setSelNode("n5"); }
  }, [focus.incidentId]);

  const path = PATHS[pathIdx];
  const node = path.nodes.find((n) => n.id === selNode) ?? path.nodes[0];
  const W = 1100, H = 460, NW = 176, NH = 54;
  const center = (n: PathNode) => ({ cx: n.x + NW / 2, cy: n.y + NH / 2 });

  return (
    <div className="max-w-[1320px] mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {PATHS.map((p, i) => {
          const inc = incidents.find((x) => x.id === p.incident);
          return (
            <button key={p.id} onClick={() => { setPathIdx(i); setSelNode(p.nodes[0].id); }} className={`panel rounded-md px-4 py-3 text-left transition-all border ${pathIdx === i ? "border-sig/60 bg-sig/5" : "hover:border-edge2"}`}>
              <div className="flex items-center gap-2.5">
                {inc && <SevDot sev={inc.severity} pulse={inc.status === "OPEN"} />}
                <span className="font-mono text-[11px] text-dim">{p.incident}</span>
              </div>
              <div className={`text-[13.5px] mt-1 ${pathIdx === i ? "text-sig" : "text-ink"}`}>{p.title}</div>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-5 lbl">
          <span className="inline-flex items-center gap-2"><span className="w-5 h-0 border-t border-dashed border-crit inline-block" />compromised hop</span>
          <span className="inline-flex items-center gap-2"><span className="w-5 h-0 border-t border-dashed border-edge2 inline-block" />observed / inferred</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">
        {/* graph */}
        <div className="panel rounded-md overflow-hidden">
          <div className="px-5 py-3.5 border-b border-edge flex items-center justify-between">
            <span className="lbl">Intrusion graph · {path.nodes.length} nodes · {path.edges.length} edges</span>
            <span className="lbl text-crit">click a node to inspect</span>
          </div>
          <div className="overflow-x-auto gridbg-fine">
            <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[860px] w-full h-auto block">
              {path.edges.map((e) => {
                const a = center(path.nodes.find((n) => n.id === e.from)!);
                const b = center(path.nodes.find((n) => n.id === e.to)!);
                const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2;
                return (
                  <g key={e.from + e.to}>
                    <line x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke={e.threat ? "#FF5D55" : "#2a3642"} strokeWidth={e.threat ? 1.6 : 1.2} strokeOpacity={e.threat ? 0.85 : 0.9} className={e.threat ? "flow-dash" : "flow-dash-slow"} />
                    {e.label && (
                      <text x={mx} y={my - 7} textAnchor="middle" fontSize="9.5" fill={e.threat ? "#FF5D55" : "#5d6c79"} fontFamily="IBM Plex Mono">
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              })}
              {path.nodes.map((n) => {
                const active = n.id === node.id;
                const c = SEV_META[n.sev].hex;
                return (
                  <g key={n.id} onClick={() => setSelNode(n.id)} className="cursor-pointer" style={{ transition: "opacity 0.2s" }} opacity={active || !selNode ? 1 : 0.82}>
                    <rect x={n.x} y={n.y} width={NW} height={NH} rx={4} fill={active ? "#171f28" : "#121920"} stroke={active ? "#2FD6B5" : c + "77"} strokeWidth={active ? 1.6 : 1} />
                    {active && <rect x={n.x - 4} y={n.y - 4} width={NW + 8} height={NH + 8} rx={6} fill="none" stroke="#2FD6B5" strokeOpacity="0.3" />}
                    <circle cx={n.x + 16} cy={n.y + 18} r="4" fill={c} />
                    {n.sev === "CRITICAL" && <circle cx={n.x + 16} cy={n.y + 18} r="8" fill="none" stroke={c} strokeOpacity="0.4">
                      <animate attributeName="r" values="5;11;5" dur="2.2s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite" />
                    </circle>}
                    <text x={n.x + 28} y={n.y + 22} fontSize="11.5" fill="#e9eef2" fontFamily="IBM Plex Mono" fontWeight="600">{n.label}</text>
                    <text x={n.x + 28} y={n.y + 39} fontSize="9" fill="#5d6c79" fontFamily="IBM Plex Mono">{n.sub}</text>
                    <text x={n.x + NW - 10} y={n.y + 22} textAnchor="end" fontSize="8.5" fill={c} fontFamily="IBM Plex Mono">{n.sev}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* node inspector */}
        <div className="panel rounded-md p-5 xl:sticky xl:top-24" key={node.id}>
          <div className="anim-fade-up">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-sm border flex items-center justify-center" style={{ borderColor: SEV_META[node.sev].hex + "55", background: SEV_META[node.sev].hex + "12", color: SEV_META[node.sev].hex }}>
                <Icon name={KIND_ICON[node.kind]} size={16} />
              </span>
              <div>
                <div className="font-mono text-[14px] text-ink">{node.label}</div>
                <div className="font-mono text-[10px] text-dim">{node.sub}</div>
              </div>
            </div>
            <div className="mt-4"><SevBadge sev={node.sev} /></div>
            <div className="mt-5">
              <div className="lbl mb-2">Risk</div>
              <p className="text-[13.5px] text-ink leading-relaxed">{node.risk}</p>
            </div>
            <div className="mt-5">
              <div className="lbl mb-2.5">Observed events</div>
              {node.events.map((e) => (
                <div key={e} className="flex gap-2.5 py-2 border-b border-edge/70 last:border-0">
                  <Icon name="activity" size={12} className="text-sig mt-0.5 shrink-0" />
                  <span className="font-mono text-[11px] text-mut leading-relaxed">{e}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="lbl mb-2.5">Permissions in scope</div>
              <div className="flex flex-wrap gap-1.5">
                {node.permissions.map((p) => <span key={p} className="font-mono text-[10px] px-2 py-1 rounded-sm border border-edge2 text-mut bg-panel2">{p}</span>)}
              </div>
            </div>
            <div className="mt-4">
              <div className="lbl mb-2.5">Related alerts</div>
              <div className="flex flex-wrap gap-1.5">
                {node.related.map((r) => (
                  <button key={r} onClick={() => go("threats", { threatId: r })} className="font-mono text-[10.5px] px-2 py-1 rounded-sm border border-crit/40 text-crit bg-crit/8 hover:bg-crit/20 transition-colors">{r}</button>
                ))}
              </div>
            </div>
            <button onClick={() => go("incidents", { incidentId: path.incident })} className="mt-6 w-full font-mono text-[10.5px] uppercase tracking-[0.14em] text-sig hover:bg-sig/5 border border-sig/30 rounded-sm py-2.5 transition-colors inline-flex items-center justify-center gap-2">
              Open incident {path.incident} <Icon name="arrowRight" size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
