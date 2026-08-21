/* ------------------------------------------------------------------ */
/*  SENTINEL-X simulated telemetry model.                              */
/*  All data below is synthetic and internally consistent — no real    */
/*  cloud account is accessed. In production this module is replaced   */
/*  by API services backed by PostgreSQL + the detection engine.       */
/* ------------------------------------------------------------------ */

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type AlertStatus = "ACTIVE" | "INVESTIGATING" | "CONTAINED" | "FALSE_POSITIVE";
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "CONTAINED" | "RESOLVED";
export type Provider = "AWS" | "Azure" | "GCP";

export const NOW = Date.now();
export const ago = (minutes: number) => NOW - minutes * 60_000;

export const SEV_META: Record<Severity, { hex: string; label: string }> = {
  CRITICAL: { hex: "#FF5D55", label: "Critical" },
  HIGH: { hex: "#FF9838", label: "High" },
  MEDIUM: { hex: "#FFCE5C", label: "Medium" },
  LOW: { hex: "#5CB8FF", label: "Low" },
  INFO: { hex: "#8FA0AE", label: "Info" },
};

export const ALERT_STATUS_META: Record<AlertStatus, { hex: string; label: string }> = {
  ACTIVE: { hex: "#FF5D55", label: "Active" },
  INVESTIGATING: { hex: "#FFCE5C", label: "Investigating" },
  CONTAINED: { hex: "#2FD6B5", label: "Contained" },
  FALSE_POSITIVE: { hex: "#5D6C79", label: "False positive" },
};

export const INCIDENT_STATUS_META: Record<IncidentStatus, { hex: string; label: string }> = {
  OPEN: { hex: "#FF5D55", label: "Open" },
  INVESTIGATING: { hex: "#FFCE5C", label: "Investigating" },
  CONTAINED: { hex: "#2FD6B5", label: "Contained" },
  RESOLVED: { hex: "#5D6C79", label: "Resolved" },
};

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fmtClock(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(11, 19) + "Z";
}

export function fmtDay(ts: number): string {
  return new Date(ts).toISOString().slice(5, 10);
}

/* ------------------------------- resources ------------------------------ */

export interface ResourceItem {
  id: string;
  name: string;
  type: string;
  provider: Provider;
  region: string;
  env: "prod" | "staging" | "dev";
  score: number;
  vulns: number;
  openPorts: string[];
  suspicious: number;
  identity: string;
  activity: string;
  status: "healthy" | "watch" | "at-risk" | "critical";
  alerts: number;
}

export const RESOURCES: ResourceItem[] = [
  { id: "r-eks-core", name: "prod-eks-core", type: "Kubernetes cluster", provider: "AWS", region: "us-east-1", env: "prod", score: 58, vulns: 7, openPorts: ["443", "6443"], suspicious: 34, identity: "eks-node-role", activity: "Secrets enumeration from pod checkout-api", status: "critical", alerts: 5 },
  { id: "r-pod-checkout", name: "checkout-api-7d9f4b", type: "Container / Pod", provider: "AWS", region: "us-east-1", env: "prod", score: 41, vulns: 4, openPorts: ["8080"], suspicious: 21, identity: "IRSA: checkout-sa", activity: "Outbound connection to TOR exit node", status: "critical", alerts: 3 },
  { id: "r-rds-payments", name: "prod-postgres-payments", type: "RDS database", provider: "AWS", region: "us-east-1", env: "prod", score: 66, vulns: 2, openPorts: ["5432"], suspicious: 9, identity: "rds-admin", activity: "Query volume 6.4× baseline from pod network", status: "at-risk", alerts: 2 },
  { id: "r-ec2-api", name: "prod-api-gateway-01", type: "EC2 instance", provider: "AWS", region: "us-east-1", env: "prod", score: 63, vulns: 5, openPorts: ["22", "443"], suspicious: 17, identity: "instance-profile/api-gw", activity: "xmrig process spawned by www-data", status: "at-risk", alerts: 2 },
  { id: "r-s3-finance", name: "finance-exports", type: "S3 bucket", provider: "AWS", region: "us-east-1", env: "prod", score: 52, vulns: 1, openPorts: [], suspicious: 12, identity: "svc-deploy", activity: "4.2 GB egress to unclassified ASN in 20 min", status: "at-risk", alerts: 2 },
  { id: "r-iam-svcdeploy", name: "svc-deploy", type: "IAM user", provider: "AWS", region: "global", env: "prod", score: 37, vulns: 0, openPorts: [], suspicious: 15, identity: "AKIA••••Q7F2", activity: "Impossible travel: Oslo → Singapore in 41 min", status: "critical", alerts: 3 },
  { id: "r-lambda-auth", name: "auth-token-refresh", type: "Lambda function", provider: "AWS", region: "eu-west-1", env: "prod", score: 79, vulns: 1, openPorts: [], suspicious: 6, identity: "lambda-exec-auth", activity: "Invocation burst 22× baseline", status: "watch", alerts: 1 },
  { id: "r-eks-payments", name: "payments-worker-5c8d", type: "Container / Pod", provider: "AWS", region: "us-east-1", env: "prod", score: 84, vulns: 2, openPorts: [], suspicious: 2, identity: "IRSA: payments-sa", activity: "Normal queue-processing pattern", status: "watch", alerts: 0 },
  { id: "r-vpc-prod", name: "vpc-prod-use1", type: "VPC network", provider: "AWS", region: "us-east-1", env: "prod", score: 74, vulns: 0, openPorts: [], suspicious: 8, identity: "—", activity: "Lateral port scan detected in subnet 10.0.4.0/24", status: "watch", alerts: 1 },
  { id: "r-az-vm", name: "az-frontend-vm", type: "Virtual machine", provider: "Azure", region: "westeurope", env: "prod", score: 81, vulns: 3, openPorts: ["443"], suspicious: 3, identity: "az-managed-id/frontend", activity: "Normal TLS traffic profile", status: "healthy", alerts: 0 },
  { id: "r-az-sql", name: "az-crm-sql", type: "SQL database", provider: "Azure", region: "westeurope", env: "prod", score: 77, vulns: 2, openPorts: ["1433"], suspicious: 4, identity: "sql-admin", activity: "Login from new ASN (Vilnius, LT)", status: "watch", alerts: 1 },
  { id: "r-gcp-gke", name: "gcp-analytics-gke", type: "Kubernetes cluster", provider: "GCP", region: "europe-west4", env: "staging", score: 88, vulns: 2, openPorts: ["443"], suspicious: 1, identity: "gke-node-sa", activity: "Scheduled batch jobs only", status: "healthy", alerts: 0 },
  { id: "r-gcp-gcs", name: "ml-datasets-eu", type: "Cloud Storage", provider: "GCP", region: "europe-west4", env: "staging", score: 90, vulns: 0, openPorts: [], suspicious: 0, identity: "etl-sa@gcp", activity: "Read-heavy, baseline-consistent", status: "healthy", alerts: 0 },
  { id: "r-cf-img", name: "img-resize-worker", type: "Cloud function", provider: "GCP", region: "europe-west1", env: "dev", score: 93, vulns: 0, openPorts: [], suspicious: 0, identity: "cf-default-sa", activity: "Idle", status: "healthy", alerts: 0 },
  { id: "r-nlb", name: "prod-nlb-public", type: "Load balancer", provider: "AWS", region: "us-east-1", env: "prod", score: 71, vulns: 0, openPorts: ["443"], suspicious: 5, identity: "—", activity: "TLS handshake anomalies from 3 ASNs", status: "watch", alerts: 1 },
  { id: "r-ec2-bastion", name: "ops-bastion-01", type: "EC2 instance", provider: "AWS", region: "eu-west-1", env: "prod", score: 86, vulns: 1, openPorts: ["22"], suspicious: 1, identity: "ssm-session", activity: "212 failed SSH auth attempts blocked", status: "watch", alerts: 1 },
];

