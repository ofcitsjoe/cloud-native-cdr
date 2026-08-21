import React, { useEffect, useRef, useState } from "react";
import { SEV_META, Severity } from "../data/securityData";

/* ------------------------------- gauge -------------------------------- */

export function Gauge({ value, size = 190, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const sweep = 0.75; // 270°
  const [drawn, setDrawn] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setDrawn(value);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  const off = c * sweep * (1 - drawn / 100);
  const color = value >= 80 ? "#2FD6B5" : value >= 60 ? "#FFCE5C" : "#FF9838";
  return (
    <div ref={ref} className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[225deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c2630" strokeWidth="7" strokeDasharray={`${c * sweep} ${c}`} strokeLinecap="round" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${c * sweep} ${c}`} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.3,0.6,0.2,1) 0.2s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-disp font-bold leading-none" style={{ fontSize: size * 0.24, color }}>{Math.round(drawn)}</span>
        <span className="lbl mt-2">{label ?? "Security score"}</span>
      </div>
    </div>
  );
}

/* --------------------------- stacked area ----------------------------- */

export function StackedArea({ data, height = 210 }: { data: { d: string; critical: number; high: number; medium: number; low: number }[]; height?: number }) {
  const W = 580;
  const H = height;
  const padL = 26, padR = 8, padT = 10, padB = 24;
  type BandKey = "low" | "medium" | "high" | "critical";
  const bands: BandKey[] = ["low", "medium", "high", "critical"]; // bottom → top
  const max = Math.max(...data.map((p) => p.critical + p.high + p.medium + p.low)) * 1.15;
  const x = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const cum: number[][] = data.map(() => [0, 0, 0, 0]);
  data.forEach((p, i) => {
    cum[i][0] = 0;
    cum[i][1] = p.low;
    cum[i][2] = p.low + p.medium;
    cum[i][3] = p.low + p.medium + p.high;
  });
  const layers = bands.map((b, bi) => {
    const top = data.map((p, i) => cum[i][bi] + p[b]);
    const below = data.map((_, i) => cum[i][bi]);
    const line = top.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const bottomLine = [...below].reverse().map((v, i) => `${x(data.length - 1 - i)},${y(v)}`).join(" ");
    return { b, sev: b.toUpperCase() as Severity, line, poly: `${line} ${bottomLine}` };
  });
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={on ? "chart-on" : ""}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)} stroke="#1c2630" strokeWidth="1" strokeDasharray="2 5" />
        ))}
        {layers.map((l) => (
          <g key={l.b} style={{ opacity: on ? 1 : 0, transition: "opacity 0.8s ease 0.2s" }}>
            <polygon points={l.poly} fill={SEV_META[l.sev].hex} opacity="0.16" />
            <polyline points={l.line} fill="none" stroke={SEV_META[l.sev].hex} strokeWidth="1.6" className="chart-line" />
          </g>
        ))}
        {data.map((p, i) => (i % 2 === 0 ? <text key={p.d} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#5d6c79" fontFamily="IBM Plex Mono">{p.d}</text> : null))}
      </svg>
      <div className="flex flex-wrap gap-4 mt-2 px-1">
        {(["critical", "high", "medium", "low"] as const).map((b) => (
          <span key={b} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mut">
            <span className="w-2 h-2 rounded-sm" style={{ background: SEV_META[b.toUpperCase() as Severity].hex }} />
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ trend line ---------------------------- */

export function TrendLine({ points, height = 130, color = "#2FD6B5", suffix = "" }: { points: number[]; height?: number; color?: string; suffix?: string }) {
  const W = 560;
  const H = height;
  const padL = 8, padR = 8, padT = 12, padB = 16;
  const min = Math.min(...points) - 4;
  const max = Math.max(...points) + 4;
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const line = points.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${padL},${H - padB} ${line} ${W - padR},${H - padB}`;
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const gid = React.useId();
  return (
    <div ref={ref} className={on ? "chart-on" : ""}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gid})`} style={{ opacity: on ? 1 : 0, transition: "opacity 1s ease 0.5s" }} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2" className="chart-line" />
        <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="3.5" fill={color} style={{ opacity: on ? 1 : 0, transition: "opacity 0.4s ease 1.4s" }} />
        <text x={x(points.length - 1) - 8} y={y(points[points.length - 1]) - 10} textAnchor="end" fontSize="11" fill={color} fontFamily="IBM Plex Mono" style={{ opacity: on ? 1 : 0, transition: "opacity 0.4s ease 1.4s" }}>
          {points[points.length - 1]}{suffix}
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------ h-bars -------------------------------- */

export function HBars({ items, maxOverride }: { items: { label: string; value: number; color: string; sub?: string }[]; maxOverride?: number }) {
  const max = maxOverride ?? Math.max(...items.map((i) => i.value));
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={on ? "chart-on" : ""} >
      {items.map((it, i) => (
        <div key={it.label} className="mb-3 last:mb-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[12.5px] text-ink">{it.label}</span>
            <span className="font-mono text-[11px] text-mut">{it.value}{it.sub ? ` ${it.sub}` : ""}</span>
          </div>
          <div className="h-[5px] bg-panel3 rounded-full overflow-hidden">
            <div className="bar-grow h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: it.color, transitionDelay: `${0.15 + i * 0.08}s` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- sparkline ------------------------------ */

export function Sparkline({ points, color = "#2FD6B5", w = 84, h = 26 }: { points: number[]; color?: string; w?: number; h?: number }) {
  const min = Math.min(...points), max = Math.max(...points);
  const x = (i: number) => (i / (points.length - 1)) * (w - 4) + 2;
  const y = (v: number) => 3 + (1 - (v - min) / (max - min || 1)) * (h - 6);
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth="1.4" opacity="0.9" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="2" fill={color} />
    </svg>
  );
}
