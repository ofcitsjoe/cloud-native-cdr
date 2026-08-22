import React, { useEffect, useRef, useState } from "react";
import { RESOURCES, SEV_META, timeAgo } from "../data/securityData";
import { NOVEL_ATTACK_CHAINS, FLOW_ANOMALIES, WORKLOAD_FLOW_PROFILES } from "../data/mlData";
import { useStore } from "../store";
import { Icon } from "./icons";
import { queryAiCopilotApi } from "../api/client";

interface Msg {
  role: "user" | "ai";
  text: string;
  remediation?: {
    kubectl?: string;
    awsCli?: string;
    terraform?: string;
  };
}

const CHIPS = [
  "Show me all critical incidents",
  "Explain the novel S3 exfiltration attack",
  "Why is checkout-api traffic anomalous?",
  "Generate kubectl network quarantine for checkout-api",
  "What should I do about INC-2214?",
];

export default function Analyst() {
  const { analystOpen, setAnalystOpen, alerts, incidents } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "Analyst online. I reason over console telemetry, active incidents, behavioral ML flow baselines, and novel attack chains. Ask me what happened, how a novel zero-day mutation operates, or request executable remediation code.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<Record<number, "kubectl" | "awsCli" | "terraform">>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const compose = (q: string): { text: string; remediation?: Msg["remediation"] } => {
    const s = q.toLowerCase();
    const critInc = incidents.filter((i) => i.severity === "CRITICAL");

    if (s.includes("novel") || s.includes("s3 exfiltration") || s.includes("natt-8801") || s.includes("zero-day")) {
      const n = NOVEL_ATTACK_CHAINS[0];
      return {
        text: `Fact — NATT-8801 (${n.name}) discovered ${timeAgo(n.discoveredAt)}:\n• Novelty Mutation Score: ${n.noveltyScore}/100\n• AI Confidence: ${n.confidenceScore}%\n• Synthesized Techniques: ${n.knownTechniquesUsed.join(", ")}.\n\nInference — the adversary rotates STS session tokens across 8 parallel pod IPs and caps each data stream under 50 MB/hour, bypassing conventional volume alarms while transferring 4.2 GB in aggregate.\n\nRecommendation — deploy the auto-synthesized Sigma rule immediately, apply S3 bucket principal rate limits, and quarantine the 8 source pod IPs.`,
        remediation: {
          kubectl: `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: isolate-s3-scattered-pods\n  namespace: payments\nspec:\n  podSelector:\n    matchLabels:\n      app: checkout-api\n  policyTypes:\n  - Egress\n  egress: []`,
          awsCli: `aws s3api put-bucket-policy --bucket finance-exports --policy file://deny-unclassified-asn.json`,
          terraform: `resource "aws_s3_bucket_policy" "deny_scattered" {\n  bucket = "finance-exports"\n  policy = jsonencode({\n    Version = "2012-10-17"\n    Statement = [{\n      Effect = "Deny"\n      Principal = "*"\n      Action = "s3:GetObject"\n      Resource = "arn:aws:s3:::finance-exports/*"\n      Condition = { NumericGreaterThan: { "s3:max-keys": 10 } }\n    }]\n  })\n}`,
        },
      };
    }

    if (s.includes("traffic") || s.includes("anomalous") || s.includes("3-sigma") || s.includes("beaconing") || s.includes("flow")) {
      const prof = WORKLOAD_FLOW_PROFILES[0];
      const anomaly = FLOW_ANOMALIES[0];
      return {
        text: `Fact — ${prof.workloadName} breached its 3-sigma throughput threshold by +${anomaly.deviationSigma}σ:\n• Observed Egress: 48.2 MB to ${anomaly.destIp} (${anomaly.protocol})\n• Shannon Entropy: 7.6 (indicating high-grade encrypted tunnel)\n• C2 Beaconing: confirmed 45s interval with ±4.2% jitter.\n\nInference — the pod is communicating with a curated TOR exit relay post-credential compromise. This is an active C2 session staging data for exfiltration.\n\nRecommendation — quarantine the pod network namespace and block 185.220.101.34 at the VPC security group layer.`,
        remediation: {
          kubectl: `kubectl -n payments annotate pod checkout-api-7d9f4b sentinel-x.io/quarantine=true --overwrite\nkubectl -n payments delete pod checkout-api-7d9f4b --grace-period=0 --force`,
          awsCli: `aws ec2 revoke-security-group-egress --group-id sg-0a3c4f91 --protocol tcp --port 9001 --cidr 185.220.101.34/32`,
          terraform: `resource "aws_network_acl_rule" "block_c2" {\n  network_acl_id = aws_network_acl.prod.id\n  rule_number    = 90\n  egress         = true\n  protocol       = "tcp"\n  rule_action    = "deny"\n  cidr_block     = "185.220.101.34/32"\n  from_port      = 9001\n  to_port        = 9001\n}`,
        },
      };
    }

    if (s.includes("generate") || s.includes("kubectl") || s.includes("quarantine")) {
      return {
        text: `Generated verified Calico NetworkPolicy to quarantine checkout-api-7d9f4b in the payments namespace. Memory state is preserved for forensic inspection while all ingress/egress is dropped.`,
        remediation: {
          kubectl: `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: quarantine-checkout-api\n  namespace: payments\nspec:\n  podSelector:\n    matchLabels:\n      app: checkout-api\n  policyTypes:\n  - Ingress\n  - Egress\n  ingress: []\n  egress: []`,
          awsCli: `aws ec2 revoke-security-group-ingress --group-id sg-0a3c4f91 --protocol all --source-group sg-0a3c4f91`,
          terraform: `resource "kubernetes_network_policy" "quarantine" {\n  metadata {\n    name      = "quarantine-checkout-api"\n    namespace = "payments"\n  }\n  spec {\n    pod_selector {\n      match_labels = { app = "checkout-api" }\n    }\n    policy_types = ["Ingress", "Egress"]\n  }\n}`,
        },
      };
    }

    if ((s.includes("critical") && (s.includes("incident") || s.includes("show") || s.includes("today"))) || s.includes("all critical")) {
      return {
        text: `Fact — ${critInc.length} critical incident${critInc.length === 1 ? "" : "s"} on record:\n` +
          critInc.map((i) => `• ${i.id} "${i.title}" — status ${i.status.toLowerCase()}, confidence ${i.confidence}%, opened ${timeAgo(i.ts)}, ${i.resourceIds.length} resources in scope.`).join("\n") +
          `\nInference — the top priority is ${critInc[0]?.id}: it has an active C2 channel. Recommendation — execute the pending containment queue for it before anything else.`,
      };
    }

    if (s.includes("why") && (s.includes("alert") || s.includes("tor") || s.includes("egress"))) {
      const a = alerts.find((x) => x.id === "AL-3127") ?? alerts[0];
      return {
        text: `Fact — ${a.id} "${a.name}" fired because rule ${a.rule} matched: the pod opened TLS to 185.220.101.34 (a curated TOR exit node) 47 seconds after mounting its service-account token. That workload has zero baseline egress.\nInference — combined with AL-3126 (secrets enumeration from the same identity), this is post-compromise behavior, not misconfiguration.\nRecommendation — keep the pod quarantined, revoke IRSA tokens for checkout-sa, and block the destination at network-policy level. All three are queued in the response center.`,
      };
    }

    if (s.includes("inc-2214") || s.includes("what should") || s.includes("what do") || s.includes("recommend") || s.includes("respond") || s.includes("do about")) {
      return {
        text: `Fact — INC-2214 chains four signals into one campaign: IAM privilege escalation (T+0), impossible travel (T+15m), secrets enumeration from the checkout pod, and TOR egress. The payments DB shows 6.4× query volume on card_tokens.\nInference — the attacker is inside the payments namespace and probing toward card data. The pod is already network-quarantined, so the remaining risk is stolen credentials.\nRecommendation, in order — 1) revoke IRSA credentials for checkout-sa, 2) disable svc-deploy, 3) block 185.220.101.34 fleet-wide, 4) audit card_tokens access for the last 24h. Steps 1–3 are queued in the response center.`,
      };
    }

    if (s.includes("exposed") || s.includes("most exposed")) {
      const top = [...RESOURCES].filter((r) => r.openPorts.length > 0 || r.score < 60).sort((a, b) => a.score - b.score).slice(0, 4);
      return {
        text: `Fact — highest-exposure resources right now:\n` +
          top.map((r) => `• ${r.name} (${r.type}) — score ${r.score}, open ports [${r.openPorts.join(", ") || "none"}], ${r.suspicious} suspicious events.`).join("\n") +
          `\nInference — ${top[0]?.name} is the weakest point: public reachability plus active compromise signals.\nRecommendation — reduce its attack surface first: close 22 on prod-api-gateway-01 and route admin access through SSM only.`,
      };
    }

    return {
      text: `Fact — posture score is 71/100 (+4 week-over-week). 3 critical detections remain active, 2 incidents are unresolved (INC-2214 critical, INC-2213 high), and 4 novel attack chains are tracked.\nInference — the incidents share the svc-deploy identity chain with an active C2 beaconing channel on checkout-api.\nRecommendation — start with the INC-2214 queue in the response center, then inspect the Novel Threat Synthesizer for NATT-8801.`,
    };
  };

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || thinking) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setThinking(true);

    // Try backend API first, fallback to robust client inference
    let answerObj: { text: string; remediation?: Msg["remediation"] } | null = null;
    try {
      const apiRes = await queryAiCopilotApi(question);
      if (apiRes && apiRes.fact) {
        answerObj = {
          text: `Fact — ${apiRes.fact}\n\nInference — ${apiRes.inference}\n\nRecommendation — ${apiRes.recommendation}\n\nBlast Radius — ${apiRes.blastRadius}`,
          remediation: apiRes.remediationPlaybook,
        };
      }
    } catch {
      // client fallback
    }

    if (!answerObj) {
      answerObj = compose(question);
    }

    window.setTimeout(() => {
      setThinking(false);
      setMsgs((m) => [...m, { role: "ai", text: "", remediation: answerObj?.remediation }]);
      let i = 0;
      const fullText = answerObj?.text || "";
      timerRef.current = window.setInterval(() => {
        i += 4;
        const slice = fullText.slice(0, i);
        setMsgs((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            text: slice,
          };
          return copy;
        });
        if (i >= fullText.length && timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, 12);
    }, 600);
  };

  if (!analystOpen) return null;

  return (
    <div className="fixed inset-0 z-[85]">
      <div className="absolute inset-0 bg-abyss/70" onClick={() => setAnalystOpen(false)} />
      <div className="drawer-in absolute right-0 top-0 bottom-0 w-full max-w-[540px] panel border-l border-edge flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-edge flex items-center gap-3">
          <span className="w-9 h-9 rounded-sm border border-sig/40 bg-sig/10 text-sig flex items-center justify-center">
            <Icon name="sparkle" size={17} />
          </span>
          <div className="flex-1">
            <div className="font-disp font-semibold text-[15px]">AI Security Analyst &amp; Copilot</div>
            <div className="font-mono text-[10px] text-dim">Grounded in ML baselines, TTP vectors &amp; live telemetry</div>
          </div>
          <button onClick={() => setAnalystOpen(false)} className="text-dim hover:text-ink transition-colors p-1" aria-label="Close analyst">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Message Log */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {msgs.map((m, idx) => {
            const isUser = m.role === "user";
            const tab = activeTab[idx] || "kubectl";

            return (
              <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[95%] rounded-sm px-4 py-3 text-[13px] leading-relaxed whitespace-pre-line ${
                    isUser ? "border border-edge2 bg-panel2 text-ink" : "border border-sig/25 bg-sig/5 text-ink font-mono text-[12px]"
                  }`}
                >
                  {m.text}
                  {m.role === "ai" && thinking === false && m.text === "" && <span className="caret text-sig">▍</span>}

                  {/* Remediation Script Tabs */}
                  {m.remediation && m.text.length > 20 && (
                    <div className="mt-4 pt-3 border-t border-edge2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="lbl text-sig text-[10px]">Auto-Generated Remediation</span>
                        <div className="flex gap-1">
                          {(["kubectl", "awsCli", "terraform"] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setActiveTab((prev) => ({ ...prev, [idx]: t }))}
                              className={`px-2 py-0.5 rounded-sm font-mono text-[9.5px] border ${
                                tab === t ? "border-sig/60 text-sig bg-sig/10" : "border-edge text-dim"
                              }`}
                            >
                              {t === "kubectl" ? "Kubectl" : t === "awsCli" ? "AWS CLI" : "Terraform"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border border-edge rounded-sm bg-abyss/90 p-3 font-mono text-[10.5px] text-mut overflow-x-auto">
                        <pre>{m.remediation[tab] || "# No script generated for this provider"}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {thinking && (
            <div className="flex justify-start">
              <div className="border border-sig/25 bg-sig/5 rounded-sm px-4 py-3 font-mono text-[12px] text-sig inline-flex items-center gap-2">
                <Icon name="pulse" size={13} className="animate-pulse" /> Correlating ML vectors &amp; telemetry…
              </div>
            </div>
          )}
        </div>

        {/* Quick Chips */}
        <div className="px-5 pb-2 flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => ask(c)}
              disabled={thinking}
              className="font-mono text-[10px] text-mut border border-edge rounded-sm px-2.5 py-1.5 hover:text-sig hover:border-sig/40 transition-colors disabled:opacity-40"
            >
              {c}
            </button>
          ))}
        </div>

        {/* Query Input */}
        <div className="px-5 py-4 border-t border-edge">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="Ask about novel zero-days, traffic anomalies, or remediation…"
              className="flex-1 bg-panel2 border border-edge rounded-sm px-3.5 py-2.5 text-[13px] outline-none focus:border-sig/50 placeholder:text-dim transition-colors"
              aria-label="Ask the AI analyst"
            />
            <button
              onClick={() => ask(input)}
              disabled={thinking || !input.trim()}
              className="w-11 rounded-sm bg-sig text-abyss flex items-center justify-center hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-40"
              aria-label="Send"
            >
              <Icon name="send" size={15} />
            </button>
          </div>
          <p className="font-mono text-[9.5px] text-dim mt-2.5 leading-relaxed">
            Answers distinguish <span style={{ color: SEV_META.INFO.hex }}>fact</span>, inference and recommendation.
            Simulated environment — all recommendations are safe to inspect.
          </p>
        </div>
      </div>
    </div>
  );
}