/* -------------------------------- alerts -------------------------------- */

export interface Alert {
  id: string;
  name: string;
  severity: Severity;
  confidence: number;
  ts: number;
  resourceId: string;
  resource: string;
  source: string;
  destination: string;
  rule: string;
  reason: string;
  recommendation: string;
  status: AlertStatus;
}

export const ALERTS: Alert[] = [
  { id: "AL-3127", name: "Container egress to known TOR exit node", severity: "CRITICAL", confidence: 97, ts: ago(12), resourceId: "r-pod-checkout", resource: "checkout-api-7d9f4b", source: "10.0.4.18 (pod)", destination: "185.220.101.34:9001", rule: "NET-EGRESS-TOR-01", reason: "Pod initiated TLS to an address on the TOR exit-node list 47s after mounting the service-account token. No baseline egress exists for this workload.", recommendation: "Isolate the pod, revoke its IRSA credentials and block the destination at the network policy layer.", status: "ACTIVE" },
  { id: "AL-3126", name: "Kubernetes secrets enumeration from pod", severity: "HIGH", confidence: 91, ts: ago(18), resourceId: "r-eks-core", resource: "prod-eks-core / payments-ns", source: "sa:checkout-sa", destination: "kube-apiserver", rule: "K8S-SECRET-ENUM-04", reason: "14 list/get secret calls across 3 namespaces in 90s — consistent with automated tooling, not application behavior.", recommendation: "Restrict RBAC for checkout-sa and audit secret access for the last 24h.", status: "ACTIVE" },
  { id: "AL-3124", name: "Impossible travel for IAM user svc-deploy", severity: "CRITICAL", confidence: 96, ts: ago(41), resourceId: "r-iam-svcdeploy", resource: "svc-deploy", source: "84.208.19.7 (Oslo, NO)", destination: "103.28.55.12 (Singapore, SG)", rule: "ID-IMPOSSIBLE-TRAVEL-02", reason: "Successful console sign-ins from Oslo and Singapore 41 minutes apart. MFA was satisfied on the second session only.", recommendation: "Suspend the user, revoke all active sessions and access keys, then force re-enrollment of MFA.", status: "ACTIVE" },
  { id: "AL-3121", name: "AdministratorAccess policy attached to service account", severity: "CRITICAL", confidence: 94, ts: ago(56), resourceId: "r-iam-svcdeploy", resource: "svc-deploy", source: "sts:assumed-role/ci-runner", destination: "iam:AttachUserPolicy", rule: "IAM-PRIV-ESC-07", reason: "Full-administrator policy attached outside change window by an assumed CI role that never performs IAM writes.", recommendation: "Detach the policy, quarantine the CI runner identity and review CloudTrail for follow-on activity.", status: "INVESTIGATING" },
  { id: "AL-3119", name: "Bulk S3 egress to unclassified ASN", severity: "HIGH", confidence: 88, ts: ago(74), resourceId: "r-s3-finance", resource: "finance-exports", source: "svc-deploy (AccessKey •••Q7F2)", destination: "45.134.26.0/24 (unclassified)", rule: "DATA-EGRESS-VOL-03", reason: "4.2 GB of objects read in 20 minutes; destination ASN never appears in 90 days of bucket access history.", recommendation: "Apply a bucket-level egress block for the ASN and rotate the access key.", status: "INVESTIGATING" },
  { id: "AL-3116", name: "Cryptomining process on production instance", severity: "HIGH", confidence: 93, ts: ago(132), resourceId: "r-ec2-api", resource: "prod-api-gateway-01", source: "www-data", destination: "pool.minexmr.com:443", rule: "PROC-CRYPTO-02", reason: "xmrig binary executed from /dev/shm with CPU pinning; stratum traffic to a public mining pool.", recommendation: "Isolate the instance, capture a forensic image, then rebuild from the golden AMI.", status: "ACTIVE" },
  { id: "AL-3114", name: "Brute force: 212 failed SSH authentications", severity: "HIGH", confidence: 90, ts: ago(168), resourceId: "r-ec2-bastion", resource: "ops-bastion-01", source: "141.98.10.60 (Vilnius, LT)", destination: "10.2.1.30:22", rule: "NET-BRUTEFORCE-SSH-01", reason: "212 failed password attempts across 14 usernames in 6 minutes from a single source.", recommendation: "Block the source IP at the security group and enforce key-only authentication.", status: "CONTAINED" },
  { id: "AL-3112", name: "Root account sign-in outside operating region", severity: "HIGH", confidence: 86, ts: ago(201), resourceId: "r-iam-svcdeploy", resource: "AWS root account", source: "216.131.78.5 (Ashburn, US)", destination: "console.aws.amazon.com", rule: "ID-ROOT-LOGIN-01", reason: "First root sign-in in 214 days, outside the declared operating region and change window.", recommendation: "Verify with the account owner; if unverified, rotate root credentials immediately.", status: "INVESTIGATING" },
  { id: "AL-3109", name: "Lambda invocation burst 22× baseline", severity: "MEDIUM", confidence: 78, ts: ago(238), resourceId: "r-lambda-auth", resource: "auth-token-refresh", source: "events:InvokeLambda", destination: "auth-token-refresh", rule: "SRVLESS-BURST-05", reason: "1,840 invocations in 5 minutes against a 3σ baseline of 82. Payload size is uniform — scripted.", recommendation: "Throttle the function and inspect triggering principal.", status: "CONTAINED" },
  { id: "AL-3107", name: "Lateral port scan inside production subnet", severity: "MEDIUM", confidence: 82, ts: ago(287), resourceId: "r-vpc-prod", resource: "vpc-prod-use1 / 10.0.4.0/24", source: "10.0.4.18 (pod)", destination: "10.0.4.0/24 (ports 22, 3306, 5432, 6379)", rule: "NET-SCAN-LATERAL-02", reason: "SYN scan across 61 hosts initiated by the compromised checkout pod.", recommendation: "Apply default-deny network policy for the pod's namespace.", status: "ACTIVE" },
  { id: "AL-3104", name: "TLS handshake anomalies at public NLB", severity: "LOW", confidence: 64, ts: ago(342), resourceId: "r-nlb", resource: "prod-nlb-public", source: "3 ASNs", destination: "prod-nlb-public:443", rule: "NET-TLS-ANOM-09", reason: "JA3 fingerprints inconsistent with known client fleets; low-volume, possibly scanning.", recommendation: "Monitor; add fingerprints to watchlist.", status: "INVESTIGATING" },
  { id: "AL-3101", name: "New SQL login from unseen ASN", severity: "LOW", confidence: 61, ts: ago(402), resourceId: "r-az-sql", resource: "az-crm-sql", source: "176.10.99.200 (Vilnius, LT)", destination: "az-crm-sql:1433", rule: "DB-NEW-ASN-03", reason: "Successful login using a valid service credential from an ASN with no prior history.", recommendation: "Verify with the DBA team; rotate credential if unexpected.", status: "CONTAINED" },
  { id: "AL-3098", name: "Mass resource creation in dev account", severity: "INFO", confidence: 55, ts: ago(486), resourceId: "r-cf-img", resource: "gcp dev project", source: "ci-pipeline", destination: "compute.instances.insert", rule: "RES-CREATION-SPIKE-11", reason: "38 VM insert calls in 10 minutes — matches a known load-test pipeline but outside its schedule.", recommendation: "No action required; confirm schedule with platform team.", status: "FALSE_POSITIVE" },
];

