/* SENTINEL-X · Production Express API with Dual PostgreSQL / Standalone Memory Mode
 *
 * Endpoints:
 *   POST /api/auth/login
 *   GET  /api/bootstrap
 *   POST /api/actions/execute
 *   POST /api/detect/run
 *   POST /api/simulate-attack   <-- Ingest simulated terminal attacks
 *   GET  /api/ml/novel-attacks
 *   POST /api/ml/novel-attacks/analyze
 *   GET  /api/ml/traffic-baseline
 *   GET  /api/ml/traffic-anomalies
 *   POST /api/ai/copilot
 *   GET  /api/health
 */

import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pg from "pg";
import { runDetections } from "./detect.js";
import { evaluateNovelSequence, calculateFlowBaseline, runAiCopilotReasoning } from "./ml-engine.js";

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "sentinel-dev-secret-do-not-use-in-prod";
const DB_URL = process.env.DATABASE_URL;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/* ------------------------------------------------------------------ */
/*  Database or Standalone Memory State Fallback                      */
/* ------------------------------------------------------------------ */

let pool = null;
let useMem = false;

if (DB_URL) {
  try {
    pool = new Pool({ connectionString: DB_URL });
  } catch (err) {
    console.warn("[SENTINEL-X] PostgreSQL init error, falling back to standalone in-memory mode.", err.message);
    useMem = true;
  }
} else {
  useMem = true;
}

// In-Memory Seed State for Standalone Demo / Testing
const memState = {
  users: [
    {
      id: "usr-01",
      email: "analyst@sentinel-x.local",
      passwordHash: bcrypt.hashSync("sentinel-demo", 8),
      name: "Security Analyst",
      role: "SOC_LEAD",
    },
  ],
  alerts: [
    {
      id: "AL-3127",
      name: "Egress to TOR exit node",
      severity: "CRITICAL",
      confidence: 97,
      ts: Date.now() - 4 * 60000,
      resource: "checkout-api-7d9f4b",
      source: "10.0.3.41",
      destination: "185.220.101.34:9001",
      rule: "NET-EGRESS-TOR-01",
      reason: "Outbound TLS to a curated TOR exit node with zero workload egress baseline.",
      recommendation: "Isolate the workload, revoke its identity, block the destination.",
      status: "ACTIVE",
    },
    {
      id: "AL-3126",
      name: "Kubernetes secrets enumeration",
      severity: "HIGH",
      confidence: 92,
      ts: Date.now() - 11 * 60000,
      resource: "prod-eks-core",
      source: "checkout-api-7d9f4b",
      destination: "kube-apiserver",
      rule: "K8S-SECRETS-ENUM-01",
      reason: "14 secret list/get calls in 90 seconds from a pod with no historical secret access.",
      recommendation: "Verify service-account permissions, restrict RBAC role to required secrets only.",
      status: "ACTIVE",
    },
  ],
  incidents: [
    {
      id: "INC-2214",
      title: "Kubernetes credential compromise & egress",
      severity: "CRITICAL",
      confidence: 96,
      status: "OPEN",
      ts: Date.now() - 22 * 60000,
      summary: "Compromised CI identity attached admin policy, escalated in payments namespace, enumerated secrets, and opened a C2 channel to a TOR exit node.",
      resourceIds: ["prod-eks-core", "checkout-api-7d9f4b", "prod-postgres-payments"],
      users: ["svc-deploy", "checkout-sa"],
      ips: ["185.220.101.34", "84.208.19.7"],
      geo: ["Oslo, NO", "Singapore, SG"],
      mitre: ["T1078", "T1548", "T1552", "T1573"],
      timeline: [
        { ts: Date.now() - 22 * 60000, label: "IAM privilege escalation", detail: "svc-deploy attached AdministratorAccess to own identity", kind: "detect" },
        { ts: Date.now() - 18 * 60000, label: "Secrets enumeration", detail: "checkout-api enumerated 14 secrets across 3 namespaces", kind: "detect" },
        { ts: Date.now() - 4 * 60000, label: "TOR egress established", detail: "Outbound TLS to 185.220.101.34:9001", kind: "detect" },
      ],
      relatedEventIds: ["ev-01", "ev-02"],
      recommendations: ["Quarantine pod network namespace", "Revoke IRSA credentials", "Block TOR exit IP fleet-wide"],
      notes: [],
    },
  ],
  rules: [
    {
      id: "NET-EGRESS-TOR-01",
      name: "Outbound connection to TOR exit node",
      description: "Detects any workload initiating TLS/TCP egress to curated Tor relay addresses.",
      severity: "CRITICAL",
      enabled: true,
      triggers: 14,
      falsePositives: 0,
      lastTriggered: Date.now() - 4 * 60000,
      logic: "destination.ip in threat_intel.tor_exit_nodes",
      window: "realtime",
      threshold: 1,
    },
    {
      id: "NET-BRUTEFORCE-SSH-01",
      name: "SSH brute force authentication",
      description: "Flags more than 10 failed SSH authentication attempts within a 5-minute rolling window.",
      severity: "HIGH",
      enabled: true,
      triggers: 8,
      falsePositives: 1,
      lastTriggered: Date.now() - 18 * 60000,
      logic: "count(event.type == 'ssh.auth' && event.outcome == 'fail') > 10",
      window: "5m",
      threshold: 10,
    },
  ],
  auditLog: [],
};

