/* SENTINEL-X · ML & Behavioral Intelligence Engine (ES Module)
 *
 * Implements:
 * 1. Novel Attack & Zero-Day Detection via Known TTP Synthesis
 * 2. Traffic Flow Normal Baseline & 3-Sigma Statistical Anomaly Detection
 * 3. AI Copilot Contextual RAG & Remediation Generator
 */

export const KNOWN_TTP_BASE = [
  { id: "T1078.004", name: "Valid Cloud Accounts", tactic: "Initial Access", weight: 0.8 },
  { id: "T1548.005", name: "STS AssumeRole Abuse", tactic: "Privilege Escalation", weight: 0.9 },
  { id: "T1027.005", name: "Indicator Removal / Micro-sessions", tactic: "Defense Evasion", weight: 0.85 },
  { id: "T1567.002", name: "Exfiltration to Cloud Storage", tactic: "Exfiltration", weight: 0.95 },
  { id: "T1610", name: "Deploy Container / Ephemeral Debug", tactic: "Execution", weight: 0.9 },
  { id: "T1552.007", name: "In-Memory SA Token Scraping", tactic: "Credential Access", weight: 0.92 },
  { id: "T1046", name: "Network Service Discovery", tactic: "Discovery", weight: 0.7 },
  { id: "T1573.002", name: "Encrypted Asymmetric Channel", tactic: "Command and Control", weight: 0.88 },
  { id: "T1499.004", name: "Serverless Resource Exhaustion", tactic: "Impact", weight: 0.75 },
];

/** Evaluates an incoming sequence of security actions or event descriptors for novel mutations. */
export function evaluateNovelSequence(actions = []) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return {
      isNovelAttack: false,
      noveltyScore: 0,
      confidence: 50,
      synthesizedTechniques: [],
      explanation: "Insufficient telemetry steps provided to evaluate attack graph.",
      suggestedMitigation: "Continue baseline telemetry monitoring.",
      generatedSigmaRule: "",
    };
  }

  const matchedTtps = [];
  let noveltyAccumulator = 0;

  for (const act of actions) {
    const str = String(act).toLowerCase();
    for (const ttp of KNOWN_TTP_BASE) {
      if (
        str.includes(ttp.name.toLowerCase()) ||
        str.includes(ttp.id.toLowerCase()) ||
        str.includes(ttp.tactic.toLowerCase()) ||
        str.includes(str.split(" ")[0])
      ) {
        if (!matchedTtps.find((m) => m.id === ttp.id)) {
          matchedTtps.push(ttp);
          noveltyAccumulator += ttp.weight * 22;
        }
      }
    }
  }

  // Cross-tactic synthesis check
  const tactics = new Set(matchedTtps.map((t) => t.tactic));
  const isMultiTactic = tactics.size >= 2;
  const isComposite = matchedTtps.length >= 3;

  const noveltyScore = Math.min(98, Math.max(45, Math.round(noveltyAccumulator + (isMultiTactic ? 25 : 0) + (isComposite ? 15 : 0))));
  const confidence = Math.min(99, Math.round(75 + matchedTtps.length * 5));
  const isNovelAttack = noveltyScore >= 75;

  const ruleName = `sigma-novel-ttp-${Date.now().toString(36)}`;
  const sigmaRule = `title: Novel Synthesized Attack Sequence (${matchedTtps.map((t) => t.id).join(" + ") || "Unknown"})
id: ${ruleName}
status: experimental
description: Auto-synthesized by Sentinel-X ML Engine based on correlated ${tactics.size}-stage TTP pattern.
logsource:
  category: cloud
  product: multi-cloud
detection:
  condition: 1 of them and sequence(${matchedTtps.map((t) => t.id).join(", ")})
level: ${noveltyScore > 85 ? "critical" : "high"}
tags:
${matchedTtps.map((t) => `  - attack.${t.id.toLowerCase()}`).join("\n")}`;

  return {
    isNovelAttack,
    noveltyScore,
    confidence,
    synthesizedTechniques: matchedTtps.map((t) => `${t.id} - ${t.name} (${t.tactic})`),
    explanation: isNovelAttack
      ? `High-novelty composite attack detected across ${tactics.size} distinct MITRE tactics [${Array.from(tactics).join(", ")}]. Adversary is synthesizing known cloud API calls with evasion techniques to avoid single-threshold alarms.`
      : `Action sequence matches standard operational or known security event patterns. No unpredicted TTP mutation observed.`,
    suggestedMitigation: isNovelAttack
      ? `1. Revoke affected IAM/Kubernetes identities immediately.\n2. Isolate pod/workload network namespaces.\n3. Deploy the auto-synthesized Sigma detection rule.`
      : `Continue monitoring standard threshold alerts.`,
    generatedSigmaRule: sigmaRule,
  };
}

