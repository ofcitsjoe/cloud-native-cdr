import React, { useState } from "react";
import { Icon } from "../components/icons";
import { NoveltyMutationGauge } from "../components/charts";
import { Btn, SevBadge, SevDot, EmptyState, KV } from "../components/ui";
import { NOVEL_ATTACK_CHAINS, NovelAttackChain, TTPStep } from "../data/mlData";
import { SEV_META, Severity, timeAgo } from "../data/securityData";
import { useStore } from "../store";

export default function NovelThreats() {
  const { toast, go } = useStore();
  const [chains, setChains] = useState<NovelAttackChain[]>(NOVEL_ATTACK_CHAINS);
  const [selId, setSelId] = useState<string>(NOVEL_ATTACK_CHAINS[0]?.id || "");
  const [filterSev, setFilterSev] = useState<Severity | "ALL">("ALL");

  // Test Harness State
  const [simSteps, setSimSteps] = useState<string>("T1078 (Valid Cloud Accounts), T1548 (STS AssumeRole), Micro-session token rotation, Distributed multi-pod S3 egress");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{
    noveltyScore: number;
    confidence: number;
    explanation: string;
    rule: string;
  } | null>(null);

  const filteredChains = chains.filter((c) => filterSev === "ALL" || c.severity === filterSev);
  const selChain = chains.find((c) => c.id === selId) || filteredChains[0];

  const handleRunSimulation = () => {
    setEvaluating(true);
    setEvalResult(null);

    window.setTimeout(() => {
      setEvaluating(false);
      setEvalResult({
        noveltyScore: 92,
        confidence: 95,
        explanation: "Sequence exhibits high-novelty multi-tactic synthesis. The combination of Micro-session token cycling with distributed pod egress evades traditional single-source volume thresholds.",
        rule: `title: Auto-Synthesized Detection Rule for Custom Sequence
id: sigma-novel-synthesized-${Date.now().toString(36)}
status: experimental
logsource:
  category: multi-cloud-telemetry
detection:
  condition: 1 of (T1078, T1548) followed by MicroSessionRotation within 5m
level: critical`,
      });
      toast("AI Evaluation complete — Novel mutation confirmed (92/100)", "warn");
    }, 1100);
  };

  const copyRule = (code: string) => {
    navigator.clipboard.writeText(code);
    toast("Sigma rule copied to clipboard", "ok");
  };

  return (
    <div className="max-w-[1320px] mx-auto space-y-6">
      {/* Top Banner KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="panel rounded-md p-4">
          <div className="lbl">Active Novel Attack Chains</div>
          <div className="font-disp font-bold text-[26px] leading-none mt-2.5 text-crit">
            {chains.filter((c) => c.status === "ACTIVE").length}
          </div>
          <div className="font-mono text-[10px] text-dim mt-2">synthesizing known TTPs</div>
        </div>
        <div className="panel rounded-md p-4">
          <div className="lbl">Max Novelty Mutation Index</div>
          <div className="font-disp font-bold text-[26px] leading-none mt-2.5 text-high">
            94<span className="text-[15px] font-normal text-dim">/100</span>
          </div>
          <div className="font-mono text-[10px] text-dim mt-2">unpredicted composite vector</div>
        </div>
        <div className="panel rounded-md p-4">
          <div className="lbl">AI Model Confidence</div>
          <div className="font-disp font-bold text-[26px] leading-none mt-2.5 text-sig">
            96.2%
          </div>
          <div className="font-mono text-[10px] text-dim mt-2">Sentinel-X Sequence Vectorizer</div>
        </div>
        <div className="panel rounded-md p-4">
          <div className="lbl">Synthesized Rules</div>
          <div className="font-disp font-bold text-[26px] leading-none mt-2.5 text-ink">
            {chains.filter((c) => c.synthesizedRule).length}
          </div>
          <div className="font-mono text-[10px] text-dim mt-2">ready for Sigma / SIEM export</div>
        </div>
      </div>

      {/* Main Grid: Chain List on Left, Deep-Dive on Right */}
      <div className="grid xl:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left Column: Chain Navigator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="lbl">{filteredChains.length} Discovered Variants</span>
            <div className="flex gap-1">
              {(["ALL", "CRITICAL", "HIGH"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterSev(s)}
                  className={`px-2.5 py-1 rounded-sm font-mono text-[10px] border transition-all ${filterSev === s ? "border-sig/60 text-sig bg-sig/10" : "border-edge text-mut hover:text-ink"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredChains.map((c) => {
              const isSel = c.id === selChain?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelId(c.id)}
                  className={`w-full text-left panel rounded-md p-4 transition-all border-l-2 ${isSel ? "border-l-sig bg-panel2" : "border-l-transparent hover:bg-panel2/60"}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <SevDot sev={c.severity} pulse={c.status === "ACTIVE"} />
                    <span className="font-mono text-[10.5px] text-dim">{c.id}</span>
                    <span className="lbl text-sig ml-auto">{timeAgo(c.discoveredAt)}</span>
                  </div>
                  <div className="text-[13.5px] text-ink font-medium leading-snug mt-2">
                    {c.name}
                  </div>
                  <div className="flex items-center justify-between mt-3 font-mono text-[10px]">
                    <span className="text-dim">Target: {c.targetAsset}</span>
                    <span className="text-high font-semibold">Novelty {c.noveltyScore}/100</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Test Harness Box */}
          <div className="panel rounded-md p-5 border border-sig/30 bg-panel/80 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="brain" size={16} className="text-sig" />
              <div className="font-disp font-semibold text-[14px]">Novel Threat Simulator</div>
            </div>
            <p className="text-[12px] text-mut leading-relaxed">
              Test candidate telemetry sequences against known MITRE TTP matrices to estimate mutation novelty.
            </p>
            <textarea
              rows={3}
              value={simSteps}
              onChange={(e) => setSimSteps(e.target.value)}
              className="w-full bg-panel2 border border-edge rounded-sm px-3 py-2 text-[12px] font-mono outline-none focus:border-sig/50 transition-colors resize-none text-ink"
            />
            <Btn variant="solid" onClick={handleRunSimulation} disabled={evaluating} className="w-full justify-center">
              {evaluating ? (
                <>
                  <Icon name="pulse" size={13} className="animate-pulse" /> Evaluating Vectors…
                </>
              ) : (
                <>
                  <Icon name="zap" size={13} /> Run ML Sequence Test
                </>
              )}
            </Btn>

            {evalResult && (
              <div className="border border-sig/30 bg-sig/5 rounded-sm p-3.5 space-y-2 anim-fade-up">
                <div className="flex justify-between items-center">
                  <span className="lbl text-sig">Evaluation Result</span>
                  <span className="font-mono text-[11px] text-high font-bold">Novelty {evalResult.noveltyScore}/100</span>
                </div>
                <p className="text-[11.5px] text-ink leading-relaxed">{evalResult.explanation}</p>
                <div className="pt-2 border-t border-edge/60 flex justify-between items-center">
                  <span className="font-mono text-[10px] text-dim">Sigma Rule Synthesized</span>
                  <button onClick={() => copyRule(evalResult.rule)} className="font-mono text-[10px] text-sig hover:underline">
                    Copy Rule
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Novel Chain Deep Dive */}
        {selChain ? (
          <div className="space-y-6" key={selChain.id}>
            {/* Header Card */}
            <div className="panel rounded-md p-6 anim-fade-up">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <SevBadge sev={selChain.severity} />
                    <span className="lbl">{selChain.id}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm border border-sig/40 text-sig bg-sig/10">
                      {selChain.status}
                    </span>
                  </div>
                  <h1 className="font-disp font-bold text-2xl md:text-3xl tracking-tight leading-tight mt-3">
                    {selChain.name}
                  </h1>
                </div>

                <div className="shrink-0 flex justify-center">
                  <NoveltyMutationGauge score={selChain.noveltyScore} confidence={selChain.confidenceScore} />
                </div>
              </div>

              <div className="mt-6 border-t border-edge pt-5">
                <div className="lbl text-sig mb-2">Executive Threat Summary</div>
                <p className="text-[14px] text-ink leading-relaxed">{selChain.summary}</p>
              </div>

              {/* Why it is novel vs known techniques */}
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="border border-edge rounded-sm p-4 bg-panel2/50">
                  <div className="lbl mb-2.5 flex items-center gap-2">
                    <Icon name="check" size={13} className="text-sig" /> Known Techniques Synthesized
                  </div>
                  <ul className="space-y-2">
                    {selChain.knownTechniquesUsed.map((t) => (
                      <li key={t} className="font-mono text-[11.5px] text-mut flex items-start gap-2">
                        <span className="text-sig">•</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-crit/30 bg-crit/5 rounded-sm p-4">
                  <div className="lbl text-crit mb-2.5 flex items-center gap-2">
                    <Icon name="alertTriangle" size={13} className="text-crit" /> Novel / Unobserved Aspects
                  </div>
                  <ul className="space-y-2">
                    {selChain.novelAspects.map((a) => (
                      <li key={a} className="font-mono text-[11.5px] text-ink flex items-start gap-2">
                        <span className="text-crit">!</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Predictive Blast Radius */}
              <div className="mt-6 border border-edge rounded-sm p-4 bg-panel2/30">
                <div className="lbl text-high mb-3">Predictive Blast Radius &amp; Impact</div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <div className="font-mono text-[10px] text-dim">Assets At Risk</div>
                    <div className="font-mono text-[12px] text-ink mt-1">
                      {selChain.predictiveBlastRadius.criticalAssetsAtRisk.join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-dim">Potential Data Impact</div>
                    <div className="font-mono text-[12px] text-ink mt-1">
                      {selChain.predictiveBlastRadius.potentialDataImpact}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-dim">Time To Exfiltration</div>
                    <div className="font-mono text-[12px] text-crit font-semibold mt-1">
                      {selChain.predictiveBlastRadius.estimatedTimeToExfiltration}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MITRE ATT&CK TTP Progression Chain */}
            <div className="panel rounded-md p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-disp font-semibold text-[16px]">MITRE ATT&amp;CK Multi-Stage Progression</div>
                  <div className="font-mono text-[10px] text-dim mt-0.5">
                    {selChain.ttpSequence.length} correlated steps with telemetry groundings
                  </div>
                </div>
                <span className="lbl text-sig flex items-center gap-1.5">
                  <Icon name="activity" size={13} /> Correlated by Sentinel-X ML
                </span>
              </div>

              <div className="space-y-4">
                {selChain.ttpSequence.map((step, idx) => (
                  <div
                    key={step.techniqueId + idx}
                    className={`border rounded-sm p-4 transition-colors ${step.isNovelMutation ? "border-crit/40 bg-crit/5" : "border-edge bg-panel2/40"}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-sm border flex items-center justify-center font-mono text-[11px] font-bold ${step.isNovelMutation ? "border-crit/50 bg-crit/15 text-crit" : "border-sig/50 bg-sig/15 text-sig"}`}>
                          0{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[13px] text-ink font-semibold">{step.techniqueId} · {step.techniqueName}</span>
                            {step.isNovelMutation && (
                              <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm bg-crit/20 text-crit border border-crit/40">
                                Novel Mutation
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-dim mt-0.5">
                            Tactic: <span className="text-mut">{step.tactic}</span> · Telemetry: <span className="text-sig">{step.telemetrySource}</span>
                          </div>
                        </div>
                      </div>

                      <div className="font-mono text-[11px] text-dim">
                        Confidence: <span className="text-ink font-bold">{step.confidence}%</span>
                      </div>
                    </div>

                    <div className="mt-3 pl-10 text-[12.5px] text-mut leading-relaxed">
                      {step.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Synthesized Detection Rule Card */}
            {selChain.synthesizedRule && (
              <div className="panel rounded-md p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <div className="font-disp font-semibold text-[15px]">Auto-Synthesized Detection Rule</div>
                    <div className="font-mono text-[10px] text-dim mt-0.5">
                      Engineered for immediate SIEM / Sigma integration
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="line" onClick={() => copyRule(selChain.synthesizedRule!.code)}>
                      <Icon name="fileText" size={12} /> Copy Rule
                    </Btn>
                    <Btn variant="solid" onClick={() => go("rules")}>
                      <Icon name="terminal" size={12} /> Open in Rule Studio
                    </Btn>
                  </div>
                </div>

                <div className="border border-edge rounded-sm bg-abyss/80 p-4 font-mono text-[11px] text-mut leading-relaxed overflow-x-auto">
                  <pre>{selChain.synthesizedRule.code}</pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="panel rounded-md p-10">
            <EmptyState title="No novel attacks match filter" hint="Select another severity filter to inspect analyzed chains." />
          </div>
        )}
      </div>
    </div>
  );
}