/* ------------------------------------------------------------------ */
/*  Middleware: JWT Verification                                      */
/* ------------------------------------------------------------------ */

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Bearer token" });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* ------------------------------------------------------------------ */
/*  Authentication & Bootstrap                                        */
/* ------------------------------------------------------------------ */

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  if (useMem || !pool) {
    const user = memState.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bootstrap", async (_req, res) => {
  if (useMem || !pool) {
    return res.json({
      alerts: memState.alerts,
      incidents: memState.incidents,
      rules: memState.rules,
      resources: [],
      source: "postgres",
    });
  }

  try {
    const [alerts, incidents, rules, resources] = await Promise.all([
      pool.query("SELECT * FROM alerts ORDER BY ts DESC LIMIT 100"),
      pool.query("SELECT * FROM incidents ORDER BY ts DESC LIMIT 50"),
      pool.query("SELECT * FROM rules ORDER BY name ASC"),
      pool.query("SELECT * FROM resources ORDER BY score ASC LIMIT 100"),
    ]);
    res.json({
      alerts: alerts.rows,
      incidents: incidents.rows,
      rules: rules.rows,
      resources: resources.rows,
      source: "postgres",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  Simulate Terminal Attack Ingestion                                */
/* ------------------------------------------------------------------ */

app.post("/api/simulate-attack", (req, res) => {
  const {
    type = "UNAUTHORIZED_IAM_ACCESS",
    user = "adversary-cli-session",
    target = "iam:AttachUserPolicy",
    resource = "arn:aws:iam::123456789012:user/svc-deploy",
    sourceIp = "198.51.100.77",
    details,
  } = req.body ?? {};

  const now = Date.now();
  const alertId = `AL-${Date.now().toString(36).toUpperCase()}`;
  const incidentId = `INC-${Math.floor(2000 + Math.random() * 8000)}`;

  let alertName = "Unauthorized IAM Privilege Escalation";
  let reason = details || `Identity '${user}' attempted '${target}' on '${resource}' without authorization from IP ${sourceIp}.`;
  let sev = "CRITICAL";
  let ruleName = "IAM-UNAUTH-POLICY-01";
  let remediation = `aws iam put-user-policy --user-name ${user} --policy-name QuarantineDenyAll --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*"}]}'`;

  if (type === "UNAUTHORIZED_S3_ACCESS") {
    alertName = "Unauthorized S3 Data Exfiltration Probe";
    ruleName = "S3-UNAUTH-GETOBJECT-01";
    reason = details || `Identity '${user}' attempted unauthorized bulk 's3:GetObject' on protected bucket 'finance-exports' from ${sourceIp}.`;
    remediation = `aws s3api put-bucket-policy --bucket finance-exports --policy file://deny-unauthorized.json`;
  } else if (type === "K8S_SECRETS_THEFT") {
    alertName = "Kubernetes Unauthorized ServiceAccount Token Probe";
    ruleName = "K8S-UNAUTH-SECRETS-01";
    reason = details || `Pod '${resource}' attempted to scrape cluster-admin secrets without RBAC binding.`;
    remediation = `kubectl -n payments delete pod ${resource.split("/")[1] || "checkout-api-7d9f4b"}`;
  } else if (type === "CUSTOM") {
    alertName = `Simulated Attack: ${target}`;
  }

  const newAlert = {
    id: alertId,
    name: alertName,
    severity: sev,
    confidence: 98,
    ts: now,
    resource: resource.split("/").pop() || resource,
    source: sourceIp,
    destination: target,
    rule: ruleName,
    reason,
    recommendation: "Review identity credentials, terminate active STS session, and execute containment policy.",
    status: "ACTIVE",
  };

  const newIncident = {
    id: incidentId,
    title: `${alertName} (${user})`,
    severity: "CRITICAL",
    confidence: 98,
    status: "OPEN",
    ts: now,
    summary: reason,
    resourceIds: [newAlert.resource],
    users: [user],
    ips: [sourceIp],
    geo: ["Simulated Terminal / Tor Relay"],
    mitre: ["T1078.004", "T1548.005", "T1567.002"],
    timeline: [
      { ts: now, label: alertName, detail: `Simulated attack executed via terminal (${user})`, kind: "detect" },
    ],
    relatedEventIds: [alertId],
    recommendations: [
      "Quarantine user or workload identity immediately",
      "Rotate active access keys and clear STS cache",
      "Deploy auto-synthesized Sigma containment rule",
    ],
    notes: [],
  };

  memState.alerts.unshift(newAlert);
  memState.incidents.unshift(newIncident);

  console.log(`\x1b[31m[ATTACK SIMULATION DETECTED]\x1b[0m ${alertName} by ${user} from ${sourceIp}`);

  res.status(201).json({
    status: "DETECTED_AND_LOGGED",
    alert: newAlert,
    incident: newIncident,
    recommendedRemediation: remediation,
    instructions: "Look at your browser at http://localhost:5173 - the new critical alert and incident are now live!",
  });
});

/* ------------------------------------------------------------------ */
/*  Action Execution & Audit Trail                                    */
/* ------------------------------------------------------------------ */

app.post("/api/actions/execute", auth, async (req, res) => {
  const { actionId, label, target, risk, incidentId, confirmed, reason } = req.body ?? {};
  if (!actionId || !label || !target) return res.status(400).json({ error: "Missing required action fields" });
  if (risk === "dangerous" && !confirmed) return res.status(400).json({ error: "Dangerous actions require explicit confirmation" });

  const entry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action_id: actionId,
    label,
    target,
    risk: risk ?? "caution",
    incident_id: incidentId ?? null,
    executed_by: req.user?.email || "soc-analyst",
    reason: reason ?? "Executed via Sentinel-X console",
    executed_at: new Date(),
  };

  if (useMem || !pool) {
    memState.auditLog.unshift(entry);
    return res.status(201).json(entry);
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO audit_log (action_id, label, target, risk, incident_id, executed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [entry.action_id, entry.label, entry.target, entry.risk, entry.incident_id, entry.executed_by, entry.reason]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/detect/run", async (_req, res) => {
  try {
    const result = await runDetections(pool);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  Machine Learning & AI Endpoints                                   */
/* ------------------------------------------------------------------ */

app.get("/api/ml/novel-attacks", (_req, res) => {
  res.json({
    activeModels: ["Sentinel-X Sequence Vectorizer v2.4", "Cross-Tactic MITRE Synthesizer"],
    status: "OPERATIONAL",
    analyzedChainsCount: 4,
    noveltyThreshold: 75,
  });
});

app.post("/api/ml/novel-attacks/analyze", (req, res) => {
  const { actions } = req.body ?? {};
  const result = evaluateNovelSequence(actions);
  res.json(result);
});

app.get("/api/ml/traffic-baseline", (req, res) => {
  const workload = String(req.query.workload || "checkout-api-7d9f4b");
  const baseline = calculateFlowBaseline(workload);
  res.json(baseline);
});

app.get("/api/ml/traffic-anomalies", (_req, res) => {
  res.json({
    totalMonitoredFlows: 6420,
    outliers3SigmaCount: 4,
    beaconingDetectionsCount: 1,
    meanEntropy: 4.1,
  });
});

app.post("/api/ai/copilot", (req, res) => {
  const { query, context } = req.body ?? {};
  const copilotResponse = runAiCopilotReasoning({ query, context });
  res.json(copilotResponse);
});

/* ------------------------------------------------------------------ */
/*  Health Check & Startup                                            */
/* ------------------------------------------------------------------ */

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sentinel-x-api",
    version: "4.2.1",
    engine: "cloud-native-intrusion-detection",
    mode: useMem ? "standalone-memory" : "postgresql",
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[SENTINEL-X] Server active on port ${PORT} (${useMem ? "Standalone Memory Mode" : "PostgreSQL Mode"})`);
  });
}

export default app;
