import React, { useEffect, useState } from "react";
import { Icon, Wordmark } from "../components/icons";
import { Btn, CountUp, Reveal, SectionKicker, SevDot } from "../components/ui";
import { ALERTS, HERO_STATS, RESOURCES, SEV_META, Severity } from "../data/securityData";
import type { View } from "../store";

const IMG_DC = "https://image.qwenlm.ai/generated-images/339cd69a-dac9-4168-9537-f2c23180b485/_result.png";
const IMG_RACK = "https://image.qwenlm.ai/generated-images/a176eebb-2a0b-42cf-abde-c047863b1876/_result.png";

/* ============================== hero visual ============================= */

function HeroVisual() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 2400);
    return () => clearInterval(t);
  }, []);
  const rows = [0, 1, 2].map((i) => ALERTS[(tick + i) % 6]);

  const node = (x: number, y: number, label: string, sub: string, sev?: Severity, w = 118) => (
    <g key={label + x + y}>
      <rect x={x} y={y} width={w} height={44} rx={3} fill="#121920" stroke={sev ? SEV_META[sev].hex + "88" : "#2a3642"} strokeWidth="1" />
      <text x={x + 10} y={y + 19} fontSize="10.5" fill="#e9eef2" fontFamily="IBM Plex Mono" fontWeight="600">{label}</text>
      <text x={x + 10} y={y + 33} fontSize="8.5" fill="#5d6c79" fontFamily="IBM Plex Mono">{sub}</text>
      {sev && <circle cx={x + w - 12} cy={y + 12} r="3.5" fill={SEV_META[sev].hex} />}
    </g>
  );

  return (
    <div className="relative panel rounded-md overflow-hidden gridbg-fine">
      <div className="scanline" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
        <span className="lbl">Live topology · us-east-1</span>
        <span className="lbl flex items-center gap-2 text-crit"><span className="w-1.5 h-1.5 rounded-full bg-crit blink-rec" />Rec · simulated</span>
      </div>
      <svg viewBox="0 0 560 330" className="w-full h-auto block">
        <defs>
          <radialGradient id="hv-radar" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2FD6B5" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#2FD6B5" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* radar */}
        <g>
          <circle cx="452" cy="76" r="58" fill="url(#hv-radar)" />
          <circle cx="452" cy="76" r="58" fill="none" stroke="#1c2630" />
          <circle cx="452" cy="76" r="38" fill="none" stroke="#1c2630" />
          <circle cx="452" cy="76" r="18" fill="none" stroke="#1c2630" />
          <g className="radar-sweep" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <path d="M452 76 L452 18 A58 58 0 0 1 492 34 Z" fill="#2FD6B5" opacity="0.18" />
            <line x1="452" y1="76" x2="452" y2="18" stroke="#2FD6B5" strokeWidth="1.2" opacity="0.7" />
          </g>
          <circle cx="430" cy="58" r="3" fill="#FF5D55" />
          <circle cx="470" cy="92" r="2.4" fill="#FF9838" />
          <circle cx="446" cy="100" r="2" fill="#FFCE5C" />
        </g>
        {/* benign edges */}
        <path d="M96 82 C 150 82 160 165 214 165" fill="none" stroke="#2a3642" strokeWidth="1.2" />
        <path d="M332 165 C 380 165 380 96 428 96" fill="none" stroke="#2a3642" strokeWidth="1.2" className="flow-dash-slow" strokeDasharray="3 9" />
        <path d="M332 165 C 380 165 380 235 428 235" fill="none" stroke="#2a3642" strokeWidth="1.2" className="flow-dash-slow" strokeDasharray="3 9" />
        <path d="M332 165 C 360 165 360 165 428 165" fill="none" stroke="#2a3642" strokeWidth="1.2" className="flow-dash-slow" strokeDasharray="3 9" />
        {/* threat path */}
        <path d="M96 262 C 160 262 150 190 214 187" fill="none" stroke="#FF5D55" strokeWidth="1.4" opacity="0.85" className="flow-dash" />
        <path d="M332 187 C 385 200 390 250 428 257" fill="none" stroke="#FF5D55" strokeWidth="1.4" opacity="0.85" className="flow-dash" />
        <text x="120" y="240" fontSize="8.5" fill="#FF5D55" fontFamily="IBM Plex Mono">TOR egress</text>
        <text x="346" y="230" fontSize="8.5" fill="#FF5D55" fontFamily="IBM Plex Mono">SQL 6.4× baseline</text>
        {/* nodes */}
        {node(30, 60, "prod-nlb", "public · 443")}
        {node(30, 240, "attacker", "185.220.101.34", "CRITICAL")}
        {node(214, 143, "prod-eks-core", "6 nodes · 41 pods", "HIGH")}
        {node(428, 74, "checkout-api", "replica 1/6", "CRITICAL")}
        {node(428, 143, "payments-worker", "replica 3/3")}
        {node(428, 213, "postgres", "payments db", "CRITICAL")}
        {node(214, 252, "svc-deploy", "IAM · compromised", "CRITICAL")}
      </svg>
      <div className="border-t border-edge px-4 py-3 space-y-2 min-h-[104px]">
        {rows.map((a, i) => (
          <div key={a.id + "-" + tick} className="flex items-center gap-3 anim-fade-up" style={{ animationDelay: `${i * 90}ms`, opacity: i === 2 ? 0.45 : 1 }}>
            <SevDot sev={a.severity} pulse={i === 0} />
            <span className="font-mono text-[10.5px] text-mut truncate flex-1">{a.name}</span>
            <span className="lbl">{a.resource}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================== sections =============================== */

function TickerStrip() {
  const items = ["Impossible travel", "TOR exit egress", "Secrets enumeration", "Privilege escalation", "Crypto-mining", "Brute force", "Data exfiltration", "Lateral movement", "IAM abuse", "Anomalous egress", "K8s exec abuse", "Credential stuffing"];
  const row = items.map((t) => (
    <span key={t} className="inline-flex items-center gap-6 mx-6 font-mono text-[11px] uppercase tracking-[0.2em] text-dim whitespace-nowrap">
      {t} <span className="text-sig/60">//</span>
    </span>
  ));
  return (
    <div className="border-y border-edge py-3.5 overflow-hidden bg-panel/40">
      <div className="marquee-track inline-flex whitespace-nowrap">{row}{row}</div>
    </div>
  );
}

function StatementPipeline() {
  const stages = [
    { k: "Telemetry", v: "1.9M ev/day" },
    { k: "Detection", v: "214 rules" },
    { k: "Investigation", v: "auto-correlated" },
    { k: "Decision", v: "confidence-scored" },
    { k: "Response", v: "34s median" },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-28">
      <Reveal>
        <SectionKicker>// The pipeline</SectionKicker>
        <h2 className="font-disp font-bold text-3xl md:text-5xl leading-[1.08] max-w-3xl tracking-tight">
          From raw cloud telemetry to <span className="text-sig">verified</span> security decisions.
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <div className="mt-14 panel rounded-md p-6 md:p-8 gridbg-fine overflow-x-auto">
          <div className="flex items-stretch min-w-[760px]">
            {stages.map((s, i) => (
              <React.Fragment key={s.k}>
                <div className="flex-1">
                  <div className="border border-edge2 bg-panel2 rounded-sm px-4 py-4 h-full hover:border-sig/50 transition-colors duration-300 group">
                    <div className="font-mono text-[10px] text-dim mb-2">0{i + 1}</div>
                    <div className="font-disp font-semibold text-ink text-lg group-hover:text-sig transition-colors">{s.k}</div>
                    <div className="font-mono text-[10.5px] text-mut mt-1.5">{s.v}</div>
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <div className="flex items-center px-1.5">
                    <svg width="34" height="12"><line x1="0" y1="6" x2="34" y2="6" stroke="#2FD6B5" strokeWidth="1.2" className="flow-dash" opacity="0.7" /></svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Numbers() {
  const stats = [
    { v: HERO_STATS.events, label: "Events analyzed / 30d", decimals: 0 },
    { v: HERO_STATS.workloads, label: "Workloads monitored", decimals: 0 },
    { v: HERO_STATS.confidence, label: "Detection confidence", decimals: 1, suffix: "%" },
    { v: HERO_STATS.responseSec, label: "Median response time", suffix: "s" },
    { v: HERO_STATS.contained, label: "Threats contained YTD", decimals: 0 },
  ];
  return (
    <section className="border-y border-edge bg-abyss/60">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-12">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div>
                <div className="font-disp font-bold text-4xl md:text-[44px] leading-none tracking-tight text-ink">
                  <CountUp to={s.v} decimals={s.decimals ?? 0} suffix={s.suffix ?? ""} />
                </div>
                <div className="lbl mt-3">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="lbl mt-12">Simulated environment · values are representative demo telemetry, not live infrastructure</p>
      </div>
    </section>
  );
}

function LoopVisual({ stage }: { stage: number }) {
  if (stage === 0)
    return (
      <svg viewBox="0 0 220 90" className="w-full h-auto">
        {["cloudtrail", "vpc flow", "k8s audit", "okta"].map((s, i) => (
          <g key={s}>
            <text x="0" y={14 + i * 20} fontSize="9" fill="#5d6c79" fontFamily="IBM Plex Mono">{s}</text>
            <line x1="78" y1={10 + i * 20} x2="150" y2="45" stroke="#2a3642" className="flow-dash-slow" strokeDasharray="2 6" />
          </g>
        ))}
        <rect x="150" y="30" width="62" height="30" rx="3" fill="#121920" stroke="#2FD6B5" strokeOpacity="0.5" />
        <text x="181" y="49" fontSize="9" fill="#2FD6B5" fontFamily="IBM Plex Mono" textAnchor="middle">ingest</text>
      </svg>
    );
  if (stage === 1)
    return (
      <svg viewBox="0 0 220 90" className="w-full h-auto">
        <polyline points="0,62 24,58 44,64 66,52 88,56 104,30 118,18 132,40 156,50 180,46 220,52" fill="none" stroke="#2FD6B5" strokeWidth="1.6" />
        <circle cx="118" cy="18" r="5" fill="none" stroke="#FF5D55" strokeWidth="1.4" />
        <circle cx="118" cy="18" r="10" fill="none" stroke="#FF5D55" strokeWidth="1" opacity="0.4" />
        <text x="130" y="16" fontSize="9" fill="#FF5D55" fontFamily="IBM Plex Mono">3σ breach</text>
        <line x1="0" y1="72" x2="220" y2="72" stroke="#2a3642" strokeDasharray="3 5" />
        <text x="0" y="84" fontSize="8.5" fill="#5d6c79" fontFamily="IBM Plex Mono">baseline · 90d rolling</text>
      </svg>
    );
  if (stage === 2)
    return (
      <svg viewBox="0 0 220 90" className="w-full h-auto">
        {[["34", "30"], ["96", "16"], ["150", "42"], ["96", "66"], ["190", "20"], ["196", "62"]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i === 2 ? 7 : 5} fill="#121920" stroke={i === 2 ? "#FF5D55" : "#2FD6B5"} strokeWidth="1.3" />
        ))}
        <line x1="34" y1="30" x2="96" y2="16" stroke="#2a3642" />
        <line x1="96" y1="16" x2="150" y2="42" stroke="#2a3642" />
        <line x1="150" y1="42" x2="96" y2="66" stroke="#FF5D55" strokeOpacity="0.7" className="flow-dash" />
        <line x1="150" y1="42" x2="190" y2="20" stroke="#FF5D55" strokeOpacity="0.7" className="flow-dash" />
        <line x1="150" y1="42" x2="196" y2="62" stroke="#2a3642" />
        <text x="130" y="84" fontSize="8.5" fill="#5d6c79" fontFamily="IBM Plex Mono">14 events → 1 incident</text>
      </svg>
    );
  return (
    <svg viewBox="0 0 220 90" className="w-full h-auto">
      <rect x="24" y="22" width="66" height="46" rx="3" fill="#121920" stroke="#2a3642" />
      <text x="57" y="42" fontSize="9" fill="#8fa0ae" fontFamily="IBM Plex Mono" textAnchor="middle">workload</text>
      <text x="57" y="56" fontSize="8" fill="#5d6c79" fontFamily="IBM Plex Mono" textAnchor="middle">quarantined</text>
      <rect x="128" y="22" width="66" height="46" rx="3" fill="#121920" stroke="#2FD6B5" strokeOpacity="0.6" />
      <text x="161" y="42" fontSize="9" fill="#2FD6B5" fontFamily="IBM Plex Mono" textAnchor="middle">clean replica</text>
      <text x="161" y="56" fontSize="8" fill="#5d6c79" fontFamily="IBM Plex Mono" textAnchor="middle">scheduled</text>
      <line x1="92" y1="45" x2="126" y2="45" stroke="#2FD6B5" strokeWidth="1.4" className="flow-dash" />
      <path d="M16 30v30M16 30l-5 6M16 30l5 6" stroke="#FF5D55" strokeWidth="1.3" opacity="0.8" transform="rotate(180 16 45)" />
    </svg>
  );
}

function SecurityLoop() {
  const stages = [
    { n: "01", t: "Collect", d: "Cloud events, identity activity, network telemetry and workload behavior — normalized into one investigation surface." },
    { n: "02", t: "Detect", d: "Rules, behavioral baselines and threat intelligence identify suspicious behavior with a calibrated confidence score." },
    { n: "03", t: "Investigate", d: "Related events are correlated into incidents and attack paths, so analysts see the campaign — not the noise." },
    { n: "04", t: "Respond", d: "Recommended or automated containment actions stop threats in seconds, with a full audit trail." },
  ];
  return (
    <section id="method" className="max-w-6xl mx-auto px-6 py-28">
      <Reveal>
        <SectionKicker>// The security loop</SectionKicker>
        <h2 className="font-disp font-bold text-3xl md:text-5xl leading-[1.08] max-w-2xl tracking-tight">Detection is only the beginning.</h2>
      </Reveal>
      <div className="mt-16">
        {stages.map((s, i) => (
          <Reveal key={s.n} delay={i * 60}>
            <div className={`grid md:grid-cols-[150px_1fr_300px] gap-6 md:gap-10 items-center py-10 border-t border-edge group hover:bg-panel/40 transition-colors duration-300 px-2 -mx-2 ${i === stages.length - 1 ? "border-b" : ""}`}>
              <div className="font-disp font-bold text-6xl md:text-7xl text-edge2 group-hover:text-sig/70 transition-colors duration-500 leading-none">{s.n}</div>
              <div>
                <div className="font-disp font-semibold text-2xl md:text-3xl tracking-tight mb-3">{s.t.toUpperCase()}</div>
                <p className="text-mut max-w-lg text-[15px] leading-relaxed">{s.d}</p>
              </div>
              <div className="panel rounded-sm p-4 gridbg-fine"><LoopVisual stage={i} /></div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------- infrastructure visual ------------------------ */

const INFRA_NODES = [
  { id: "acct", label: "acme-prod", sub: "AWS account · 4 regions", sev: "HIGH" as Severity, risk: "1 compromised identity chain", events: ["AttachUserPolicy outside change window", "Root sign-in anomaly"], perms: ["Organizations read"], alerts: ["AL-3121", "AL-3112"] },
  { id: "vpc", label: "vpc-prod-use1", sub: "10.0.0.0/16 · 6 subnets", sev: "MEDIUM" as Severity, risk: "Lateral scanning observed", events: ["SYN scan across 61 hosts"], perms: ["—"], alerts: ["AL-3107"] },
  { id: "eks", label: "prod-eks-core", sub: "Kubernetes · 41 pods", sev: "HIGH" as Severity, risk: "Secrets enumeration in progress", events: ["14 secret calls in 90s", "Exec attempt denied"], perms: ["cluster-admin (break-glass)"], alerts: ["AL-3126"] },
  { id: "pod", label: "checkout-api-7d9f4b", sub: "Pod · payments namespace", sev: "CRITICAL" as Severity, risk: "Active compromise — quarantined", events: ["TOR egress 47s", "DGA-like DNS lookups"], perms: ["IRSA checkout-sa"], alerts: ["AL-3127"] },
  { id: "app", label: "checkout-service", sub: "App tier · v2.14.1", sev: "MEDIUM" as Severity, risk: "Runs with compromised SA token", events: ["Token lifetime extended to 12h"], perms: ["payments API write"], alerts: ["AL-3126"] },
  { id: "db", label: "prod-postgres-payments", sub: "RDS · PCI scope", sev: "CRITICAL" as Severity, risk: "Probable attack objective", events: ["card_tokens SELECT · 48k rows"], perms: ["db:select"], alerts: ["AL-3126"] },
];

function InfraSection() {
  const [sel, setSel] = useState("pod");
  const node = INFRA_NODES.find((n) => n.id === sel)!;
  return (
    <section id="infrastructure" className="border-t border-edge bg-abyss/50">
      <div className="max-w-6xl mx-auto px-6 py-28">
        <Reveal>
          <SectionKicker>// Cloud visibility</SectionKicker>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-disp font-bold text-3xl md:text-5xl leading-[1.08] max-w-2xl tracking-tight">Every layer of the stack, scored.</h2>
            <p className="text-mut max-w-sm text-[15px]">Click any node to inspect its security state. Threat indicators map live to open alerts.</p>
          </div>
        </Reveal>
        <div className="mt-14 grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          <Reveal>
            <div className="panel rounded-md p-5">
              {INFRA_NODES.map((n, i) => (
                <React.Fragment key={n.id}>
                  <button
                    onClick={() => setSel(n.id)}
                    className={`w-full text-left border rounded-sm px-4 py-3.5 transition-all duration-200 flex items-center gap-3 ${sel === n.id ? "border-sig/60 bg-sig/5" : "border-edge hover:border-edge2 hover:bg-panel2"}`}
                  >
                    <SevDot sev={n.sev} pulse={n.sev === "CRITICAL"} />
                    <span className="flex-1">
                      <span className="block font-mono text-[13px] text-ink">{n.label}</span>
                      <span className="block font-mono text-[10px] text-dim mt-0.5">{n.sub}</span>
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: SEV_META[n.sev].hex }}>{n.sev}</span>
                  </button>
                  {i < INFRA_NODES.length - 1 && <div className="w-px h-5 bg-edge2 ml-8" />}
                </React.Fragment>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="panel rounded-md p-6 md:p-8 gridbg-fine min-h-[420px]" key={node.id}>
              <div className="anim-fade-up">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="font-mono text-lg text-ink">{node.label}</div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] px-2.5 py-1 rounded-sm border" style={{ color: SEV_META[node.sev].hex, borderColor: SEV_META[node.sev].hex + "55", background: SEV_META[node.sev].hex + "12" }}>{node.sev}</span>
                </div>
                <div className="font-mono text-[11px] text-dim mt-1">{node.sub}</div>
                <div className="mt-6">
                  <div className="lbl mb-2">Risk assessment</div>
                  <p className="text-ink text-[15px]">{node.risk}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 mt-7">
                  <div>
                    <div className="lbl mb-3">Observed events</div>
                    {node.events.map((e) => (
                      <div key={e} className="flex gap-2.5 items-start py-2 border-b border-edge/70 last:border-0">
                        <Icon name="activity" size={13} className="text-sig mt-0.5 shrink-0" />
                        <span className="font-mono text-[11.5px] text-mut leading-relaxed">{e}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="lbl mb-3">Permissions in scope</div>
                    {node.perms.map((p) => (
                      <div key={p} className="flex gap-2.5 items-start py-2 border-b border-edge/70 last:border-0">
                        <Icon name="key" size={13} className="text-med mt-0.5 shrink-0" />
                        <span className="font-mono text-[11.5px] text-mut">{p}</span>
                      </div>
                    ))}
                    <div className="lbl mt-5 mb-3">Related alerts</div>
                    <div className="flex flex-wrap gap-2">
                      {node.alerts.map((a) => (
                        <span key={a} className="font-mono text-[10.5px] px-2 py-1 rounded-sm border border-crit/40 text-crit bg-crit/8">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ features -------------------------------- */

function FeatureRow({ kicker, title, copy, visual, points, flip = false, onDemo }: {
  kicker: string; title: string; copy: string; visual: React.ReactNode; points: string[]; flip?: boolean; onDemo?: () => void;
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center py-20 border-t border-edge ${flip ? "" : ""}`}>
      <Reveal className={flip ? "lg:order-2" : ""}>
        <div>
          <div className="lbl text-sig mb-4">{kicker}</div>
          <h3 className="font-disp font-bold text-2xl md:text-4xl tracking-tight leading-[1.1]">{title}</h3>
          <p className="text-mut text-[15px] leading-relaxed mt-5 max-w-md">{copy}</p>
          <ul className="mt-7 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[14px] text-ink">
                <Icon name="check" size={14} className="text-sig mt-1 shrink-0" />{p}
              </li>
            ))}
          </ul>
          {onDemo && (
            <div className="mt-8">
              <Btn variant="line" onClick={onDemo}>Open in console <Icon name="arrowRight" size={13} /></Btn>
            </div>
          )}
        </div>
      </Reveal>
      <Reveal delay={140} className={flip ? "lg:order-1" : ""}>{visual}</Reveal>
    </div>
  );
}

function VisualDetection() {
  return (
    <div className="panel rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-edge flex justify-between"><span className="lbl">Detection stream</span><span className="lbl text-sig">214 active rules</span></div>
      {ALERTS.slice(0, 4).map((a) => (
        <div key={a.id} className="px-4 py-3.5 border-b border-edge/70 last:border-0 hover:bg-panel2 transition-colors flex items-center gap-3">
          <SevDot sev={a.severity} pulse={a.severity === "CRITICAL"} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-ink truncate">{a.name}</div>
            <div className="font-mono text-[10px] text-dim mt-0.5">{a.rule} · confidence {a.confidence}%</div>
          </div>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: SEV_META[a.severity].hex }}>{a.severity}</span>
        </div>
      ))}
    </div>
  );
}

function VisualGraph() {
  return (
    <div className="panel rounded-md p-5 gridbg-fine">
      <svg viewBox="0 0 420 220" className="w-full h-auto">
        {[["20", "100", "Attacker", "#FF5D55"], ["130", "40", "svc-deploy", "#FF5D55"], ["130", "160", "ci-runner", "#FF9838"], ["240", "100", "EKS API", "#FF9838"], ["340", "60", "pod", "#FF5D55"], ["340", "150", "postgres", "#FF5D55"]].map(([x, y, l, c]) => (
          <g key={l as string}>
            <rect x={Number(x)} y={Number(y) - 16} width="86" height="32" rx="3" fill="#121920" stroke={c as string} strokeOpacity="0.6" />
            <text x={Number(x) + 43} y={Number(y) + 4} fontSize="10" fill="#e9eef2" fontFamily="IBM Plex Mono" textAnchor="middle">{l}</text>
          </g>
        ))}
        <line x1="106" y1="100" x2="130" y2="50" stroke="#FF5D55" className="flow-dash" opacity="0.8" />
        <line x1="106" y1="100" x2="130" y2="152" stroke="#FF9838" className="flow-dash" opacity="0.7" />
        <line x1="216" y1="44" x2="240" y2="92" stroke="#FF5D55" className="flow-dash" opacity="0.8" />
        <line x1="216" y1="156" x2="240" y2="112" stroke="#FF9838" className="flow-dash" opacity="0.7" />
        <line x1="326" y1="96" x2="340" y2="66" stroke="#FF5D55" className="flow-dash" opacity="0.8" />
        <line x1="326" y1="106" x2="340" y2="142" stroke="#FF5D55" className="flow-dash" opacity="0.8" />
      </svg>
      <div className="flex justify-between mt-2"><span className="lbl">INC-2214 · 6 nodes · 6 edges</span><span className="lbl text-crit">critical path</span></div>
    </div>
  );
}

function VisualResponse() {
  const [armed, setArmed] = useState(true);
  return (
    <div className="panel rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-edge flex justify-between"><span className="lbl">Response engine</span><span className="lbl text-sig">4 playbooks armed</span></div>
      <div className="px-4 py-4 space-y-3">
        {[
          { a: "Quarantine pod network namespace", t: "checkout-api-7d9f4b", s: "EXECUTED · 34s", ok: true },
          { a: "Block egress ASN at bucket policy", t: "finance-exports", s: "EXECUTED · 12s", ok: true },
          { a: "Rotate access key •••Q7F2", t: "svc-deploy", s: "AWAITING APPROVAL", ok: false },
        ].map((x) => (
          <div key={x.a} className="border border-edge rounded-sm px-4 py-3 flex items-center gap-3">
            <Icon name={x.ok ? "check" : "clock"} size={14} className={x.ok ? "text-sig" : "text-med"} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-ink truncate">{x.a}</div>
              <div className="font-mono text-[10px] text-dim mt-0.5">{x.t} · {x.s}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3.5 border-t border-edge flex items-center justify-between bg-panel2/60">
        <div>
          <div className="text-[13px] text-ink">Auto-isolate critical workloads</div>
          <div className="font-mono text-[10px] text-dim mt-0.5">{armed ? "Armed — 14 automatic quarantines YTD" : "Disarmed — manual approval only"}</div>
        </div>
        <button onClick={() => setArmed(!armed)} className={`relative w-10 h-[22px] rounded-full transition-colors ${armed ? "bg-sig/80" : "bg-edge2"}`} aria-label="Toggle automation">
          <span className={`absolute top-[3px] w-4 h-4 rounded-full transition-all ${armed ? "left-[21px] bg-abyss" : "left-[3px] bg-ink"}`} />
        </button>
      </div>
    </div>
  );
}

function VisualVisibility() {
  const rows = RESOURCES.slice(0, 5);
  return (
    <div className="panel rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-edge flex justify-between"><span className="lbl">Resource inventory</span><span className="lbl">18,421 workloads</span></div>
      {rows.map((r) => (
        <div key={r.id} className="px-4 py-3 border-b border-edge/70 last:border-0 grid grid-cols-[1fr_90px_70px] items-center gap-3 hover:bg-panel2 transition-colors">
          <div className="min-w-0">
            <div className="font-mono text-[12px] text-ink truncate">{r.name}</div>
            <div className="font-mono text-[10px] text-dim">{r.type} · {r.region}</div>
          </div>
          <div className="h-[4px] bg-panel3 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: r.score < 60 ? "#FF5D55" : r.score < 75 ? "#FFCE5C" : "#2FD6B5" }} />
          </div>
          <div className="font-mono text-[11px] text-right" style={{ color: r.score < 60 ? "#FF5D55" : r.score < 75 ? "#FFCE5C" : "#2FD6B5" }}>{r.score}</div>
        </div>
      ))}
    </div>
  );
}

function VisualAnalyst() {
  const [typed, setTyped] = useState("");
  const answer = "Three critical signals are active: TOR egress from checkout-api, impossible travel on svc-deploy, and 6.4× query volume on the payments DB. They correlate into INC-2214 — I recommend isolating the pod first.";
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setTyped(answer.slice(0, i));
      if (i >= answer.length) clearInterval(t);
    }, 24);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="panel rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-edge flex justify-between"><span className="lbl">AI security analyst</span><span className="lbl text-sig">grounded in your telemetry</span></div>
      <div className="px-4 py-5 space-y-4">
        <div className="flex justify-end"><div className="max-w-[80%] border border-edge2 rounded-sm px-3.5 py-2.5 text-[13px] text-ink">What needs my attention right now?</div></div>
        <div className="flex justify-start">
          <div className="max-w-[88%] border border-sig/30 bg-sig/5 rounded-sm px-3.5 py-2.5 text-[13px] text-ink leading-relaxed font-mono">
            {typed}<span className="caret text-sig">▍</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ case study ------------------------------ */

function CaseStudy({ onEnter }: { onEnter: (v?: View) => void }) {
  const steps = ["Attack detected", "Identity investigated", "Container isolated", "Credentials revoked", "Incident resolved"];
  return (
    <section id="evidence" className="relative border-y border-edge overflow-hidden">
      <img src={IMG_DC} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-r from-abyss via-abyss/90 to-abyss/70" />
      <div className="relative max-w-6xl mx-auto px-6 py-28">
        <Reveal>
          <SectionKicker>// Field evidence</SectionKicker>
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-14 items-start">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-crit mb-4">Case file · production cluster</div>
              <h2 className="font-disp font-bold text-3xl md:text-5xl leading-[1.06] tracking-tight">Kubernetes credential compromise.</h2>
              <p className="text-mut text-[15px] leading-relaxed mt-6 max-w-xl">
                A hijacked CI identity escalated to administrator, moved into the payments namespace and began
                enumerating secrets. SENTINEL-X correlated 12 suspicious events into one incident and contained
                the workload before the database was touched.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10">
                {[
                  { v: 12, l: "Events correlated", s: "" },
                  { v: 42, l: "Seconds to containment", s: "s" },
                  { v: 0, l: "Records exfiltrated", s: "" },
                  { v: 100, l: "Keys rotated", s: "%" },
                ].map((m) => (
                  <div key={m.l}>
                    <div className="font-disp font-bold text-3xl md:text-4xl text-sig"><CountUp to={m.v} suffix={m.s} /></div>
                    <div className="lbl mt-2">{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-md p-6 backdrop-blur-sm">
              <div className="lbl mb-5">Incident timeline</div>
              {steps.map((s, i) => (
                <Reveal key={s} delay={i * 130}>
                  <div className="flex gap-4 pb-6 last:pb-0 relative">
                    {i < steps.length - 1 && <div className="absolute left-[9px] top-6 bottom-0 w-px bg-edge2" />}
                    <div className="relative mt-0.5">
                      <span className="relative inline-flex w-[19px] h-[19px] rounded-full border-2 items-center justify-center" style={{ borderColor: i === 0 ? "#FF5D55" : "#2FD6B5", background: "#0a0d10" }}>
                        <span className="w-[7px] h-[7px] rounded-full" style={{ background: i === 0 ? "#FF5D55" : "#2FD6B5" }} />
                      </span>
                    </div>
                    <div>
                      <div className="text-[14px] text-ink font-medium">{s}</div>
                      <div className="font-mono text-[10.5px] text-dim mt-1">
                        {["T+0s · rule NET-EGRESS-TOR-01 fires", "T+6s · identity chain mapped across 3 accounts", "T+34s · pod quarantined by response engine", "T+51s · IRSA + access keys revoked", "T+4m · clean replica scheduled, post-mortem opened"][i]}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
              <div className="mt-6 pt-5 border-t border-edge">
                <Btn variant="solid" onClick={() => onEnter("incidents")}>Read the full incident <Icon name="arrowRight" size={13} /></Btn>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------- page --------------------------------- */

export default function Landing({ onEnter }: { onEnter: (v?: View) => void }) {
  return (
    <div className="min-h-screen bg-base vignette">
      {/* nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-edge/70 bg-base/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Wordmark />
          <nav className="hidden md:flex items-center gap-7 font-mono text-[11px] uppercase tracking-[0.18em] text-mut">
            <a href="#method" className="hover:text-sig transition-colors">Method</a>
            <a href="#infrastructure" className="hover:text-sig transition-colors">Visibility</a>
            <a href="#platform" className="hover:text-sig transition-colors">Platform</a>
            <a href="#evidence" className="hover:text-sig transition-colors">Evidence</a>
          </nav>
          <Btn variant="solid" onClick={() => onEnter()}>Open console <Icon name="arrowUpRight" size={13} /></Btn>
        </div>
      </header>

      {/* hero */}
      <section className="gridbg relative overflow-hidden pt-16">
        <div className="vignette absolute inset-0 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
          <div>
            <Reveal>
              <div className="lbl text-sig mb-6 flex items-center gap-3">
                <span className="inline-flex items-center gap-2 border border-sig/30 bg-sig/5 rounded-sm px-2.5 py-1 normal-case tracking-[0.18em]">
                  <span className="relative inline-flex w-1.5 h-1.5"><span className="ping-dot absolute w-full h-full rounded-full text-sig" /><span className="relative w-1.5 h-1.5 rounded-full bg-sig" /></span>
                  CN-IDR · Cloud-native intrusion detection &amp; response
                </span>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="font-disp font-bold text-[42px] sm:text-6xl lg:text-[72px] leading-[0.98] tracking-[-0.02em]">
                See the threat<br />before it becomes<br /><span className="text-sig">the breach.</span>
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="text-mut text-[16px] md:text-lg leading-relaxed max-w-xl mt-8">
                SENTINEL-X continuously monitors cloud workloads, identifies anomalous behavior and contains
                threats before they spread — from first telemetry to verified decision in seconds.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div className="flex flex-wrap items-center gap-4 mt-10">
                <Btn variant="solid" onClick={() => onEnter("threats")}>Explore threats <Icon name="arrowRight" size={13} /></Btn>
                <Btn variant="line" onClick={() => document.getElementById("method")?.scrollIntoView({ behavior: "smooth" })}>View architecture</Btn>
              </div>
            </Reveal>
            <Reveal delay={330}>
              <div className="flex flex-wrap gap-x-8 gap-y-2 mt-12 font-mono text-[11px] text-dim">
                <span>AWS · Azure · GCP</span>
                <span>18,421 workloads</span>
                <span>simulated telemetry</span>
                <span className="text-sig">score 71 / 100</span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={200}><HeroVisual /></Reveal>
        </div>
        <TickerStrip />
      </section>

      <StatementPipeline />
      <Numbers />
      <SecurityLoop />
      <InfraSection />

      {/* feature deep-dives */}
      <section id="platform" className="max-w-6xl mx-auto px-6 pt-24">
        <Reveal>
          <SectionKicker>// Platform</SectionKicker>
          <h2 className="font-disp font-bold text-3xl md:text-5xl leading-[1.08] max-w-3xl tracking-tight">Built for the five minutes that matter.</h2>
        </Reveal>
        <div className="mt-4">
          <FeatureRow
            kicker="// Threat detection"
            title="Behavioral detection across every cloud workload."
            copy="Rules, anomaly baselines and threat intelligence run over identity, network and workload telemetry — each finding carries a confidence score, the triggering rule and a recommended next step."
            points={["214 detection rules with per-rule effectiveness tracking", "Confidence-scored findings, not raw event dumps", "TOR / C2 / scanner lists refreshed continuously"]}
            visual={<VisualDetection />}
            onDemo={() => onEnter("threats")}
          />
          <FeatureRow flip
            kicker="// Incident graph"
            title="Correlate events into attack paths."
            copy="Sixteen scattered events become one incident with a navigable path: who got in, what they touched, and where they were headed. Click any node for its full evidence."
            points={["Automatic correlation across accounts and clouds", "MITRE ATT&CK mapping per incident", "Node-level evidence: events, permissions, alerts"]}
            visual={<VisualGraph />}
            onDemo={() => onEnter("attackpath")}
          />
          <FeatureRow
            kicker="// Response engine"
            title="Contain in seconds, with a paper trail."
            copy="Isolate workloads, revoke credentials, block addresses. Dangerous actions demand explicit confirmation that states the target, the reason and the consequence."
            points={["Median 34s from detection to containment", "Destructive actions always require confirmation", "Every action lands in an immutable audit log"]}
            visual={<VisualResponse />}
            onDemo={() => onEnter("response")}
          />
          <FeatureRow flip
            kicker="// Cloud visibility"
            title="Understand every workload and identity."
            copy="A scored inventory of instances, clusters, containers, functions and identities — with vulnerabilities, open ports and live suspicion signals on each resource."
            points={["Per-resource security score with trend", "Open ports, identities and recent activity in one view", "Filter by provider, region, environment, severity"]}
            visual={<VisualVisibility />}
            onDemo={() => onEnter("infrastructure")}
          />
          <FeatureRow
            kicker="// AI security analyst"
            title="Ask the environment what happened."
            copy="An analyst assistant grounded in the same telemetry you see — it explains why an alert fired, ranks what matters and drafts the response plan. Simulated data is labeled as such."
            points={["Answers cite the exact alerts, events and resources", "Distinguishes fact, inference and recommendation", "One click from question to containment action"]}
            visual={<VisualAnalyst />}
            onDemo={() => onEnter("overview")}
          />
        </div>
      </section>

      {/* evidence band */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="relative rounded-md overflow-hidden border border-edge">
            <img src={IMG_RACK} alt="Network infrastructure" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-panel via-panel/95 to-panel/80" />
            <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center p-8 md:p-12">
              <div>
                <div className="lbl text-sig mb-4">// Security outcomes</div>
                <h3 className="font-disp font-bold text-2xl md:text-4xl tracking-tight leading-tight max-w-xl">Breach paths mapped in seconds. Containment measured in the same unit.</h3>
                <p className="text-mut text-[15px] mt-4 max-w-xl">Every contained incident feeds back into baselines, rules and playbooks — the loop gets tighter with every attack it survives.</p>
              </div>
              <div className="flex flex-col gap-3 items-stretch md:items-end">
                <Btn variant="solid" onClick={() => onEnter()}>Enter the operations console <Icon name="arrowUpRight" size={13} /></Btn>
                <span className="lbl text-right">No cloud account required · demo telemetry</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <CaseStudy onEnter={onEnter} />

      {/* footer */}
      <footer className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <Wordmark />
            <p className="font-mono text-[11px] text-dim mt-4 max-w-sm leading-relaxed">
              Cloud-native intrusion detection &amp; response. All telemetry shown is simulated for demonstration —
              no real cloud accounts are accessed.
            </p>
          </div>
          <div className="flex gap-12 font-mono text-[11px] uppercase tracking-[0.16em] text-mut">
            <div className="space-y-3">
              <div className="lbl">Product</div>
              <a href="#platform" className="block hover:text-sig transition-colors">Platform</a>
              <a href="#method" className="block hover:text-sig transition-colors">Method</a>
              <a href="#evidence" className="block hover:text-sig transition-colors">Evidence</a>
            </div>
            <div className="space-y-3">
              <div className="lbl">Console</div>
              <button onClick={() => onEnter("overview")} className="block hover:text-sig transition-colors">Overview</button>
              <button onClick={() => onEnter("threats")} className="block hover:text-sig transition-colors">Threats</button>
              <button onClick={() => onEnter("response")} className="block hover:text-sig transition-colors">Response</button>
            </div>
          </div>
        </div>
        <div className="border-t border-edge mt-12 pt-6 flex flex-wrap justify-between gap-3 lbl">
          <span>© 2026 Sentinel-X Systems · portfolio demonstration</span>
          <span>build 4.2.1 · region eu-west-1 · latency 12ms</span>
        </div>
      </footer>
    </div>
  );
}
