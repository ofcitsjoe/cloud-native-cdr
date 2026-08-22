import React, { useState } from "react";
import { Icon, IconName, Wordmark } from "../components/icons";
import { useNow } from "../components/ui";
import { View, useStore } from "../store";

const NAV: { section: string; items: { id: View; label: string; icon: IconName; countKey?: "threats" | "novel" | "anomalies" }[] }[] = [
  {
    section: "Operations",
    items: [
      { id: "overview", label: "Overview", icon: "grid" },
      { id: "threats", label: "Threats", icon: "radar", countKey: "threats" },
      { id: "incidents", label: "Incidents", icon: "siren" },
      { id: "events", label: "Events", icon: "list" },
    ],
  },
  {
    section: "AI & Behavioral ML",
    items: [
      { id: "novel_threats", label: "Novel AI Threats", icon: "brain", countKey: "novel" },
      { id: "traffic_anomalies", label: "Traffic Anomalies", icon: "waveform", countKey: "anomalies" },
    ],
  },
  {
    section: "Context & Graph",
    items: [
      { id: "infrastructure", label: "Infrastructure", icon: "server" },
      { id: "attackpath", label: "Attack paths", icon: "route" },
    ],
  },
  {
    section: "Automations",
    items: [
      { id: "response", label: "Response", icon: "zap" },
      { id: "rules", label: "Rules", icon: "terminal" },
    ],
  },
];

const VIEW_META: Record<View, { title: string; desc: string }> = {
  overview: { title: "Security overview", desc: "Posture, active threats and operational tempo across all connected clouds." },
  threats: { title: "Threat detection", desc: "Every detection with rule, confidence, evidence and recommended action." },
  novel_threats: { title: "Novel attack & zero-day engine", desc: "AI-driven identification of composite attacks using known MITRE TTP permutations." },
  traffic_anomalies: { title: "Traffic flow baseline & anomaly center", desc: "Statistical 3-sigma outlier detection, C2 beaconing analysis and flow telemetry." },
  incidents: { title: "Incident investigation", desc: "Correlated campaigns with timeline, blast radius and response plan." },
  events: { title: "Event explorer", desc: "Raw, filterable security telemetry — the evidence behind every finding." },
  infrastructure: { title: "Cloud inventory", desc: "Every workload, identity and data store, scored and searchable." },
  attackpath: { title: "Attack path analysis", desc: "Navigate the intrusion graph node by node." },
  response: { title: "Response center", desc: "Execute, approve and audit containment actions." },
  rules: { title: "Detection rules", desc: "Author, test and tune the logic behind every alert." },
};

export default function AppShell({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  const { view, go, setQuery, setAnalystOpen, alerts, incidents, novelChains, flowAnomalies, apiConnected, dataSource } = useStore();
  const [q, setQ] = useState("");
  const now = useNow(1000);
  const meta = VIEW_META[view];

  const activeCount = alerts.filter((a) => a.status === "ACTIVE").length + incidents.filter((i) => i.status === "OPEN").length;
  const activeNovel = novelChains.filter((c) => c.status === "ACTIVE").length;
  const activeAnomalies = flowAnomalies.filter((f) => f.status === "ACTIVE").length;

  const submitSearch = () => {
    setQuery(q);
    go("events");
  };

  return (
    <div className="min-h-screen bg-base lg:pl-[228px]">
      {/* sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[228px] border-r border-edge bg-abyss/70 z-40">
        <div className="h-16 flex items-center px-5 border-b border-edge">
          <button onClick={onExit}><Wordmark size="sm" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-5 px-3">
          {NAV.map((g) => (
            <div key={g.section} className="mb-5">
              <div className="lbl px-3 mb-2">{g.section}</div>
              {g.items.map((it) => {
                const count =
                  it.countKey === "threats" ? activeCount :
                  it.countKey === "novel" ? activeNovel :
                  it.countKey === "anomalies" ? activeAnomalies : 0;

                return (
                  <button
                    key={it.id}
                    onClick={() => go(it.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] transition-all duration-150 mb-0.5 ${
                      view === it.id ? "bg-sig/10 text-sig border-l-2 border-sig" : "text-mut hover:text-ink hover:bg-panel2 border-l-2 border-transparent"
                    }`}
                  >
                    <Icon name={it.icon} size={16} />
                    <span className="font-medium">{it.label}</span>
                    {count > 0 && (
                      <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-crit/15 text-crit border border-crit/30">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-edge">
          <button onClick={() => setAnalystOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] text-mut hover:text-sig hover:bg-sig/5 transition-colors mb-1">
            <Icon name="sparkle" size={16} />
            <span className="font-medium">AI analyst</span>
            <span className="ml-auto relative inline-flex w-1.5 h-1.5"><span className="ping-dot absolute w-full h-full rounded-full text-sig" /><span className="relative w-1.5 h-1.5 rounded-full bg-sig" /></span>
          </button>
          <button onClick={onExit} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] text-dim hover:text-ink hover:bg-panel2 transition-colors">
            <Icon name="chevronLeft" size={16} />
            <span>Marketing site</span>
          </button>
        </div>
      </aside>

      {/* topbar */}
      <header className="sticky top-0 z-30 border-b border-edge bg-base/85 backdrop-blur-md">
        <div className="h-16 px-4 md:px-8 flex items-center gap-4">
          <button onClick={onExit} className="lg:hidden shrink-0"><Wordmark size="sm" /></button>
          <div className="hidden lg:block min-w-0">
            <div className="font-disp font-semibold text-[15px] leading-tight truncate">{meta.title}</div>
            <div className="font-mono text-[10px] text-dim truncate">{meta.desc}</div>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 border border-edge rounded-sm px-3 py-2 bg-panel/60 focus-within:border-sig/50 transition-colors w-64">
            <Icon name="search" size={14} className="text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="Search events…"
              className="bg-transparent outline-none text-[12.5px] font-mono placeholder:text-dim w-full text-ink"
              aria-label="Search events"
            />
            <kbd className="font-mono text-[9px] text-dim border border-edge2 rounded-sm px-1">↵</kbd>
          </div>
          {apiConnected ? (
            <span className="hidden sm:inline-flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-sig border border-sig/30 bg-sig/8 rounded-sm px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sig blink-rec" />
              {dataSource === "cdr" ? "Live · Sentinel-X Engine" : "Live · Sentinel-X API"}
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-med border border-med/30 bg-med/8 rounded-sm px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-med blink-rec" />
              Simulated telemetry
            </span>
          )}
          <span className="hidden sm:block font-mono text-[11px] text-dim tabular-nums">{new Date(now).toISOString().slice(11, 19)}Z</span>
          <button
            onClick={() => setAnalystOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 border border-edge2 rounded-sm px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-sig hover:bg-sig/10 transition-colors"
          >
            <Icon name="sparkle" size={14} /> AI
          </button>
        </div>
        {/* mobile nav */}
        <nav className="lg:hidden flex gap-1 px-3 pb-2 overflow-x-auto">
          {NAV.flatMap((g) => g.items).map((it) => (
            <button
              key={it.id}
              onClick={() => go(it.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-[0.1em] transition-colors ${
                view === it.id ? "bg-sig/12 text-sig" : "text-mut hover:text-ink"
              }`}
            >
              <Icon name={it.icon} size={13} />
              {it.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-4 md:px-8 py-8">{children}</main>
    </div>
  );
}
