/* SENTINEL-X · database seeder
 *
 * Loads the schema and a representative slice of the telemetry dataset
 * into PostgreSQL so the REST API serves real (persisted) data.
 *
 * Usage:
 *   DATABASE_URL=postgres://postgres:sentinel@localhost:5432/sentinelx node server/seed.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

const RESOURCES = [
  ["r-eks-core", "prod-eks-core", "Kubernetes cluster", "AWS", "us-east-1", "prod", 58, 7, ["443", "6443"], 34, "eks-node-role", "Secrets enumeration from pod checkout-api", "critical", 5],
  ["r-pod-checkout", "checkout-api-7d9f4b", "Container / Pod", "AWS", "us-east-1", "prod", 41, 4, ["8080"], 21, "IRSA: checkout-sa", "Outbound connection to TOR exit node", "critical", 3],
  ["r-rds-payments", "prod-postgres-payments", "RDS database", "AWS", "us-east-1", "prod", 66, 2, ["5432"], 9, "rds-admin", "Query volume 6.4× baseline from pod network", "at-risk", 2],
  ["r-ec2-api", "prod-api-gateway-01", "EC2 instance", "AWS", "us-east-1", "prod", 63, 5, ["22", "443"], 17, "instance-profile/api-gw", "xmrig process spawned by www-data", "at-risk", 2],
  ["r-s3-finance", "finance-exports", "S3 bucket", "AWS", "us-east-1", "prod", 52, 1, [], 12, "svc-deploy", "4.2 GB egress to unclassified ASN in 20 min", "at-risk", 2],
  ["r-iam-svcdeploy", "svc-deploy", "IAM user", "AWS", "global", "prod", 37, 0, [], 15, "AKIA••••Q7F2", "Impossible travel: Oslo → Singapore in 41 min", "critical", 3],
  ["r-lambda-auth", "auth-token-refresh", "Lambda function", "AWS", "eu-west-1", "prod", 79, 1, [], 6, "lambda-exec-auth", "Invocation burst 22× baseline", "watch", 1],
  ["r-vpc-prod", "vpc-prod-use1", "VPC network", "AWS", "us-east-1", "prod", 74, 0, [], 8, "—", "Lateral port scan detected in subnet 10.0.4.0/24", "watch", 1],
  ["r-az-vm", "az-frontend-vm", "Virtual machine", "Azure", "westeurope", "prod", 81, 3, ["443"], 3, "az-managed-id/frontend", "Normal TLS traffic profile", "healthy", 0],
  ["r-az-sql", "az-crm-sql", "SQL database", "Azure", "westeurope", "prod", 77, 2, ["1433"], 4, "sql-admin", "Login from new ASN (Vilnius, LT)", "watch", 1],
  ["r-gcp-gke", "gcp-analytics-gke", "Kubernetes cluster", "GCP", "europe-west4", "staging", 88, 2, ["443"], 1, "gke-node-sa", "Scheduled batch jobs only", "healthy", 0],
  ["r-ec2-bastion", "ops-bastion-01", "EC2 instance", "AWS", "eu-west-1", "prod", 86, 1, ["22"], 1, "ssm-session", "212 failed SSH auth attempts blocked", "watch", 1],
];

const ALERTS = [
  ["AL-3127", "Container egress to known TOR exit node", "CRITICAL", 97, 12, "r-pod-checkout", "checkout-api-7d9f4b", "10.0.4.18 (pod)", "185.220.101.34:9001", "NET-EGRESS-TOR-01", "Pod initiated TLS to a curated TOR exit node 47s after mounting its SA token; no baseline egress exists.", "Isolate the pod, revoke IRSA credentials, block destination at network-policy level.", "ACTIVE"],
  ["AL-3126", "Kubernetes secrets enumeration from pod", "HIGH", 91, 18, "r-eks-core", "prod-eks-core / payments-ns", "sa:checkout-sa", "kube-apiserver", "K8S-SECRET-ENUM-04", "14 list/get secret calls across 3 namespaces in 90s.", "Restrict RBAC for checkout-sa; audit secret access 24h.", "ACTIVE"],
  ["AL-3124", "Impossible travel for IAM user svc-deploy", "CRITICAL", 96, 41, "r-iam-svcdeploy", "svc-deploy", "84.208.19.7 (Oslo, NO)", "103.28.55.12 (Singapore, SG)", "ID-IMPOSSIBLE-TRAVEL-02", "Sign-ins 41 min apart; ~10,300 km apart; MFA passed on second session only.", "Suspend user, revoke sessions and keys, force MFA re-enrollment.", "ACTIVE"],
  ["AL-3121", "AdministratorAccess policy attached to service account", "CRITICAL", 94, 56, "r-iam-svcdeploy", "svc-deploy", "sts:assumed-role/ci-runner", "iam:AttachUserPolicy", "IAM-PRIV-ESC-07", "Admin policy attached outside change window by an assumed CI role.", "Detach policy, quarantine CI runner identity, review CloudTrail.", "INVESTIGATING"],
  ["AL-3119", "Bulk S3 egress to unclassified ASN", "HIGH", 88, 74, "r-s3-finance", "finance-exports", "svc-deploy (AK •••Q7F2)", "45.134.26.0/24", "DATA-EGRESS-VOL-03", "4.2 GB read in 20 min toward an ASN with zero 90-day history.", "Bucket-level egress block for ASN; rotate access key.", "INVESTIGATING"],
  ["AL-3116", "Cryptomining process on production instance", "HIGH", 93, 132, "r-ec2-api", "prod-api-gateway-01", "www-data", "pool.minexmr.com:443", "PROC-CRYPTO-02", "xmrig executed from /dev/shm with CPU pinning.", "Isolate instance, capture forensic image, rebuild from golden AMI.", "ACTIVE"],
  ["AL-3114", "Brute force: 212 failed SSH authentications", "HIGH", 90, 168, "r-ec2-bastion", "ops-bastion-01", "141.98.10.60 (Vilnius, LT)", "10.2.1.30:22", "NET-BRUTEFORCE-SSH-01", "212 failed attempts across 14 usernames in 6 minutes.", "Block source IP; enforce key-only auth.", "CONTAINED"],
  ["AL-3107", "Lateral port scan inside production subnet", "MEDIUM", 82, 287, "r-vpc-prod", "vpc-prod-use1 / 10.0.4.0/24", "10.0.4.18 (pod)", "10.0.4.0/24", "NET-SCAN-LATERAL-02", "SYN scan across 61 hosts initiated by the compromised checkout pod.", "Default-deny network policy for the pod namespace.", "ACTIVE"],
];

const EVENTS = [
  ["e-01", 12, "network.egress", "CRITICAL", "10.0.4.18:41120", "185.220.101.34:9001", "checkout-api-7d9f4b", "sa:checkout-sa", "Outbound TLS to TOR exit node blocked post-detection", { bytes: 48213, protocol: "TLS1.3", verdict: "blocked" }],
  ["e-02", 18, "k8s.api", "HIGH", "sa:checkout-sa", "kube-apiserver", "prod-eks-core", "sa:checkout-sa", "14 secret list/get calls across 3 namespaces in 90s", { calls: 14, window_s: 90 }],
  ["e-03", 41, "identity.signin", "CRITICAL", "103.28.55.12", "signin.aws.amazon.com", "svc-deploy", "svc-deploy", "Console sign-in from Singapore; prior sign-in Oslo 41 min earlier", { mfa: "pass", delta_min: 41, risk: "impossible-travel" }],
  ["e-04", 56, "iam.policy", "CRITICAL", "sts:ci-runner", "iam.amazonaws.com", "svc-deploy", "ci-runner", "AttachUserPolicy AdministratorAccess outside change window", { policy: "AdministratorAccess", change_window: "no" }],
  ["e-08", 74, "storage.read", "HIGH", "45.134.26.11", "finance-exports.s3.amazonaws.com", "finance-exports", "svc-deploy", "GetObject burst: 31× baseline from unclassified ASN", { objects: 118, window_min: 20 }],
  ["e-09", 17, "network.scan", "MEDIUM", "10.0.4.18", "10.0.4.0/24", "vpc-prod-use1", "sa:checkout-sa", "SYN scan: 61 hosts, ports 22/3306/5432/6379", { hosts: 61, duration_s: 24 }],
  ["e-12", 13, "db.query", "MEDIUM", "10.0.4.18", "prod-postgres-payments:5432", "prod-postgres-payments", "checkout_app", "Query volume 6.4× baseline; SELECT on card_tokens", { ratio: 6.4, table: "card_tokens" }],
  ["e-13", 132, "process.exec", "HIGH", "www-data", "/dev/shm/.x/xmrig", "prod-api-gateway-01", "www-data", "xmrig executed with CPU pinning; stratum to pool.minexmr.com", { binary: "xmrig" }],
  ["e-15", 168, "ssh.auth", "HIGH", "141.98.10.60", "10.2.1.30:22", "ops-bastion-01", "multiple", "212 failed SSH password attempts across 14 usernames", { attempts: 212, outcome: "fail" }],
  ["e-16", 167, "response.action", "INFO", "sentinel-x engine", "sg-0a3c…", "ops-bastion-01", "system", "Source IP 141.98.10.60 blocked at security group", { action: "sg-deny" }],
  ["e-17", 238, "serverless.invoke", "MEDIUM", "events.amazonaws.com", "auth-token-refresh", "auth-token-refresh", "scheduled-rule", "Invocation burst: 1,840 calls in 5 min (baseline 82)", { invocations: 1840, baseline: 82 }],
  ["e-22", 402, "db.login", "LOW", "176.10.99.200", "az-crm-sql:1433", "az-crm-sql", "sql-svc", "Successful SQL login from unseen ASN (Vilnius, LT)", { asn: "AS62167", first_seen: "yes" }],
  ["e-23", 430, "k8s.deploy", "INFO", "ci-deployer", "kube-apiserver", "prod-eks-core", "ci-runner", "Rolling deployment checkout-api v2.14.1 completed", { replicas: 6 }],
  ["e-28", 150, "storage.policy", "MEDIUM", "svc-deploy", "s3.amazonaws.com", "finance-exports", "svc-deploy", "Bucket policy modified: PublicRead condition removed", { change: "policy-edit" }],
];

const INCIDENTS = [
  {
    id: "INC-2214", title: "Kubernetes credential compromise — payments namespace",
    severity: "CRITICAL", confidence: 96, status: "OPEN", ts: 12,
    summary: "Post-compromise behavior in the payments namespace: secrets enumeration, lateral scanning, TOR egress. Same identity chain escalated IAM privileges 44 minutes earlier.",
    resourceIds: ["r-pod-checkout", "r-eks-core", "r-rds-payments", "r-iam-svcdeploy"],
    users: ["svc-deploy", "sa:checkout-sa", "ci-runner"], ips: ["185.220.101.34", "84.208.19.7", "103.28.55.12"], geo: ["Oslo, NO", "Singapore, SG", "TOR exit — DE"],
    mitre: ["T1078 Valid Accounts", "T1548 Abuse Elevation Control", "T1041 Exfiltration Over C2"],
    timeline: [
      { ts: 56, label: "Privilege escalation", detail: "AdministratorAccess attached to svc-deploy by assumed role ci-runner.", kind: "attack" },
      { ts: 41, label: "Impossible travel", detail: "svc-deploy signs in from Oslo, then Singapore 41 minutes later.", kind: "attack" },
      { ts: 19, label: "Detection: secrets enumeration", detail: "Rule K8S-SECRET-ENUM-04 fires on 14 secret calls in 90s.", kind: "detect" },
      { ts: 18, label: "Pod isolated (automatic)", detail: "Response engine quarantined the pod's network namespace.", kind: "action" },
    ],
    recommendations: ["Isolate workload checkout-api-7d9f4b", "Revoke IRSA credentials for checkout-sa", "Block IP 185.220.101.34", "Disable user svc-deploy"],
    notes: [], relatedEventIds: ["e-01", "e-02", "e-04", "e-09", "e-12"],
  },
  {
    id: "INC-2213", title: "IAM privilege escalation — svc-deploy identity chain",
    severity: "HIGH", confidence: 92, status: "INVESTIGATING", ts: 41,
    summary: "CI runner role assumed administrator rights and modified svc-deploy outside the change window. Likely the initial-access phase of INC-2214.",
    resourceIds: ["r-iam-svcdeploy"], users: ["svc-deploy", "ci-runner"], ips: ["84.208.19.7", "103.28.55.12"], geo: ["Oslo, NO", "Singapore, SG"],
    mitre: ["T1078.004 Cloud Accounts", "T1098 Account Manipulation"],
    timeline: [
      { ts: 56, label: "Policy attachment", detail: "iam:AttachUserPolicy executed for AdministratorAccess.", kind: "attack" },
      { ts: 41, label: "Detection: impossible travel", detail: "Rule ID-IMPOSSIBLE-TRAVEL-02 fires.", kind: "detect" },
    ],
    recommendations: ["Disable user svc-deploy", "Revoke credentials for ci-runner"], notes: [], relatedEventIds: ["e-03", "e-04"],
  },
];

const RULES = [
  ["NET-BRUTEFORCE-SSH-01", "SSH brute force", "More than 10 failed SSH authentications from one source IP.", "HIGH", true, 34, 2, 168, "count(ssh.auth fail) group by source_ip", "5m", 10],
  ["ID-IMPOSSIBLE-TRAVEL-02", "Impossible travel", "Sign-ins from incompatible locations within an impossible interval.", "CRITICAL", true, 6, 1, 41, "geo.distance/delta_time > 900 km/h", "60m", 900],
  ["NET-EGRESS-TOR-01", "Egress to TOR / anonymizers", "Outbound connection to curated TOR exit and anonymizer lists.", "CRITICAL", true, 3, 0, 12, "destination.ip in threatlist('tor-exit')", "realtime", 1],
  ["IAM-PRIV-ESC-07", "Admin policy attachment", "AdministratorAccess attached outside an approved change window.", "CRITICAL", true, 2, 0, 56, "iam:AttachUserPolicy && policy.is_admin && !change_window", "realtime", 1],
  ["K8S-SECRET-ENUM-04", "Kubernetes secrets enumeration", "Burst of secret list/get operations across namespaces.", "HIGH", true, 5, 1, 18, "count(k8s list/get secrets) group by sa", "5m", 8],
  ["DATA-EGRESS-VOL-03", "Anomalous data egress volume", "Object-store reads > 3σ baseline toward a new ASN.", "HIGH", true, 4, 1, 74, "sum(bytes_out) > 3σ && asn.first_seen", "30m", 3],
  ["PROC-CRYPTO-02", "Cryptomining process", "Known mining binaries or stratum signatures on a host.", "HIGH", true, 7, 0, 132, "process.name in miner_signatures", "realtime", 1],
  ["SRVLESS-BURST-05", "Serverless invocation burst", "Invocation rate above 3σ for the same hour-of-week.", "MEDIUM", false, 11, 4, 238, "rate(invocations) > 3σ sustained 5m", "5m", 3],
  ["ID-ROOT-LOGIN-01", "Root account usage", "Root authentication outside operating regions.", "HIGH", true, 3, 0, 201, "identity.type == 'root' && region != operating_region", "realtime", 1],
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("● connected to", process.env.DATABASE_URL.replace(/:[^:@]+@/, ":••••@"));

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await client.query(schema);
  console.log("● schema ready");

  for (const t of ["audit_log", "incident_resources", "incidents", "alerts", "events", "resources", "rules", "analysts"]) {
    await client.query(`DELETE FROM ${t}`);
  }

  for (const r of RESOURCES) {
    await client.query(
      `INSERT INTO resources VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, r
    );
  }
  for (const [id, min, type, severity, source, destination, resource, actor, message, payload] of EVENTS) {
    await client.query(
      `INSERT INTO events VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, ago(min), type, severity, source, destination, resource, actor, message, JSON.stringify(payload)]
    );
  }
  for (const [id, name, severity, confidence, min, resourceId, resource, source, destination, rule, reason, recommendation, status] of ALERTS) {
    await client.query(
      `INSERT INTO alerts VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, name, severity, confidence, ago(min), resourceId, resource, source, destination, rule, reason, recommendation, status]
    );
  }
  for (const inc of INCIDENTS) {
    const { resourceIds, ...rest } = inc;
    const payload = { ...rest };
    delete payload.id; delete payload.title; delete payload.severity; delete payload.confidence; delete payload.status; delete payload.ts; delete payload.summary;
    payload.timeline = inc.timeline.map((t) => ({ ...t, ts: Date.now() - t.ts * 60000 }));
    await client.query(
      `INSERT INTO incidents (id,title,severity,confidence,status,ts,summary,payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [inc.id, inc.title, inc.severity, inc.confidence, inc.status, ago(inc.ts), inc.summary, JSON.stringify(payload)]
    );
    for (const rid of resourceIds) {
      await client.query(`INSERT INTO incident_resources VALUES ($1,$2)`, [inc.id, rid]);
    }
  }
  for (const [id, name, description, severity, enabled, triggers, fp, lastMin, logic, window, threshold] of RULES) {
    await client.query(
      `INSERT INTO rules VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, name, description, severity, enabled, triggers, fp, ago(lastMin), logic, window, threshold]
    );
  }

  const hash = bcrypt.hashSync(process.env.SEED_ANALYST_PASSWORD || "sentinel-demo", 10);
  await client.query(`INSERT INTO analysts (email, pass_hash, role) VALUES ($1,$2,'analyst')`, ["analyst@sentinel-x.local", hash]);
  console.log("● seeded: 12 resources · 14 events · 8 alerts · 2 incidents · 9 rules · 1 analyst");
  console.log("● login: analyst@sentinel-x.local / " + (process.env.SEED_ANALYST_PASSWORD || "sentinel-demo"));
  await client.end();
}

main().catch((e) => { console.error("✗ seed failed:", e.message); process.exit(1); });