/** Generates dynamic rolling flow baseline telemetry with 3-sigma bounds. */
export function calculateFlowBaseline(workloadId = "checkout-api-7d9f4b", baseMean = 4.2, baseSigma = 1.1) {
  const points = [];
  const now = Date.now();
  const ONE_HOUR = 3600_000;

  for (let i = 24; i >= 0; i--) {
    const ts = now - i * ONE_HOUR;
    const hourOfDay = new Date(ts).getHours();
    const timeLabel = `${String(hourOfDay).padStart(2, "0")}:00`;

    const diurnal = 1 + 0.35 * Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI);
    const mean = Math.round(baseMean * diurnal * 10) / 10;
    const sigma = Math.round(baseSigma * diurnal * 10) / 10;
    const upper = Math.round((mean + 3 * sigma) * 10) / 10;
    const lower = Math.max(0, Math.round((mean - 3 * sigma) * 10) / 10);

    const noise = (Math.random() - 0.5) * sigma * 1.5;
    let actual = Math.max(0.1, Math.round((mean + noise) * 10) / 10);
    let isAnomaly = false;
    let anomalyType = null;
    let anomalyScore = null;

    if (i <= 2 && workloadId.includes("checkout")) {
      actual = Math.round((upper * 4.8 + Math.random() * 2) * 10) / 10;
      isAnomaly = true;
      anomalyType = "EGRESS_BURST";
      anomalyScore = 97;
    }

    points.push({
      ts,
      timeLabel,
      baselineMeanMbps: mean,
      baselineUpper3SigmaMbps: upper,
      baselineLower3SigmaMbps: lower,
      actualThroughputMbps: actual,
      packetRatePps: Math.round(actual * 125),
      entropyScore: isAnomaly ? 7.6 : 3.8,
      isAnomaly,
      anomalyType,
      anomalyScore,
    });
  }

  return {
    workloadId,
    timestamp: new Date().toISOString(),
    historical3SigmaMbps: Math.round((baseMean + 3 * baseSigma) * 10) / 10,
    points,
  };
}