/* ------------------------------- incidents ------------------------------ */

export interface TimelineStep {
  ts: number;
  label: string;
  detail: string;
  kind: "attack" | "detect" | "action" | "info";
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  confidence: number;
  status: IncidentStatus;
  ts: number;
  summary: string;
  resourceIds: string[];
  users: string[];
  ips: string[];
  geo: string[];
  mitre: string[];
  timeline: TimelineStep[];
  relatedEventIds: string[];
  recommendations: string[];
  notes: { ts: number; author: string; text: string }[];
}

export const INCIDENTS: Incident[] = [
  {
    id: "INC-2214",
    title: "Kubernetes credential compromise — payments namespace",
    severity: "CRITICAL",
    confidence: 96,
    status: "OPEN",
    ts: ago(12),
    summary: "A pod in the payments namespace is exhibiting post-compromise behavior: secrets enumeration, lateral scanning and egress to a TOR exit node. The same identity chain was used to escalate privileges in IAM 44 minutes earlier. Correlation indicates a single coordinated intrusion attempting to reach the payments database.",
    resourceIds: ["r-pod-checkout", "r-eks-core", "r-rds-payments", "r-iam-svcdeploy"],
    users: ["svc-deploy", "sa:checkout-sa", "ci-runner"],
    ips: ["185.220.101.34", "84.208.19.7", "103.28.55.12", "10.0.4.18"],
    geo: ["Oslo, NO", "Singapore, SG", "TOR exit — DE"],
    mitre: ["T1078 Valid Accounts", "T1548 Abuse Elevation Control", "T1552 Unsecured Credentials", "T1041 Exfiltration Over C2"],
    timeline: [
      { ts: ago(56), label: "Privilege escalation", detail: "AdministratorAccess attached to svc-deploy by assumed role ci-runner.", kind: "attack" },
      { ts: ago(41), label: "Impossible travel", detail: "svc-deploy signs in from Oslo, then Singapore 41 minutes later.", kind: "attack" },
      { ts: ago(19), label: "Detection: secrets enumeration", detail: "Rule K8S-SECRET-ENUM-04 fires on 14 secret calls in 90s.", kind: "detect" },
      { ts: ago(18), label: "Pod isolated (automatic)", detail: "Response engine quarantined the pod's network namespace.", kind: "action" },
      { ts: ago(12), label: "TOR egress confirmed", detail: "Post-isolation forensic shows 47s of TLS to 185.220.101.34 before containment.", kind: "detect" },
    ],
    relatedEventIds: ["e-01", "e-02", "e-04", "e-07", "e-09", "e-12"],
    recommendations: ["Isolate workload checkout-api-7d9f4b", "Revoke IRSA credentials for checkout-sa", "Block IP 185.220.101.34", "Disable user svc-deploy"],
    notes: [{ ts: ago(9), author: "m.okafor", text: "Finance DB query volume spiking in parallel — treating RDS as in-scope until proven clean." }],
  },
  {
    id: "INC-2213",
    title: "IAM privilege escalation — svc-deploy identity chain",
    severity: "HIGH",
    confidence: 92,
    status: "INVESTIGATING",
    ts: ago(41),
    summary: "The CI runner role assumed administrator rights and modified the svc-deploy service account outside the change window. Subsequent sign-ins violate travel constraints. Likely the initial-access phase of INC-2214.",
    resourceIds: ["r-iam-svcdeploy"],
    users: ["svc-deploy", "ci-runner", "root"],
    ips: ["84.208.19.7", "103.28.55.12", "216.131.78.5"],
    geo: ["Oslo, NO", "Singapore, SG", "Ashburn, US"],
    mitre: ["T1078.004 Cloud Accounts", "T1098 Account Manipulation"],
    timeline: [
      { ts: ago(201), label: "Root sign-in anomaly", detail: "Root account used outside operating region for the first time in 214 days.", kind: "attack" },
      { ts: ago(56), label: "Policy attachment", detail: "iam:AttachUserPolicy executed for AdministratorAccess.", kind: "attack" },
      { ts: ago(41), label: "Detection: impossible travel", detail: "Rule ID-IMPOSSIBLE-TRAVEL-02 fires.", kind: "detect" },
      { ts: ago(33), label: "Investigation opened", detail: "Analyst m.okafor escalated correlated alerts into this incident.", kind: "action" },
    ],
    relatedEventIds: ["e-03", "e-05", "e-06", "e-11"],
    recommendations: ["Disable user svc-deploy", "Revoke credentials for ci-runner", "Terminate suspicious sessions"],
    notes: [],
  },
  {
    id: "INC-2211",
    title: "Data exfiltration attempt — finance-exports bucket",
    severity: "HIGH",
    confidence: 88,
    status: "CONTAINED",
    ts: ago(74),
    summary: "4.2 GB of finance objects were read via a valid access key and streamed to an ASN with zero historical relationship. Egress was blocked at the bucket policy layer 6 minutes after detection; the access key has been rotated.",
    resourceIds: ["r-s3-finance", "r-iam-svcdeploy"],
    users: ["svc-deploy"],
    ips: ["45.134.26.11", "103.28.55.12"],
    geo: ["Singapore, SG", "Unclassified ASN"],
    mitre: ["T1567 Exfiltration Over Web Service"],
    timeline: [
      { ts: ago(74), label: "Bulk read begins", detail: "GetObject rate 31× baseline on finance-exports.", kind: "attack" },
      { ts: ago(68), label: "Detection: egress volume", detail: "Rule DATA-EGRESS-VOL-03 fires at 1.1 GB.", kind: "detect" },
      { ts: ago(66), label: "Egress blocked (automatic)", detail: "Bucket policy condition applied for destination ASN.", kind: "action" },
      { ts: ago(61), label: "Key rotated", detail: "AccessKey •••Q7F2 deactivated and replaced.", kind: "action" },
    ],
    relatedEventIds: ["e-08", "e-10"],
    recommendations: ["Review object-level access logs for the window", "Enable S3 access logging to SIEM"],
    notes: [{ ts: ago(58), author: "j.lindqvist", text: "Confirmed ~310 MB left the bucket before the block. DLP classification in progress." }],
  },
  {
    id: "INC-2209",
    title: "Cryptomining on prod-api-gateway-01",
    severity: "MEDIUM",
    confidence: 93,
    status: "RESOLVED",
    ts: ago(132),
    summary: "An xmrig miner was executed from /dev/shm after a deserialization flaw in the gateway service allowed command injection. Instance was imaged for forensics and rebuilt from the golden AMI. Patch deployed fleet-wide.",
    resourceIds: ["r-ec2-api"],
    users: ["www-data"],
    ips: ["141.98.10.60"],
    geo: ["Vilnius, LT"],
    mitre: ["T1496 Resource Hijacking"],
    timeline: [
      { ts: ago(138), label: "Injection attempt", detail: "Malformed payload accepted by /v1/parse endpoint.", kind: "attack" },
      { ts: ago(132), label: "Detection: crypto process", detail: "Rule PROC-CRYPTO-02 fires on xmrig execution.", kind: "detect" },
      { ts: ago(128), label: "Instance isolated", detail: "SG restricted to forensics VLAN.", kind: "action" },
      { ts: ago(104), label: "Rebuilt from golden AMI", detail: "Fleet patch for CVE-2025-1187 rolled out.", kind: "action" },
    ],
    relatedEventIds: ["e-13", "e-14"],
    recommendations: ["Add WAF rule for the /v1/parse endpoint"],
    notes: [],
  },
];

