#!/usr/bin/env node
/* SENTINEL-X · Terminal Interactive Test & Copilot CLI
 *
 * Allows SOC analysts and testers to query the AI Copilot, test novel attack
 * sequence vectors, calculate traffic baselines, and trigger actions directly
 * from their terminal.
 */

import readline from "readline";

const API_BASE = process.env.API_URL || "http://localhost:8080";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askPrompt = (q) => new Promise((resolve) => rl.question(q, resolve));

function printBanner() {
  console.log("\x1b[36m%s\x1b[0m", `
  ┌─────────────────────────────────────────────────────────────┐
  │  SENTINEL-X · Cloud-Native IDR & AI Analyst Terminal CLI    │
  │  Target API: ${API_BASE.padEnd(46)} │
  └─────────────────────────────────────────────────────────────┘
  `);
}

async function queryAiCopilot(query) {
  console.log("\x1b[33m%s\x1b[0m", `[AI Analyst] Thinking about: "${query}"...`);
  try {
    const res = await fetch(`${API_BASE}/api/ai/copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log("\n\x1b[32m%s\x1b[0m", "--- Fact ---");
    console.log(data.fact);
    console.log("\n\x1b[34m%s\x1b[0m", "--- Inference ---");
    console.log(data.inference);
    console.log("\n\x1b[35m%s\x1b[0m", "--- Recommendation ---");
    console.log(data.recommendation);
    if (data.blastRadius) {
      console.log("\n\x1b[31m%s\x1b[0m", "--- Blast Radius ---");
      console.log(data.blastRadius);
    }
    if (data.remediationPlaybook && data.remediationPlaybook.kubectl) {
      console.log("\n\x1b[36m%s\x1b[0m", "--- Remediation Script (Kubectl) ---");
      console.log(data.remediationPlaybook.kubectl);
    }
    console.log("");
  } catch (err) {
    console.error("\x1b[31m%s\x1b[0m", `Error querying AI Copilot: ${err.message}. (Is the backend running on ${API_BASE}? Run 'npm run server' in another tab)`);
  }
}

async function testNovelAttackSimulator(actionsStr) {
  const actions = actionsStr.split(",").map((s) => s.trim()).filter(Boolean);
  console.log("\x1b[33m%s\x1b[0m", `[ML Engine] Vectorizing sequence (${actions.length} steps)...`);
  try {
    const res = await fetch(`${API_BASE}/api/ml/novel-attacks/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log("\n\x1b[32m%s\x1b[0m", `Novelty Score: ${data.noveltyScore}/100 (Confidence: ${data.confidence}%)`);
    console.log(`Is Novel Mutation: ${data.isNovelAttack ? "YES [ALERT]" : "NO [STANDARD]"}`);
    console.log("\x1b[36m%s\x1b[0m", "Synthesized TTPs:");
    data.synthesizedTechniques.forEach((t) => console.log(`  • ${t}`));
    console.log("\n\x1b[34m%s\x1b[0m", "Explanation:");
    console.log(data.explanation);

    if (data.generatedSigmaRule) {
      console.log("\n\x1b[33m%s\x1b[0m", "Auto-Synthesized Sigma Rule:");
      console.log(data.generatedSigmaRule);
    }
    console.log("");
  } catch (err) {
    console.error("\x1b[31m%s\x1b[0m", `Error evaluating sequence: ${err.message}`);
  }
}

async function fetchTrafficBaseline(workload) {
  console.log("\x1b[33m%s\x1b[0m", `[Flow Engine] Calculating 24h baseline for ${workload}...`);
  try {
    const res = await fetch(`${API_BASE}/api/ml/traffic-baseline?workload=${encodeURIComponent(workload)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log("\x1b[32m%s\x1b[0m", `\n3-Sigma Upper Threshold: ${data.historical3SigmaMbps} Mbps`);
    console.log("Recent Flow Telemetry (Last 5 Points):");
    const sample = data.points.slice(-5);
    sample.forEach((p) => {
      const status = p.isAnomaly ? `\x1b[31m[3σ BREACH - ${p.actualThroughputMbps} Mbps]\x1b[0m` : `\x1b[32m[NORMAL - ${p.actualThroughputMbps} Mbps]\x1b[0m`;
      console.log(`  ${p.timeLabel} | Mean: ${p.baselineMeanMbps} Mbps | Upper 3σ: ${p.baselineUpper3SigmaMbps} Mbps | Actual: ${status}`);
    });
    console.log("");
  } catch (err) {
    console.error("\x1b[31m%s\x1b[0m", `Error fetching baseline: ${err.message}`);
  }
}

async function main() {
  printBanner();

  while (true) {
    console.log("\x1b[1m%s\x1b[0m", "Choose an action:");
    console.log("  1. Chat with AI Security Analyst (e.g. 'Why is checkout-api anomalous?')");
    console.log("  2. Test Novel Attack Sequence Simulator (MITRE TTP permutation)");
    console.log("  3. Fetch 24-Hour Traffic Flow 3-Sigma Baseline");
    console.log("  4. Check Server Health");
    console.log("  5. Exit");

    const choice = await askPrompt("\nEnter choice (1-5): ");

    if (choice === "1") {
      const q = await askPrompt("\nEnter question for AI Analyst: ");
      if (q.trim()) await queryAiCopilot(q.trim());
    } else if (choice === "2") {
      console.log("Example: T1078 Valid Cloud Accounts, STS AssumeRole, Micro-session token rotation, Distributed S3 egress");
      const steps = await askPrompt("Enter comma-separated actions: ");
      if (steps.trim()) await testNovelAttackSimulator(steps.trim());
    } else if (choice === "3") {
      const w = await askPrompt("Enter workload ID (default: checkout-api-7d9f4b): ");
      await fetchTrafficBaseline(w.trim() || "checkout-api-7d9f4b");
    } else if (choice === "4") {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        console.log("\n\x1b[32m%s\x1b[0m\n", JSON.stringify(data, null, 2));
      } catch (err) {
        console.error("\x1b[31m%s\x1b[0m\n", `Server unreachable: ${err.message}`);
      }
    } else if (choice === "5" || choice.toLowerCase() === "exit") {
      console.log("Goodbye.");
      rl.close();
      process.exit(0);
    } else {
      console.log("Invalid option, try again.\n");
    }
  }
}

main();
