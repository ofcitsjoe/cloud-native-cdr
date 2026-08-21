import React, { useEffect, useState } from "react";
import { Gauge, HBars, Sparkline, StackedArea, TrendLine } from "../components/charts";
import { Icon } from "../components/icons";
import { Reveal, SevDot, AlertStatusBadge } from "../components/ui";
import {
  ACCOUNTS, DAILY_THREATS, DETECTION_STATS, EVENTS, POSTURE_TREND, RESOURCES, SEV_META,
  fmtClock, timeAgo,
} from "../data/securityData";
import { useStore } from "../store";

function Kpi({ label, value, sub, spark, color }: { label: string; value: React.ReactNode; sub: string; spark?: number[]; color?: string }) {
  return (
    <div className="panel rounded-md px-4 py-4 hover:border-edge2 transition-colors group">
      <div className="lbl">{label}</div>
      <div className="flex items-end justify-between gap-2 mt-2.5">
        <div className="font-disp font-bold text-[26px] leading-none tracking-tight" style={color ? { color } : undefined}>{value}</div>
        {spark && <Sparkline points={spark} color={color ?? "#2FD6B5"} />}
      </div>
      <div className="font-mono text-[10px] text-dim mt-2.5">{sub}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-[1320px] mx-auto space-y-6" aria-busy="true" aria-label="Loading overview">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[104px] rounded-md" />)}
      </div>
      <div className="grid xl:grid-cols-[1.9fr_1fr] gap-6">
        <div className="skeleton h-[360px] rounded-md" />
        <div className="skeleton h-[360px] rounded-md" />
      </div>
      <div className="grid xl:grid-cols-[1.9fr_1fr] gap-6">
        <div className="skeleton h-[320px] rounded-md" />
        <div className="skeleton h-[320px] rounded-md" />
      </div>
      <div className="lbl flex items-center gap-2 text-sig"><span className="w-1.5 h-1.5 rounded-full bg-sig blink-rec" />Syncing telemetry from 4 cloud accounts…</div>
    </div>
  );
}