/* -------------------------------- events -------------------------------- */

export interface EventItem {
  id: string;
  ts: number;
  type: string;
  severity: Severity;
  source: string;
  destination: string;
  resource: string;
  actor: string;
  message: string;
  raw: Record<string, string | number>;
}

const E = (id: string, ts: number, type: string, severity: Severity, source: string, destination: string, resource: string, actor: string, message: string, raw: Record<string, string | number>): EventItem => ({ id, ts, type, severity, source, destination, resource, actor, message, raw });

export const EVENTS: EventItem[] = [
  E("e-01", ago(12), "network.egress", "CRITICAL", "10.0.4.18:41120", "185.220.101.34:9001", "checkout-api-7d9f4b", "sa:checkout-sa", "Outbound TLS to TOR exit node blocked post-detection", { bytes: 48213, protocol: "TLS1.3", ja3: "cd08e31494f9531f560d64c695473da9", verdict: "blocked" }),
  E("e-02", ago(18), "k8s.api", "HIGH", "sa:checkout-sa", "kube-apiserver", "prod-eks-core", "sa:checkout-sa", "14 secret list/get calls across 3 namespaces in 90s", { calls: 14, window_s: 90, namespaces: "payments,core,ingress", verb: "list+get" }),
  E("e-03", ago(41), "identity.signin", "CRITICAL", "103.28.55.12", "signin.aws.amazon.com", "svc-deploy", "svc-deploy", "Console sign-in from Singapore; MFA satisfied; prior sign-in Oslo 41 min earlier", { mfa: "pass", prior_geo: "Oslo, NO", delta_min: 41, risk: "impossible-travel" }),
  E("e-04", ago(56), "iam.policy", "CRITICAL", "sts:ci-runner", "iam.amazonaws.com", "svc-deploy", "ci-runner", "AttachUserPolicy AdministratorAccess outside change window", { policy: "arn:aws:iam::aws:policy/AdministratorAccess", change_window: "outside" }),
  E("e-05", ago(201), "identity.signin", "HIGH", "216.131.78.5", "console.aws.amazon.com", "AWS root account", "root", "Root sign-in outside operating region; first use in 214 days", { last_root_use_d: 214, mfa: "pass", region_expected: "eu-west-1" }),
  E("e-06", ago(57), "iam.policy", "MEDIUM", "sts:ci-runner", "iam.amazonaws.com", "svc-deploy", "ci-runner", "CreateAccessKey for existing user by assumed role", { access_key: "AKIA••••T2M8" }),
  E("e-07", ago(19), "k8s.api", "HIGH", "sa:checkout-sa", "kube-apiserver", "prod-eks-core", "sa:checkout-sa", "Exec into peer pod payments-worker-5c8d denied by admission controller", { verb: "create", subresource: "exec", decision: "deny" }),
  E("e-08", ago(74), "storage.read", "HIGH", "45.134.26.11", "finance-exports.s3.amazonaws.com", "finance-exports", "svc-deploy", "GetObject burst: 31× baseline from unclassified ASN", { objects: 118, bytes: 4_213_000_000, window_min: 20 }),
  E("e-09", ago(17), "network.scan", "MEDIUM", "10.0.4.18", "10.0.4.0/24", "vpc-prod-use1", "sa:checkout-sa", "SYN scan: 61 hosts, ports 22/3306/5432/6379", { hosts: 61, ports: "22,3306,5432,6379", duration_s: 24 }),
  E("e-10", ago(66), "response.action", "INFO", "sentinel-x engine", "finance-exports", "finance-exports", "system", "Automatic egress block applied for ASN 45.134.26.0/24", { action: "bucket-policy-deny", asn: "45.134.26.0/24" }),
  E("e-11", ago(39), "identity.session", "HIGH", "103.28.55.12", "sts.amazonaws.com", "svc-deploy", "svc-deploy", "sts:GetSessionToken issued; credentials valid 12h", { duration_h: 12 }),
  E("e-12", ago(13), "db.query", "MEDIUM", "10.0.4.18", "prod-postgres-payments:5432", "prod-postgres-payments", "checkout_app", "Query volume 6.4× baseline; SELECT on card_tokens table", { ratio: 6.4, table: "card_tokens", rows: 48120 }),
  E("e-13", ago(132), "process.exec", "HIGH", "www-data", "/dev/shm/.x/xmrig", "prod-api-gateway-01", "www-data", "xmrig executed with CPU pinning; stratum to pool.minexmr.com", { binary: "xmrig", pool: "pool.minexmr.com:443", cpu: "pinned 4 cores" }),
  E("e-14", ago(138), "web.request", "MEDIUM", "141.98.10.60", "prod-nlb-public:443", "prod-api-gateway-01", "anonymous", "Deserialization payload accepted by /v1/parse (CVE-2025-1187)", { cve: "CVE-2025-1187", endpoint: "/v1/parse" }),
  E("e-15", ago(168), "ssh.auth", "HIGH", "141.98.10.60", "10.2.1.30:22", "ops-bastion-01", "multiple", "212 failed SSH password attempts across 14 usernames", { attempts: 212, usernames: 14, window_min: 6 }),
  E("e-16", ago(167), "response.action", "INFO", "sentinel-x engine", "sg-0a3c…", "ops-bastion-01", "system", "Source IP 141.98.10.60 blocked at security group", { action: "sg-deny", ip: "141.98.10.60" }),
  E("e-17", ago(238), "serverless.invoke", "MEDIUM", "events.amazonaws.com", "auth-token-refresh", "auth-token-refresh", "scheduled-rule", "Invocation burst: 1,840 calls in 5 min (baseline 82)", { invocations: 1840, baseline: 82, sigma: 9.1 }),
  E("e-18", ago(236), "response.action", "INFO", "sentinel-x engine", "auth-token-refresh", "auth-token-refresh", "system", "Concurrency throttled to baseline during investigation", { action: "throttle", limit: 100 }),
  E("e-19", ago(300), "network.dns", "MEDIUM", "10.0.4.18", "resolver.use1", "prod-eks-core", "sa:checkout-sa", "DGA-like domain lookups (entropy 4.3): kx8sja2m.example-ns.net", { domains: 9, entropy: 4.3 }),
  E("e-20", ago(320), "iam.assume", "INFO", "ci-runner", "sts.amazonaws.com", "ci-runner", "ci-runner", "AssumeRole within normal pipeline schedule", { role: "ci-deployer" }),
  E("e-21", ago(342), "network.tls", "LOW", "3 ASNs", "prod-nlb-public:443", "prod-nlb-public", "anonymous", "JA3 fingerprints inconsistent with known client fleets", { fingerprints: 5, volume: "low" }),
  E("e-22", ago(402), "db.login", "LOW", "176.10.99.200", "az-crm-sql:1433", "az-crm-sql", "sql-svc", "Successful SQL login from unseen ASN (Vilnius, LT)", { asn: "AS62167", first_seen: "yes" }),
  E("e-23", ago(430), "k8s.deploy", "INFO", "ci-deployer", "kube-apiserver", "prod-eks-core", "ci-runner", "Rolling deployment checkout-api v2.14.1 completed", { replicas: 6, image: "checkout:2.14.1" }),
  E("e-24", ago(486), "compute.create", "INFO", "ci-pipeline", "compute.googleapis.com", "gcp dev project", "ci-pipeline", "38 VM insert calls in 10 min — matches load-test pipeline", { vms: 38 }),
  E("e-25", ago(510), "identity.signin", "INFO", "10.2.0.5", "portal.sentinel-x", "console", "j.lindqvist", "Analyst sign-in from corporate network", { mfa: "pass" }),
  E("e-26", ago(60), "k8s.api", "MEDIUM", "sa:checkout-sa", "kube-apiserver", "prod-eks-core", "sa:checkout-sa", "Service account token mounted with extended lifetime (12h)", { lifetime_h: 12 }),
  E("e-27", ago(95), "network.egress", "INFO", "10.0.9.7", "registry.npmjs.org:443", "build-runner-02", "ci-runner", "Dependency fetch volume normal", { bytes: 210_000_000 }),
  E("e-28", ago(150), "storage.policy", "MEDIUM", "svc-deploy", "s3.amazonaws.com", "finance-exports", "svc-deploy", "Bucket policy modified: PublicRead condition removed", { change: "policy-edit" }),
  E("e-29", ago(260), "db.query", "INFO", "10.0.7.4", "az-crm-sql:1433", "az-crm-sql", "crm-app", "Batch export job completed within schedule", { rows: 120_000 }),
  E("e-30", ago(22), "response.action", "INFO", "sentinel-x engine", "checkout-api-7d9f4b", "prod-eks-core", "system", "Pod network namespace quarantined pending review", { action: "quarantine" }),
];

