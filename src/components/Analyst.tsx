import React, { useEffect, useRef, useState } from "react";
import { RESOURCES, SEV_META, timeAgo } from "../data/securityData";
import { useStore } from "../store";
import { Icon } from "./icons";

interface Msg { role: "user" | "ai"; text: string }

const CHIPS = [
  "Show me all critical incidents",
  "Why was the TOR egress alert generated?",
  "Which resources are most exposed?",
  "Is the svc-deploy login suspicious?",
  "What should I do about INC-2214?",
];

export default function Analyst() {
  const { analystOpen, setAnalystOpen, alerts, incidents } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Analyst online. I reason over the same simulated telemetry you see in the console — alerts, events, resources and incidents. Ask me what happened, what matters, or what to do next." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const compose = (q: string): string => {
    const s = q.toLowerCase();
    const critInc = incidents.filter((i) => i.severity === "CRITICAL");
    const activeCrit = alerts.filter((a) => a.status === "ACTIVE" && a.severity === "CRITICAL");

    if ((s.includes("critical") && (s.includes("incident") || s.includes("show") || s.includes("today"))) || s.includes("all critical")) {
      return `Fact — ${critInc.length} critical incident${critInc.length === 1 ? "" : "s"} on record:\n` +
        critInc.map((i) => `• ${i.id} "${i.title}" — status ${i.status.toLowerCase()}, confidence ${i.confidence}%, opened ${timeAgo(i.ts)}, ${i.resourceIds.length} resources in scope.`).join("\n") +
        `\nInference — the top priority is ${critInc[0]?.id}: it has an active C2 channel. Recommendation — execute the pending containment queue for it before anything else.`;
    }
    if (s.includes("why") && (s.includes("alert") || s.includes("tor") || s.includes("egress"))) {
      const a = alerts.find((x) => x.id === "AL-3127") ?? alerts[0];
      return `Fact — ${a.id} "${a.name}" fired because rule ${a.rule} matched: the pod opened TLS to 185.220.101.34 (a curated TOR exit node) 47 seconds after mounting its service-account token. That workload has zero baseline egress.\nInference — combined with AL-3126 (secrets enumeration from the same identity), this is post-compromise behavior, not misconfiguration.\nRecommendation — keep the pod quarantined, revoke IRSA tokens for checkout-sa, and block the destination at network-policy level. All three are queued in the response center.`;
    }
    if (s.includes("exposed") || s.includes("most exposed")) {
      const top = [...RESOURCES].filter((r) => r.openPorts.length > 0 || r.score < 60).sort((a, b) => a.score - b.score).slice(0, 4);
      return `Fact — highest-exposure resources right now:\n` +
        top.map((r) => `• ${r.name} (${r.type}) — score ${r.score}, open ports [${r.openPorts.join(", ") || "none"}], ${r.suspicious} suspicious events.`).join("\n") +
        `\nInference — ${top[0]?.name} is the weakest point: public reachability plus active compromise signals.\nRecommendation — reduce its attack surface first: close 22 on prod-api-gateway-01 and route admin access through SSM only.`;
    }
    if (s.includes("login") || s.includes("suspicious") || s.includes("svc-deploy")) {
      return `Fact — svc-deploy signed in from Oslo (84.208.19.7) and Singapore (103.28.55.12) 41 minutes apart; that's ~10,300 km at ~15,000 km/h required — physically impossible. MFA passed only on the second session, which suggests an adversary-in-the-middle or session replay.\nInference — this identity is attacker-controlled. It is also the identity behind the finance-exports egress (AL-3119).\nRecommendation — disable the user, terminate all STS sessions and rotate both access keys. These actions are queued and awaiting your confirmation in the response center.`;
    }
    if (s.includes("inc-2214") || s.includes("what should") || s.includes("what do") || s.includes("recommend") || s.includes("respond") || s.includes("do about")) {
      return `Fact — INC-2214 chains four signals into one campaign: IAM privilege escalation (T+0), impossible travel (T+15m), secrets enumeration from the checkout pod, and TOR egress. The payments DB shows 6.4× query volume on card_tokens.\nInference — the attacker is inside the payments namespace and probing toward card data. The pod is already network-quarantined, so the remaining risk is stolen credentials.\nRecommendation, in order — 1) revoke IRSA credentials for checkout-sa, 2) disable svc-deploy, 3) block 185.220.101.34 fleet-wide, 4) audit card_tokens access for the last 24h. Steps 1–3 are queued in the response center.`;
    }
    if (s.includes("container") || s.includes("pod")) {
      return `Fact — checkout-api-7d9f4b (payments namespace) performed 14 secret list/get calls in 90s, SYN-scanned 61 hosts in its subnet, then opened a 47-second TLS session to a TOR exit node. The response engine quarantined its network namespace ${timeAgo(Date.now() - 18 * 60000)}.\nInference — compromise likely arrived via the service-account token with an extended 12h lifetime.\nRecommendation — revoke the token, rebuild the pod from a clean image, and cap projected token lifetimes at 1h cluster-wide.`;
    }
    return `Fact — posture score is 71/100 (+4 week-over-week). 3 critical detections remain active, 2 incidents are unresolved (INC-2214 critical, INC-2213 high), and 6 containment actions are queued.\nInference — the two incidents share the svc-deploy identity chain, so they should be worked as one campaign.\nRecommendation — start with the INC-2214 queue in the response center, then ask me to verify the finance-exports egress window.`;
  };

  const ask = (q: string) => {
    const question = q.trim();
    if (!question || thinking) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setThinking(true);
    const answer = compose(question);
    window.setTimeout(() => {
      setThinking(false);
      setMsgs((m) => [...m, { role: "ai", text: "" }]);
      let i = 0;
      timerRef.current = window.setInterval(() => {
        i += 3;
        const slice = answer.slice(0, i);
        setMsgs((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "ai", text: slice };
          return copy;
        });
        if (i >= answer.length && timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, 14);
    }, 650);
  };

  if (!analystOpen) return null;

  return (
    <div className="fixed inset-0 z-[85]">
      <div className="absolute inset-0 bg-abyss/70" onClick={() => setAnalystOpen(false)} />
      <div className="drawer-in absolute right-0 top-0 bottom-0 w-full max-w-[480px] panel border-l border-edge flex flex-col">
        <div className="px-5 py-4 border-b border-edge flex items-center gap-3">
          <span className="w-9 h-9 rounded-sm border border-sig/40 bg-sig/10 text-sig flex items-center justify-center"><Icon name="sparkle" size={17} /></span>
          <div className="flex-1">
            <div className="font-disp font-semibold text-[15px]">AI security analyst</div>
            <div className="font-mono text-[10px] text-dim">grounded in console telemetry · simulated</div>
          </div>
          <button onClick={() => setAnalystOpen(false)} className="text-dim hover:text-ink transition-colors p-1" aria-label="Close analyst"><Icon name="x" size={18} /></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[92%] rounded-sm px-4 py-3 text-[13px] leading-relaxed whitespace-pre-line ${m.role === "user" ? "border border-edge2 bg-panel2 text-ink" : "border border-sig/25 bg-sig/5 text-ink font-mono text-[12px]"}`}>
                {m.text}
                {m.role === "ai" && thinking === false && m.text === "" && <span className="caret text-sig">▍</span>}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="border border-sig/25 bg-sig/5 rounded-sm px-4 py-3 font-mono text-[12px] text-sig inline-flex items-center gap-2">
                <Icon name="pulse" size={13} className="animate-pulse" /> correlating telemetry…
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-2 flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => ask(c)} disabled={thinking} className="font-mono text-[10px] text-mut border border-edge rounded-sm px-2.5 py-1.5 hover:text-sig hover:border-sig/40 transition-colors disabled:opacity-40">
              {c}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-edge">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="Ask about alerts, incidents, resources…"
              className="flex-1 bg-panel2 border border-edge rounded-sm px-3.5 py-2.5 text-[13px] outline-none focus:border-sig/50 placeholder:text-dim transition-colors"
              aria-label="Ask the AI analyst"
            />
            <button onClick={() => ask(input)} disabled={thinking || !input.trim()} className="w-11 rounded-sm bg-sig text-abyss flex items-center justify-center hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-40" aria-label="Send">
              <Icon name="send" size={15} />
            </button>
          </div>
          <p className="font-mono text-[9.5px] text-dim mt-2.5 leading-relaxed">
            Answers distinguish <span style={{ color: SEV_META.INFO.hex }}>fact</span>, inference and recommendation.
            No real infrastructure is accessed; this assistant reasons over demo data only.
          </p>
        </div>
      </div>
    </div>
  );
}