export default function Dashboard() {
  const { alerts, incidents, go } = useStore();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 850);
    return () => window.clearTimeout(t);
  }, []);
  if (loading) return <DashboardSkeleton />;
  const active = alerts.filter((a) => a.status === "ACTIVE");
  const crit = active.filter((a) => a.severity === "CRITICAL");
  const openIncidents = incidents.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING");
  const contained = alerts.filter((a) => a.status === "CONTAINED").length;
  const atRisk = RESOURCES.filter((r) => r.status === "at-risk" || r.status === "critical");
  const eventsToday = 1284;

  const recentAlerts = [...alerts].sort((a, b) => b.ts - a.ts).slice(0, 6);
  const topResources = [...RESOURCES].sort((a, b) => b.suspicious - a.suspicious).slice(0, 6);
  const feed = EVENTS.filter((e) => e.severity !== "INFO").sort((a, b) => b.ts - a.ts).slice(0, 7);

  return (
    <div className="max-w-[1320px] mx-auto space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Critical threats" value={crit.length} sub={`${active.length} active detections`} color="#FF5D55" spark={[2, 1, 3, 2, 4, 3, crit.length + 2]} />
        <Kpi label="Active incidents" value={openIncidents.length} sub="1 open · 1 investigating" color="#FF9838" spark={[3, 4, 2, 3, 2, 3, openIncidents.length]} />
        <Kpi label="Events today" value={eventsToday.toLocaleString()} sub="+8.2% vs 7-day baseline" spark={[820, 940, 880, 1010, 1120, 1180, eventsToday]} />
        <Kpi label="Auto-contained" value={contained} sub="response engine · 30d" spark={[4, 6, 5, 9, 8, 11, contained]} />
        <Kpi label="Accounts connected" value={ACCOUNTS.length} sub="AWS ×2 · Azure · GCP" spark={[3, 3, 4, 4, 4, 4, 4]} />
        <Kpi label="High-risk resources" value={atRisk.length} sub="score < 70 · prod scope" color="#FFCE5C" spark={[3, 5, 4, 6, 5, 7, atRisk.length]} />
      </div>

      {/* main grid */}
      <div className="grid xl:grid-cols-[1.9fr_1fr] gap-6">
        <Reveal>
          <div className="panel rounded-md p-5 h-full">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <div className="font-disp font-semibold text-[15px]">Threat activity — last 14 days</div>
                <div className="font-mono text-[10px] text-dim mt-0.5">detections by severity · all clouds</div>
              </div>
              <button onClick={() => go("threats")} className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sig hover:brightness-125 inline-flex items-center gap-1.5 transition-all">
                View threats <Icon name="arrowRight" size={12} />
              </button>
            </div>
            <StackedArea data={DAILY_THREATS} />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="panel rounded-md p-5 h-full flex flex-col">
            <div className="font-disp font-semibold text-[15px] mb-1">Security posture</div>
            <div className="font-mono text-[10px] text-dim">composite of exposure, detections & response</div>
            <div className="flex justify-center my-4">
              <Gauge value={71} />
            </div>
            <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-sig mb-2">
              <Icon name="arrowUpRight" size={13} /> +4 pts vs last week
            </div>
            <TrendLine points={POSTURE_TREND} height={110} />
            <div className="lbl text-center mt-1">12-week trend</div>
          </div>
        </Reveal>
      </div>

      <div className="grid xl:grid-cols-[1.9fr_1fr] gap-6">
        {/* recent alerts */}
        <Reveal>
          <div className="panel rounded-md overflow-hidden">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <div className="font-disp font-semibold text-[15px]">Recent alerts</div>
              <button onClick={() => go("threats")} className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sig hover:brightness-125 inline-flex items-center gap-1.5">
                All detections <Icon name="arrowRight" size={12} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead>
                  <tr className="border-b border-edge">
                    {["Severity", "Detection", "Resource", "Age", "Status"].map((h) => (
                      <th key={h} className="lbl px-5 py-2.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.map((a) => (
                    <tr key={a.id} onClick={() => go("threats", { threatId: a.id })} className="border-b border-edge/60 last:border-0 hover:bg-panel2 cursor-pointer transition-colors group">
                      <td className="px-5 py-3"><SevDot sev={a.severity} pulse={a.severity === "CRITICAL" && a.status === "ACTIVE"} /></td>
                      <td className="px-5 py-3">
                        <div className="text-[13px] text-ink group-hover:text-sig transition-colors">{a.name}</div>
                        <div className="font-mono text-[10px] text-dim mt-0.5">{a.id} · {a.rule} · conf {a.confidence}%</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11.5px] text-mut">{a.resource}</td>
                      <td className="px-5 py-3 font-mono text-[11px] text-dim whitespace-nowrap">{timeAgo(a.ts)}</td>
                      <td className="px-5 py-3"><AlertStatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* live feed */}
        <Reveal delay={100}>
          <div className="panel rounded-md overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
              <div className="font-disp font-semibold text-[15px]">Threat timeline</div>
              <span className="lbl flex items-center gap-2 text-crit"><span className="w-1.5 h-1.5 rounded-full bg-crit blink-rec" />live</span>
            </div>
            <div className="px-5 py-4 flex-1">
              {feed.map((e, i) => (
                <div key={e.id} className="flex gap-3.5 pb-4 last:pb-0 relative">
                  {i < feed.length - 1 && <div className="absolute left-[3.5px] top-3 bottom-0 w-px bg-edge" />}
                  <span className="relative mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: SEV_META[e.severity].hex }} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-ink leading-snug">{e.message}</div>
                    <div className="font-mono text-[9.5px] text-dim mt-1">{fmtClock(e.ts)} · {e.type} · {e.resource}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => go("events")} className="px-5 py-3 border-t border-edge font-mono text-[10.5px] uppercase tracking-[0.14em] text-sig hover:bg-sig/5 transition-colors text-left inline-flex items-center gap-1.5">
              Open event explorer <Icon name="arrowRight" size={12} />
            </button>
          </div>
        </Reveal>
      </div>

      {/* bottom grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <Reveal>
          <div className="panel rounded-md p-5">
            <div className="font-disp font-semibold text-[15px] mb-4">Top affected resources</div>
            <HBars items={topResources.map((r) => ({ label: r.name, value: r.suspicious, color: r.score < 60 ? "#FF5D55" : r.score < 75 ? "#FF9838" : "#FFCE5C", sub: "susp. events" }))} />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="panel rounded-md p-5">
            <div className="font-disp font-semibold text-[15px] mb-4">Detections by category — 30d</div>
            <HBars items={DETECTION_STATS.map((d) => ({ label: d.label, value: d.count, color: SEV_META[d.sev].hex }))} />
          </div>
        </Reveal>
        <Reveal delay={160}>
          <div className="panel rounded-md p-5">
            <div className="font-disp font-semibold text-[15px] mb-2">Connected cloud accounts</div>
            {ACCOUNTS.map((a) => (
              <div key={a.name} className="flex items-center gap-3 py-3 border-b border-edge/70 last:border-0">
                <span className="w-8 h-8 rounded-sm border border-edge2 bg-panel2 flex items-center justify-center font-mono text-[10px] text-sig shrink-0">
                  {a.provider === "AWS" ? "AWS" : a.provider === "Azure" ? "AZ" : "GCP"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[12px] text-ink truncate">{a.name}</div>
                  <div className="font-mono text-[9.5px] text-dim">{a.regions} regions · {a.workloads.toLocaleString()} workloads</div>
                </div>
                <span className="lbl text-sig flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sig" />synced {timeAgo(a.lastSync)}</span>
              </div>
            ))}
            <button onClick={() => go("infrastructure")} className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-sig hover:brightness-125 inline-flex items-center gap-1.5">
              Browse inventory <Icon name="arrowRight" size={12} />
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