/* --------------------------------- rules -------------------------------- */

export interface RuleDef {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  enabled: boolean;
  triggers: number;
  falsePositives: number;
  lastTriggered: number;
  logic: string;
  window: string;
  threshold: number;
}

export const RULES: RuleDef[] = [
  { id: "NET-BRUTEFORCE-SSH-01", name: "SSH brute force", description: "More than 10 failed SSH authentications from one source IP.", severity: "HIGH", enabled: true, triggers: 34, falsePositives: 2, lastTriggered: ago(168), logic: "count(event.type == 'ssh.auth' && event.outcome == 'fail') group by source_ip", window: "5m", threshold: 10 },
  { id: "ID-IMPOSSIBLE-TRAVEL-02", name: "Impossible travel", description: "Sign-ins from geographically incompatible locations within an impossible interval.", severity: "CRITICAL", enabled: true, triggers: 6, falsePositives: 1, lastTriggered: ago(41), logic: "geo.distance(signin[-1], signin[0]) / delta_time > 900 km/h", window: "60m", threshold: 900 },
  { id: "NET-EGRESS-TOR-01", name: "Egress to TOR / anonymizers", description: "Outbound connection to any address on curated TOR exit and anonymizer lists.", severity: "CRITICAL", enabled: true, triggers: 3, falsePositives: 0, lastTriggered: ago(12), logic: "destination.ip in threatlist('tor-exit+anonymizers')", window: "realtime", threshold: 1 },
  { id: "IAM-PRIV-ESC-07", name: "Admin policy attachment", description: "AdministratorAccess (or equivalent) attached outside an approved change window.", severity: "CRITICAL", enabled: true, triggers: 2, falsePositives: 0, lastTriggered: ago(56), logic: "event.action == 'iam:AttachUserPolicy' && policy.is_admin && !change_window.active", window: "realtime", threshold: 1 },
  { id: "K8S-SECRET-ENUM-04", name: "Kubernetes secrets enumeration", description: "Burst of secret list/get operations across namespaces from one identity.", severity: "HIGH", enabled: true, triggers: 5, falsePositives: 1, lastTriggered: ago(18), logic: "count(k8s.verb in ('list','get') && object == 'secrets') group by service_account", window: "5m", threshold: 8 },
  { id: "DATA-EGRESS-VOL-03", name: "Anomalous data egress volume", description: "Object-store read volume exceeding 3σ of the 90-day baseline toward a new ASN.", severity: "HIGH", enabled: true, triggers: 4, falsePositives: 1, lastTriggered: ago(74), logic: "sum(storage.bytes_out) > 3σ(baseline_90d) && asn.first_seen", window: "30m", threshold: 3 },
  { id: "PROC-CRYPTO-02", name: "Cryptomining process", description: "Execution of known mining binaries or stratum protocol signatures on a host.", severity: "HIGH", enabled: true, triggers: 7, falsePositives: 0, lastTriggered: ago(132), logic: "process.name in miner_signatures || net.protocol == 'stratum'", window: "realtime", threshold: 1 },
  { id: "SRVLESS-BURST-05", name: "Serverless invocation burst", description: "Function invocation rate above 3σ of baseline for the same hour-of-week.", severity: "MEDIUM", enabled: false, triggers: 11, falsePositives: 4, lastTriggered: ago(238), logic: "rate(lambda.invocations) > 3σ(baseline_how) sustained 5m", window: "5m", threshold: 3 },
  { id: "ID-ROOT-LOGIN-01", name: "Root account usage", description: "Root or break-glass account authentication, especially outside operating regions.", severity: "HIGH", enabled: true, triggers: 3, falsePositives: 0, lastTriggered: ago(201), logic: "identity.type == 'root' && (region != operating_region || dormant > 90d)", window: "realtime", threshold: 1 },
];

