import React, { useState } from "react";
import { Icon } from "../components/icons";
import { BaselineFlowChart } from "../components/charts";
import { Btn, EmptyState, SevDot } from "../components/ui";
import {
  FLOW_ANOMALIES,
  FlowAnomaly,
  WORKLOAD_FLOW_PROFILES,
  WorkloadFlowProfile,
} from "../data/mlData";
import { timeAgo } from "../data/securityData";
import { useStore } from "../store";

export default function TrafficAnomaly() {
  const { toast } = useStore();
  const [profiles, setProfiles] = useState<WorkloadFlowProfile[]>(WORKLOAD_FLOW_PROFILES);
  const [selWorkloadId, setSelWorkloadId] = useState<string>("checkout-api-7d9f4b");
  const [anomalies, setAnomalies] = useState<FlowAnomaly[]>(FLOW_ANOMALIES);
  const [isSimulating, setIsSimulating] = useState(false);

  const selProfile = profiles.find((p) => p.workloadId === selWorkloadId) || profiles[0];

  const handleQuarantine = (flowId: string) => {
    setAnomalies((list) =>
      list.map((f) => (f.id === flowId ? { ...f, status: "QUARANTINED" } : f))
    );
    toast(`Flow ${flowId} quarantined — Calico default-deny NetworkPolicy applied`, "ok");
  };

  const handleSimulateBurst = () => {
    setIsSimulating(true);
    toast("Simulating traffic spike on " + selProfile.workloadName + "…", "info");

    window.setTimeout(() => {
      setProfiles((prev) =>
        prev.map((prof) => {
          if (prof.workloadId !== selProfile.workloadId) return prof;
          const updatedPoints = prof.flowPoints24h.map((pt, i) => {
            if (i >= prof.flowPoints24h.length - 3) {
              const surge = Math.round((pt.baselineUpper3SigmaMbps * 4.5) * 10) / 10;
              return {
                ...pt,
                actualThroughputMbps: surge,
                isAnomaly: true,
                anomalyType: "EGRESS_BURST" as const,
                entropyScore: 7.8,
              };
            }
            return pt;
          });
          return {
            ...prof,
            currentStatus: "CRITICAL_BURST",
            flowPoints24h: updatedPoints,
          };
        })
      );
      setIsSimulating(false);
      toast("3-Sigma Egress Breach triggered on " + selProfile.workloadId, "crit");
    }, 900);
  };

  return (
    <div className="max-w-[1320px] mx-auto space-y-6">
      {/* Top Banner KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="panel rounded-md p-4">
          <div className="lbl">Monitored Flow Endpoints</div>
          <div className="font-disp font-bold text-[26px] leading-none mt-2.5 text-ink">
            {profiles.length}
          </div>
          <div className="font-mono text-[10px] text-dim mt-2">VPC subnets &amp; pod networks</div>
        </div>
        <div className="panel rounded-md p-4">
          <div className="lbl">Active 3-Sigma Anomaly Outliers</div>
          <div className="font-disp font-bold text-[26px] leading-none mt-2.5 text-crit">
            {anomalies.filter((a) => a.status === "ACTIVE").length}
          </div>
          <div className="font-mono text-[10px] text-dim mt-2">Z-score &gt; 3.0 statistical breach</div>
        </div>
        <div className="panel rounded-md p-4">
          <div className="lbl">C2 Periodic Beaconing Cadence</div>
          <div className="font-disp font-bold text-[26px] leading-none mt-2.5 text-high">
            1 Confirmed
          </div>
          <div className="font-mono text-[10px] text-dim mt-2">45s interval · 4.2% jitter</div>
        </div>
        <div className="panel rounded-md p-4">
          <div className="lbl">Mean Telemetry Shannon Entropy</div>
          <div className="font-disp font-bold text-[26px] leading-none mt-2.5 text-sig">
            4.1 <span className="text-[14px] text-dim font-normal">/ 8.0</span>
          </div>
          <div className="font-mono text-[10px] text-dim mt-2">normal distribution bounds</div>
        </div>
      </div>

      {/* Workload Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge pb-4">
        {profiles.map((p) => {
          const isSel = p.workloadId === selWorkloadId;
          const isCritical = p.currentStatus === "CRITICAL_BURST";
          return (
            <button
              key={p.workloadId}
              onClick={() => setSelWorkloadId(p.workloadId)}
              className={`panel rounded-sm px-4 py-2.5 text-left transition-all border ${
                isSel
                  ? "border-sig/60 bg-sig/10 text-sig"
                  : "border-edge hover:border-edge2 text-mut hover:text-ink"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCritical ? "bg-crit animate-ping" : p.currentStatus === "ANOMALOUS" ? "bg-high" : "bg-sig"
                  }`}
                />
                <span className="font-mono text-[12px] font-semibold">{p.workloadName.split(" ")[0]}</span>
                <span className="lbl text-[9px] uppercase px-1.5 py-0.5 rounded-sm border border-edge">
                  {p.provider}
                </span>
              </div>
            </button>
          );
        })}

        <div className="ml-auto">
          <Btn variant="line" onClick={handleSimulateBurst} disabled={isSimulating}>
            <Icon name="waveform" size={13} />
            {isSimulating ? "Simulating Spike…" : "Simulate Traffic Anomaly Burst"}
          </Btn>
        </div>
      </div>

      {/* Time-Series Baseline vs Observed Chart */}
      <div className="panel rounded-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-disp font-bold text-xl text-ink">{selProfile.workloadName}</h2>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm border ${
                  selProfile.currentStatus === "CRITICAL_BURST"
                    ? "border-crit/40 text-crit bg-crit/10"
                    : selProfile.currentStatus === "ANOMALOUS"
                    ? "border-high/40 text-high bg-high/10"
                    : "border-sig/40 text-sig bg-sig/10"
                }`}
              >
                {selProfile.currentStatus.replace("_", " ")}
              </span>
            </div>
            <div className="font-mono text-[10.5px] text-dim mt-1">
              24-Hour Moving Baseline (μ) with 3-Sigma Upper/Lower Confidence Bounds
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-mono text-[11px] text-dim">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sig inline-block" /> Baseline Mean (μ)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2 bg-sig/20 border border-dashed border-sig/50 inline-block" /> 3σ Confidence Band
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-ink inline-block" /> Observed Throughput
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-crit inline-block" /> Anomaly Outlier
            </span>
          </div>
        </div>

        <BaselineFlowChart points={selProfile.flowPoints24h} height={260} />
      </div>

      {/* Deep-Dive Grid: Beaconing Inspector & Workload Telemetry Profile */}
      <div className="grid xl:grid-cols-2 gap-6">
        {/* Beaconing Cadence & C2 Detection */}
        <div className="panel rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-disp font-semibold text-[15px]">C2 Beaconing &amp; Cadence Jitter Analysis</div>
            <span className="lbl text-sig flex items-center gap-1.5">
              <Icon name="radar" size={13} /> FFT Autocorrelation Engine
            </span>
          </div>

          {selProfile.activeBeaconing ? (
            <div className="space-y-4 border border-crit/30 bg-crit/5 rounded-sm p-4 anim-fade-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SevDot sev="CRITICAL" pulse />
                  <span className="font-mono text-[13px] text-ink font-semibold">
                    {selProfile.activeBeaconing.verdict.replace("_", " ")}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-crit font-bold">
                  {selProfile.activeBeaconing.confidenceScore}% AI Confidence
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="border border-edge rounded-sm p-2.5 bg-panel2/60">
                  <span className="text-dim block">Target C2 Address</span>
                  <span className="text-ink font-semibold">{selProfile.activeBeaconing.destinationIp}</span>
                  <span className="text-dim text-[9.5px] block mt-0.5">{selProfile.activeBeaconing.destinationAsn}</span>
                </div>
                <div className="border border-edge rounded-sm p-2.5 bg-panel2/60">
                  <span className="text-dim block">Cadence &amp; Jitter</span>
                  <span className="text-ink font-semibold">{selProfile.activeBeaconing.intervalSec}s Interval</span>
                  <span className="text-sig text-[9.5px] block mt-0.5">±{selProfile.activeBeaconing.jitterPercent}% randomized jitter</span>
                </div>
              </div>

              <p className="text-[12px] text-mut leading-relaxed">
                Detected persistent heartbeat connections with low-variance jitter matching Cobalt Strike / Mythic egress profiles. Traffic is bypassing standard timeout rules.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center border border-edge rounded-sm">
              <Icon name="check" size={22} className="text-sig mx-auto mb-2" />
              <div className="font-disp font-semibold text-ink">No Periodic Beaconing Detected</div>
              <p className="text-[12px] text-dim mt-1">Inter-arrival packet timing conforms to normal distribution.</p>
            </div>
          )}
        </div>

        {/* Workload Flow Health & Protocols */}
        <div className="panel rounded-md p-6">
          <div className="font-disp font-semibold text-[15px] mb-4">Workload Behavioral Profile</div>
          <div className="space-y-3 font-mono text-[12px]">
            <div className="flex justify-between py-2 border-b border-edge/60">
              <span className="text-dim">Environment &amp; Cloud Provider:</span>
              <span className="text-ink">{selProfile.environment.toUpperCase()} · {selProfile.provider}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-edge/60">
              <span className="text-dim">Avg Daily Throughput:</span>
              <span className="text-ink">{selProfile.avgDailyThroughputGb} GB / 24h</span>
            </div>
            <div className="flex justify-between py-2 border-b border-edge/60">
              <span className="text-dim">Normal Active Connections:</span>
              <span className="text-ink">{selProfile.normalActiveConnections.toLocaleString()} concurrent</span>
            </div>
            <div className="flex justify-between py-2 border-b border-edge/60">
              <span className="text-dim">Historical 3-Sigma Breach Limit:</span>
              <span className="text-high">{selProfile.historical3SigmaThresholdMbps} Mbps</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-dim">Observed Protocols:</span>
              <span className="text-sig">{selProfile.observedProtocols.join(", ")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Flow Anomalies Table */}
      <div className="panel rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
          <div>
            <div className="font-disp font-semibold text-[15px]">Flow Telemetry &amp; Anomaly Records</div>
            <div className="font-mono text-[10px] text-dim mt-0.5">
              Live traffic events flagged by the 3-Sigma &amp; Entropy models
            </div>
          </div>
          <span className="lbl text-crit">{anomalies.filter((a) => a.status === "ACTIVE").length} require response</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-edge bg-panel2/50">
                {["Timestamp", "Workload", "Source → Destination", "Protocol / JA3", "Volume", "Deviation", "Reason", "Action"].map((h) => (
                  <th key={h} className="lbl px-5 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anomalies.map((f) => (
                <tr key={f.id} className="border-b border-edge/60 last:border-0 hover:bg-panel2/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-[11px] text-dim whitespace-nowrap">
                    {timeAgo(f.ts)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-ink font-semibold">
                    {f.workload}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-mut">
                    {f.sourceIp} → <span className="text-ink">{f.destIp}:{f.destPort}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-[11px] text-ink">{f.protocol}</div>
                    {f.ja3Fingerprint && (
                      <div className="font-mono text-[9.5px] text-dim truncate max-w-[120px]">
                        JA3: {f.ja3Fingerprint}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-dim whitespace-nowrap">
                    {(f.bytesTransferred / 1_000_000).toFixed(1)} MB
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-crit font-bold whitespace-nowrap">
                    +{f.deviationSigma}σ
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-mut max-w-xs leading-snug">
                    {f.anomalyReason}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {f.status === "QUARANTINED" ? (
                      <span className="font-mono text-[10px] text-sig border border-sig/40 bg-sig/10 px-2 py-1 rounded-sm">
                        QUARANTINED
                      </span>
                    ) : (
                      <Btn variant="solid" onClick={() => handleQuarantine(f.id)} className="!px-2.5 !py-1 !text-[10px]">
                        <Icon name="shield" size={11} /> Quarantine
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