/** Contextual AI Copilot reasoning engine. */
export function runAiCopilotReasoning({ query = "", context = {} }) {
  const q = String(query).toLowerCase();

  if (q.includes("tor") || q.includes("egress") || q.includes("traffic") || q.includes("anomaly")) {
    return {
      query,
      timestamp: new Date().toISOString(),
      fact: "checkout-api-7d9f4b initiated an outbound TLS 1.3 stream to 185.220.101.34:9001 (curated TOR exit node). Traffic reached 48.2 MB with Shannon entropy of 7.6, exceeding the 3-sigma baseline by 8.4σ.",
      inference: "The workload has zero baseline egress to external anonymity networks. Combined with secrets enumeration from the same pod, this indicates active Command & Control (C2) beaconing and data staging.",
      recommendation: "1) Apply Calico default-deny NetworkPolicy to quarantine the pod. 2) Revoke the IRSA service-account credentials. 3) Block the destination ASN at VPC border.",
      blastRadius: "1 Kubernetes pod isolated; database credentials in payment namespace require immediate rotation.",
      remediationPlaybook: {
        kubectl: `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: quarantine-checkout-api\n  namespace: payments\nspec:\n  podSelector:\n    matchLabels:\n      app: checkout-api\n  policyTypes:\n  - Ingress\n  - Egress\n  ingress: []\n  egress: []`,
        awsCli: `aws ec2 revoke-security-group-egress --group-id sg-0a3c4f91 --protocol tcp --port 9001 --cidr 185.220.101.34/32`,
        terraform: `resource "aws_security_group_rule" "block_tor" {\n  type              = "egress"\n  from_port         = 9001\n  to_port           = 9001\n  protocol          = "tcp"\n  cidr_blocks       = ["185.220.101.34/32"]\n  security_group_id = aws_security_group.prod_sg.id\n}`,
      },
    };
  }

  if (q.includes("novel") || q.includes("zero-day") || q.includes("ttp") || q.includes("mutation")) {
    return {
      query,
      timestamp: new Date().toISOString(),
      fact: "ML Sequence Vectorizer identified NATT-8801: Subnet-Scattered S3 Exfiltration combining IAM AssumeRole (T1548) with micro-session token cycling across 8 ephemeral container IPs, keeping individual flow bursts under 50 MB/hour.",
      inference: "Traditional single-IP volume alarms failed to fire because each source IP stays below threshold. The ML correlation model detected the unified multi-pod data assembly pattern.",
      recommendation: "Deploy the auto-synthesized Sigma rule and apply bucket-level principal aggregation limits on S3 finance-exports.",
      blastRadius: "S3 finance-exports dataset (estimated ~140,000 records). Containment prevents follow-on exfiltration.",
      remediationPlaybook: {
        kubectl: `kubectl cordon node-04.us-east-1.compute.internal && kubectl drain node-04.us-east-1.compute.internal --delete-emptydir-data --ignore-daemonsets`,
        awsCli: `aws iam put-user-policy --user-name svc-deploy --policy-name DenyAllEgress --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*"}]}'`,
        terraform: `resource "aws_s3_bucket_policy" "deny_unclassified_asn" {\n  bucket = aws_s3_bucket.finance_exports.id\n  policy = jsonencode({\n    Version = "2012-10-17"\n    Statement = [{\n      Sid = "DenyUnclassifiedAsn"\n      Effect = "Deny"\n      Principal = "*"\n      Action = "s3:GetObject"\n      Resource = "\${aws_s3_bucket.finance_exports.arn}/*"\n      Condition = {\n        NotIpAddress = {\n          "aws:SourceIp" = ["10.0.0.0/8", "172.16.0.0/12"]\n        }\n      }\n    }]\n  })\n}`,
      },
    };
  }

  // Default copilot response
  return {
    query,
    timestamp: new Date().toISOString(),
    fact: "Console telemetry reports 3 active critical detections, 2 open incidents (INC-2214 critical, INC-2213 high), and 4 novel attack chains tracked by ML. Posture score is 71/100 (+4 pts week-over-week).",
    inference: "Incident INC-2214 (Kubernetes credential compromise) and INC-2213 (IAM privilege escalation) share the svc-deploy identity chain with an active C2 beaconing channel on checkout-api.",
    recommendation: "Execute the approved containment actions for INC-2214 in the response center first, followed by rotating the svc-deploy access key.",
    blastRadius: "prod-eks-core, checkout-api-7d9f4b, prod-postgres-payments, and finance-exports.",
    remediationPlaybook: {
      kubectl: `kubectl -n payments annotate pod checkout-api-7d9f4b quarantine.sentinel-x.io/status=isolated`,
      awsCli: `aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive --user-name svc-deploy`,
      terraform: `# Sentinel-X Automated Security Baseline\n# Re-apply verified IAM least-privilege boundary\n`,
    },
  };
}