/* --------------------------- response playbooks ------------------------- */

export interface ResponseActionDef {
  id: string;
  label: string;
  target: string;
  incidentId: string;
  risk: "safe" | "caution" | "dangerous";
  impact: string;
  why: string;
  consequence: string;
}

export const RECOMMENDED_ACTIONS: ResponseActionDef[] = [
  { id: "act-isolate-pod", label: "Isolate workload", target: "checkout-api-7d9f4b", incidentId: "INC-2214", risk: "caution", impact: "The pod's network namespace is fully quarantined; it keeps running but cannot send or receive traffic.", why: "Post-compromise behavior confirmed (TOR egress, secrets enumeration). Isolation stops lateral movement while preserving memory for forensics.", consequence: "Checkout API capacity drops ~17% until a clean replica is scheduled. Traffic reroutes to remaining replicas." },
  { id: "act-revoke-irsa", label: "Revoke credentials", target: "IRSA checkout-sa", incidentId: "INC-2214", risk: "dangerous", impact: "All tokens issued to the checkout service account are invalidated and new tokens cannot be minted for 1h.", why: "The compromised pod used this identity to enumerate secrets. Revocation cuts the attacker's persistence path.", consequence: "Any legitimate pod using checkout-sa must remount tokens; expect a rolling restart of the checkout deployment." },
  { id: "act-block-ip", label: "Block IP", target: "185.220.101.34", incidentId: "INC-2214", risk: "safe", impact: "Destination IP is denied at VPC egress and network-policy level across all clusters.", why: "Confirmed TOR exit node used as C2 channel by the compromised pod.", consequence: "None expected — no legitimate workload contacts this address." },
  { id: "act-disable-user", label: "Disable user", target: "svc-deploy", incidentId: "INC-2213", risk: "dangerous", impact: "The IAM user is marked disabled; console and API authentication fail immediately.", why: "Impossible travel plus privilege escalation indicate the user's credentials are attacker-controlled.", consequence: "CI/CD jobs referencing svc-deploy will fail until a clean identity is provisioned (~15 min runbook)." },
  { id: "act-kill-sessions", label: "Terminate suspicious sessions", target: "3 active sessions — svc-deploy", incidentId: "INC-2213", risk: "caution", impact: "All STS credentials and console sessions for the user are revoked globally.", why: "Active sessions from Oslo and Singapore remain valid for up to 12h unless terminated.", consequence: "Any legitimate automation using those sessions restarts authentication and fails cleanly." },
  { id: "act-sg-deny", label: "Block IP", target: "141.98.10.60", incidentId: "INC-2209", risk: "safe", impact: "Source denied at the security-group level for all production instances.", why: "Origin of the brute-force campaign and the CVE-2025-1187 exploitation attempt.", consequence: "None expected." },
  { id: "act-verify-fp", label: "Mark false positive", target: "AL-3098 mass resource creation", incidentId: "INC-2209", risk: "safe", impact: "Alert is closed and the rule learns an exception for the load-test pipeline schedule.", why: "The activity matches the platform team's load-test pipeline (confirmed out-of-band).", consequence: "Future runs of that pipeline will not re-alert." },
];

