import React, { useEffect, useRef, useState } from "react";
import { SEV_META, Severity, ALERT_STATUS_META, AlertStatus, INCIDENT_STATUS_META, IncidentStatus } from "../data/securityData";
import { Icon } from "./icons";

/* ------------------------------ severity ------------------------------ */

export function SevBadge({ sev, small = false }: { sev: Severity; small?: boolean }) {
  const m = SEV_META[sev];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium uppercase rounded-sm border ${small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"} tracking-[0.14em]`}
      style={{ color: m.hex, borderColor: m.hex + "55", background: m.hex + "14" }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: m.hex }} />
      {m.label}
    </span>
  );
}

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const m = ALERT_STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm border" style={{ color: m.hex, borderColor: m.hex + "44", background: m.hex + "10" }}>
      {m.label}
    </span>
  );
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const m = INCIDENT_STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm border" style={{ color: m.hex, borderColor: m.hex + "44", background: m.hex + "10" }}>
      {m.label}
    </span>
  );
}

export function SevDot({ sev, pulse = false }: { sev: Severity; pulse?: boolean }) {
  return (
    <span className="relative inline-flex w-2 h-2">
      {pulse && <span className="ping-dot absolute inline-flex w-full h-full rounded-full" style={{ color: SEV_META[sev].hex }} />}
      <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: SEV_META[sev].hex }} />
    </span>
  );
}

/* -------------------------------- buttons ----------------------------- */

export function Btn({ children, onClick, variant = "ghost", className = "", disabled = false, danger = false }: {
  children: React.ReactNode; onClick?: () => void; variant?: "solid" | "ghost" | "line" | "danger"; className?: string; disabled?: boolean; danger?: boolean;
}) {
  const base = "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-4 py-2.5 rounded-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none";
  const v =
    variant === "solid"
      ? "bg-sig text-abyss hover:brightness-110 active:scale-[0.98] font-semibold"
      : variant === "danger"
      ? "bg-crit/15 text-crit border border-crit/40 hover:bg-crit/25 active:scale-[0.98]"
      : variant === "line"
      ? "border border-edge2 text-ink hover:border-sig/60 hover:text-sig active:scale-[0.98]"
      : danger
      ? "text-crit hover:bg-crit/10 active:scale-[0.98]"
      : "text-mut hover:text-ink hover:bg-panel3 active:scale-[0.98]";
  return (
    <button className={`${base} ${v} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* --------------------------------- modal ------------------------------ */

export function Modal({ open, onClose, title, kicker, children, width = 560 }: {
  open: boolean; onClose: () => void; title: React.ReactNode; kicker?: string; children: React.ReactNode; width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-abyss/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="modal-in relative panel rounded-md w-full max-h-[86vh] overflow-y-auto" style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-edge">
          <div>
            {kicker && <div className="lbl mb-1.5">{kicker}</div>}
            <div className="font-disp font-semibold text-lg leading-tight">{title}</div>
          </div>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors p-1 -m-1" aria-label="Close dialog">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* --------------------------------- drawer ----------------------------- */

export function Drawer({ open, onClose, children, width = 520 }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-abyss/70" onClick={onClose} />
      <div className="drawer-in absolute right-0 top-0 bottom-0 panel border-l border-edge overflow-y-auto w-full" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------- toggle ----------------------------- */

export function Toggle({ on, onChange, disabled = false }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 disabled:opacity-40 ${on ? "bg-sig/80" : "bg-edge2"}`}
    >
      <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-ink transition-all duration-200 ${on ? "left-[21px] bg-abyss" : "left-[3px]"}`} />
    </button>
  );
}

/* ---------------------------- scroll reveal --------------------------- */

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            el.classList.add("on");
            io.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ------------------------------- count up ----------------------------- */

export function CountUp({ to, decimals = 0, prefix = "", suffix = "", duration = 1400, className = "" }: {
  to: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(to * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  const fmt = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-US");
  return (
    <span ref={ref} className={className}>
      {prefix}
      {fmt}
      {suffix}
    </span>
  );
}

/* ------------------------------ pagination ---------------------------- */

export function Pagination({ page, pages, onPage, total }: { page: number; pages: number; onPage: (p: number) => void; total: number }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <span className="lbl">
        Page {page} / {pages} · {total} events
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 text-mut hover:text-ink disabled:opacity-30 transition-colors" aria-label="Previous page">
          <Icon name="chevronLeft" size={16} />
        </button>
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onPage(i + 1)}
            className={`w-7 h-7 font-mono text-[11px] rounded-sm transition-colors ${page === i + 1 ? "bg-sig/15 text-sig border border-sig/40" : "text-dim hover:text-ink"}`}
          >
            {i + 1}
          </button>
        ))}
        <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages} className="p-1.5 text-mut hover:text-ink disabled:opacity-30 transition-colors" aria-label="Next page">
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ empty state --------------------------- */

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto w-12 h-12 rounded-full border border-edge2 flex items-center justify-center text-dim mb-4">
        <Icon name="search" size={20} />
      </div>
      <div className="font-disp font-semibold text-ink mb-1">{title}</div>
      <div className="text-sm text-dim max-w-sm mx-auto">{hint}</div>
    </div>
  );
}

/* --------------------------------- misc ------------------------------- */

export function KV({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-edge/60 last:border-0">
      <span className="lbl shrink-0">{k}</span>
      <span className={`text-right text-[13px] text-ink ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

export function RiskTag({ risk }: { risk: "safe" | "caution" | "dangerous" }) {
  const map = { safe: { c: "#2FD6B5", l: "Low risk" }, caution: { c: "#FFCE5C", l: "Review impact" }, dangerous: { c: "#FF5D55", l: "High impact" } };
  const m = map[risk];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm border" style={{ color: m.c, borderColor: m.c + "44", background: m.c + "10" }}>
      <Icon name={risk === "dangerous" ? "alertTriangle" : risk === "caution" ? "eye" : "check"} size={11} />
      {m.l}
    </span>
  );
}

export function SectionKicker({ children }: { children: React.ReactNode }) {
  return <div className="lbl text-sig mb-3 flex items-center gap-2"><span className="w-6 h-px bg-sig/50 inline-block" />{children}</div>;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
