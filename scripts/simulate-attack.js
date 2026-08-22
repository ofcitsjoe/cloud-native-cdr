#!/usr/bin/env node
/* SENTINEL-X · Terminal Attack Simulator
 *
 * Emulates an attacker attempting unauthorized cloud actions from the terminal.
 * Sends the telemetry to the Sentinel-X backend so you can watch the live alert,
 * incident correlation, and mitigation script appear on the web dashboard.
 */

import readline from "readline";

const API_BASE = process.env.API_URL || "http://localhost:8080";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askPrompt = (q) => new Promise((resolve) => rl.question(q, resolve));

const ATTACK_PRESETS = [
  {
    id: "1",
    name: "Unauthorized IAM Privilege Escalation (AdministratorAccess)",
    payload: {
      type: "UNAUTHORIZED_IAM_ACCESS",
      user: "attacker-ci-session",
      target: "iam:AttachUserPolicy",
      resource: "arn:aws:iam::123456789012:user/svc-deploy",
      sourceIp: "185.220.101.99",
      details: "Adversary session 'attacker-ci-session' attempted to attach AdministratorAccess policy to svc-deploy without MFA approval.",
    },
  },
  {
    id: "2",
    name: "Unauthorized S3 Data Exfiltration Probe (finance-exports)",
    payload: {
      type: "UNAUTHORIZED_S3_ACCESS",
      user: "unknown-external-ip",
      target: "s3:GetObject",
      resource: "arn:aws:s3:::finance-exports/q4_payroll_records.parquet",
      sourceIp: "198.51.100.44",
      details: "Unauthorized bulk GET request on restricted PCI bucket finance-exports from unclassified external IP 198.51.100.44.",
    },
  },
  {
    id: "3",
    name: "Kubernetes Cluster-Admin Secrets Theft (checkout pod)",
    payload: {
      type: "K8S_SECRETS_THEFT",
      user: "system:serviceaccount:payments:checkout-sa",
      target: "k8s:secrets:get",
      resource: "k8s/kube-system/cluster-admin-token",
      sourceIp: "10.0.3.41",
      details: "Pod checkout-api-7d9f4b attempted unauthorized secret retrieval in kube-system namespace.",
    },
  },
];

async function sendAttack(payload) {
  console.log("\x1b[33m%s\x1b[0m", `\n[LAUNCHING ATTACK] Sending unauthorized payload to ${API_BASE}/api/simulate-attack...`);

  try {
    const res = await fetch(`${API_BASE}/api/simulate-attack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log("\x1b[32m%s\x1b[0m", "✔ Attack telemetry successfully ingested by SENTINEL-X!");
    console.log("\x1b[31m%s\x1b[0m", `\n🚨 [ALERT GENERATED] ${data.alert.id}: ${data.alert.name}`);
    console.log(`Target: ${data.alert.resource} | Severity: ${data.alert.severity} | Confidence: ${data.alert.confidence}%`);
    console.log(`Reason: ${data.alert.reason}`);

    console.log("\x1b[36m%s\x1b[0m", `\n🛡️ [RECOMMENDED REMEDIATION]`);
    console.log(data.recommendedRemediation);

    console.log("\x1b[35m%s\x1b[0m", `\n🌐 Check your browser dashboard at http://localhost:5173 to see the alert and incident live in real time!`);
  } catch (err) {
    console.error("\x1b[31m%s\x1b[0m", `Failed to send attack: ${err.message}. (Make sure 'npm run server' is running on port 8080)`);
  }
}

async function main() {
  console.log("\x1b[31m%s\x1b[0m", `
  ┌─────────────────────────────────────────────────────────────┐
  │         SENTINEL-X · Live Attack Simulator Tool             │
  │  Simulates unauthorized cloud API calls from terminal       │
  └─────────────────────────────────────────────────────────────┘
  `);

  console.log("Select an attack scenario to simulate:");
  ATTACK_PRESETS.forEach((a) => {
    console.log(`  ${a.id}. ${a.name}`);
  });
  console.log("  4. Custom Unauthorized Action (type your own parameters)");
  console.log("  5. Exit");

  const choice = await askPrompt("\nEnter choice (1-5): ");

  if (choice === "1" || choice === "2" || choice === "3") {
    const preset = ATTACK_PRESETS.find((p) => p.id === choice);
    await sendAttack(preset.payload);
  } else if (choice === "4") {
    const user = await askPrompt("Enter user identity (e.g. attacker-cli): ") || "attacker-cli";
    const target = await askPrompt("Enter unauthorized API action (e.g. s3:DeleteBucket): ") || "s3:DeleteBucket";
    const resource = await askPrompt("Enter target resource (e.g. prod-customer-data): ") || "prod-customer-data";
    await sendAttack({
      type: "CUSTOM",
      user,
      target,
      resource,
      sourceIp: "203.0.113.88",
      details: `Adversary '${user}' attempted unauthorized '${target}' on '${resource}'.`,
    });
  } else {
    console.log("Exiting.");
  }

  rl.close();
  process.exit(0);
}

main();