export const AUTOMATION_POLICIES = [
  { id: "auto-isolate", name: "Auto-isolate critical workloads", desc: "Quarantine any pod or instance with a CRITICAL-confidence intrusion signal, pending analyst review.", enabled: true, executed: 14 },
  { id: "auto-blockip", name: "Auto-block threat-list IPs", desc: "Deny egress/ingress for addresses on curated TOR, C2 and scanner lists without approval.", enabled: true, executed: 122 },
  { id: "auto-keys", name: "Auto-rotate exposed keys", desc: "Deactivate and rotate access keys observed in public locations or anomalous geos.", enabled: false, executed: 3 },
  { id: "auto-mfa", name: "Auto-enforce MFA re-enrollment", desc: "Force MFA re-enrollment for any identity with an impossible-travel signal.", enabled: true, executed: 6 },
];

export const RESPONSE_LOG_SEED = [
  { id: "log-9", ts: ago(18), action: "Quarantine pod network namespace", target: "checkout-api-7d9f4b", status: "EXECUTED" as const, by: "automation" },
  { id: "log-8", ts: ago(66), action: "Apply bucket egress deny (ASN)", target: "finance-exports", status: "EXECUTED" as const, by: "automation" },
  { id: "log-7", ts: ago(61), action: "Rotate access key •••Q7F2", target: "svc-deploy", status: "EXECUTED" as const, by: "m.okafor" },
  { id: "log-6", ts: ago(128), action: "Restrict instance to forensics VLAN", target: "prod-api-gateway-01", status: "EXECUTED" as const, by: "automation" },
  { id: "log-5", ts: ago(167), action: "Block IP at security group", target: "141.98.10.60", status: "EXECUTED" as const, by: "automation" },
  { id: "log-4", ts: ago(236), action: "Throttle Lambda concurrency", target: "auth-token-refresh", status: "EXECUTED" as const, by: "automation" },
];

/* ------------------------------ attack paths ---------------------------- */

export interface PathNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  kind: "attacker" | "identity" | "api" | "compute" | "data";
  sev: Severity;
  risk: string;
  events: string[];
  permissions: string[];
  related: string[];
}

export interface PathEdge { from: string; to: string; threat: boolean; label?: string }

export const ATTACK_PATH: { id: string; title: string; incident: string; nodes: PathNode[]; edges: PathEdge[] } = {
  id: "ap-2214",
  title: "Kubernetes credential compromise",
  incident: "INC-2214",
  nodes: [
    { id: "n1", x: 60, y: 230, label: "Attacker", sub: "185.220.101.34 · TOR exit", kind: "attacker", sev: "CRITICAL", risk: "External C2 endpoint", events: ["TLS session to pod 10.0.4.18", "DGA-like lookups prior to contact"], permissions: ["—"], related: ["AL-3127"] },
    { id: "n2", x: 250, y: 90, label: "svc-deploy", sub: "IAM user · compromised", kind: "identity", sev: "CRITICAL", risk: "Credentials attacker-controlled", events: ["Impossible travel Oslo→SG", "AttachUserPolicy AdministratorAccess"], permissions: ["iam:*", "s3:GetObject", "sts:AssumeRole"], related: ["AL-3124", "AL-3121"] },
    { id: "n3", x: 250, y: 370, label: "ci-runner", sub: "Assumed role · abused", kind: "identity", sev: "HIGH", risk: "Pipeline identity hijack", events: ["AssumeRole outside schedule", "CreateAccessKey for svc-deploy"], permissions: ["sts:AssumeRole", "iam:CreateAccessKey"], related: ["AL-3121"] },
    { id: "n4", x: 470, y: 230, label: "EKS API", sub: "kube-apiserver", kind: "api", sev: "HIGH", risk: "Abused with stolen tokens", events: ["Secrets enumeration (14 calls)", "Exec attempt → denied"], permissions: ["k8s:secrets", "k8s:pods/exec"], related: ["AL-3126"] },
    { id: "n5", x: 690, y: 120, label: "checkout-api pod", sub: "10.0.4.18 · quarantined", kind: "compute", sev: "CRITICAL", risk: "Active compromise, isolated", events: ["TOR egress 47s", "SYN scan 61 hosts", "SA token lifetime 12h"], permissions: ["IRSA checkout-sa"], related: ["AL-3127", "AL-3107"] },
    { id: "n6", x: 690, y: 350, label: "payments-worker", sub: "Peer pod · exec denied", kind: "compute", sev: "MEDIUM", risk: "Lateral target", events: ["Exec attempt denied by admission ctrl"], permissions: ["IRSA payments-sa"], related: ["AL-3126"] },
    { id: "n7", x: 905, y: 230, label: "postgres-payments", sub: "RDS · 6.4× query volume", kind: "data", sev: "CRITICAL", risk: "Probable objective — card data", events: ["SELECT on card_tokens", "48,120 rows in window"], permissions: ["db:select"], related: ["AL-3126"] },
  ],
  edges: [
    { from: "n2", to: "n4", threat: true, label: "stolen token" },
    { from: "n3", to: "n2", threat: true, label: "assume + escalate" },
    { from: "n4", to: "n5", threat: true, label: "deploy access" },
    { from: "n4", to: "n6", threat: true, label: "exec denied" },
    { from: "n5", to: "n7", threat: true, label: "SQL via app creds" },
    { from: "n1", to: "n5", threat: true, label: "C2 / TOR" },
  ],
};

/* ------------------------------- dashboards ----------------------------- */

export const DAILY_THREATS = [
  { d: "02-07", critical: 1, high: 3, medium: 6, low: 9 },
  { d: "02-08", critical: 0, high: 2, medium: 4, low: 12 },
  { d: "02-09", critical: 2, high: 4, medium: 5, low: 7 },
  { d: "02-10", critical: 0, high: 1, medium: 3, low: 8 },
  { d: "02-11", critical: 1, high: 2, medium: 7, low: 11 },
  { d: "02-12", critical: 0, high: 3, medium: 4, low: 6 },
  { d: "02-13", critical: 3, high: 5, medium: 6, low: 9 },
  { d: "02-14", critical: 1, high: 2, medium: 3, low: 5 },
  { d: "02-15", critical: 0, high: 4, medium: 5, low: 10 },
  { d: "02-16", critical: 2, high: 3, medium: 8, low: 7 },
  { d: "02-17", critical: 0, high: 2, medium: 4, low: 9 },
  { d: "02-18", critical: 1, high: 3, medium: 6, low: 8 },
  { d: "02-19", critical: 2, high: 4, medium: 5, low: 6 },
  { d: "02-20", critical: 3, high: 6, medium: 7, low: 10 },
];

export const POSTURE_TREND = [61, 63, 62, 66, 64, 68, 67, 70, 69, 72, 70, 71];

export const DETECTION_STATS = [
  { label: "Identity & access", count: 38, sev: "CRITICAL" as Severity },
  { label: "Network anomaly", count: 31, sev: "HIGH" as Severity },
  { label: "Workload behavior", count: 24, sev: "HIGH" as Severity },
  { label: "Data movement", count: 17, sev: "MEDIUM" as Severity },
  { label: "Configuration drift", count: 12, sev: "MEDIUM" as Severity },
  { label: "API abuse", count: 9, sev: "LOW" as Severity },
];

export const ACCOUNTS = [
  { provider: "AWS" as Provider, name: "acme-prod (4912••••7731)", regions: 4, workloads: 11240, status: "connected", lastSync: ago(2) },
  { provider: "AWS" as Provider, name: "acme-data (8830••••2210)", regions: 2, workloads: 3410, status: "connected", lastSync: ago(4) },
  { provider: "Azure" as Provider, name: "acme-crm subscription", regions: 2, workloads: 1875, status: "connected", lastSync: ago(6) },
  { provider: "GCP" as Provider, name: "acme-analytics project", regions: 3, workloads: 1896, status: "connected", lastSync: ago(9) },
];

export const HERO_STATS = { events: 2_431_208, workloads: 18_421, confidence: 97.8, responseSec: 34, contained: 421 };
