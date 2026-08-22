/* ------------------------------------------------------------------ */
/*  SENTINEL-X · Machine Learning & Behavioral Telemetry Models         */
/*  Supports:                                                          */
/*   1. Novel Attack Detection via Known TTP Synthesis                 */
/*   2. Traffic Flow Normal Baseline & 3-Sigma Anomaly Detection       */
/* ------------------------------------------------------------------ */

import { Severity } from "./securityData";

/* ================================================================== */
/*  1. NOVEL ATTACK & ZERO-DAY SYNTHESIS MODEL                        */
/* ================================================================== */

export interface TTPStep {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  isNovelMutation: boolean;
  confidence: number;
  evidence: string;
  telemetrySource: string;
}

export interface NovelAttackChain {
  id: string;
  name: string;
  discoveredAt: number;
  severity: Severity;
  noveltyScore: number; // 0-100 (higher = more unpredicted mutation)
  confidenceScore: number; // 0-100
  status: "ACTIVE" | "ANALYZED" | "CONTAINED" | "RULE_GENERATED";
  summary: string;
  whyNovel: string;
  knownTechniquesUsed: string[];
  novelAspects: string[];
  ttpSequence: TTPStep[];
  affectedWorkloads: string[];
  targetAsset: string;
  predictiveBlastRadius: {
    criticalAssetsAtRisk: string[];
    potentialDataImpact: string;
    estimatedTimeToExfiltration: string;
  };
  synthesizedRule?: {
    format: "SIGMA" | "YARA_L" | "K8S_ADMISSION";
    code: string;
  };
}

export const NOVEL_ATTACK_CHAINS: NovelAttackChain[] = [
  {
    id: "NATT-8801",
    name: "Subnet-Scattered Low-and-Slow S3 Exfiltration via Ephemeral Token Cycling",
    discoveredAt: Date.now() - 35 * 60_000,
    severity: "CRITICAL",
    noveltyScore: 94,
    confidenceScore: 96,
    status: "ACTIVE",
    summary: "Adversary combines known IAM role assumption (T1078) with an unobserved technique: rotating STS session tokens across 8 ephemeral container IPs in parallel, rate-limiting each connection to stay under 50 MB/hour to evade standard volume alarms.",
    whyNovel: "Standard threshold rules look for high-volume egress (>1GB) from a single IP. This variant fragments data egress across 8 parallel pod IPs with jittered inter-packet arrival times, synthesizing known S3 GetObject APIs with novel distributed chunk assembly.",
    knownTechniquesUsed: [
      "T1078.004 Valid Cloud Accounts",
      "T1548.005 Abuse Elevation via STS AssumeRole",
      "T1567.002 Exfiltration to Cloud Storage",
      "T1027.005 Indicator Removal: Short-lived Sessions"
    ],
    novelAspects: [
      "Multi-container synchronized token slicing (no single IP exceeds 12 requests/min)",
      "Dynamic payload fragmentation into sub-chunk ranges matching legitimate thumbnail caches",
      "Asynchronous egress routing via 3 distinct external unclassified ASNs"
    ],
    targetAsset: "finance-exports (S3)",
    affectedWorkloads: ["checkout-api-7d9f4b", "prod-api-gateway-01", "finance-exports"],
    ttpSequence: [
      {
        techniqueId: "T1078.004",
        techniqueName: "Valid Accounts: Cloud Accounts",
        tactic: "Initial Access",
        isNovelMutation: false,
        confidence: 98,
        evidence: "Console sign-in with compromised svc-deploy credentials from Oslo VPN endpoint.",
        telemetrySource: "AWS CloudTrail"
      },
      {
        techniqueId: "T1548.005",
        techniqueName: "Abuse Elevation Control: STS AssumeRole",
        tactic: "Privilege Escalation",
        isNovelMutation: false,
        confidence: 95,
        evidence: "sts:AssumeRole called with ephemeral session tag 'worker-sync-delta' outside change window.",
        telemetrySource: "AWS STS Logs"
      },
      {
        techniqueId: "T1027.005",
        techniqueName: "Indicator Removal: Micro-session Cycling",
        tactic: "Defense Evasion",
        isNovelMutation: true,
        confidence: 93,
        evidence: "ML clustering detected 14 unique session tokens minted within 120s across 8 ephemeral container IPs.",
        telemetrySource: "Sentinel-X Sequence Vectorizer"
      },
      {
        techniqueId: "T1567.002",
        techniqueName: "Distributed Micro-Exfiltration via Unclassified ASNs",
        tactic: "Exfiltration",
        isNovelMutation: true,
        confidence: 96,
        evidence: "Parallel range-byte GET requests on financial records with cumulative volume 4.2 GB across 8 sources.",
        telemetrySource: "VPC Flow Logs & S3 Access Logs"
      }
    ],
    predictiveBlastRadius: {
      criticalAssetsAtRisk: ["finance-exports", "customer-invoices-eu", "prod-postgres-payments"],
      potentialDataImpact: "PCI/GDPR sensitive customer financial manifests (~140,000 records)",
      estimatedTimeToExfiltration: "< 18 minutes remaining until complete dataset siphon"
    },
    synthesizedRule: {
      format: "SIGMA",
      code: `title: Novel Distributed Range-Byte S3 Egress via Multiple Ephemeral Pod IPs
id: sigma-novel-s3-scattered-egress-8801
status: experimental
description: Auto-synthesized by Sentinel-X AI ML Correlator. Detects parallel micro-session STS range requests.
logsource:
  service: s3
  product: aws
detection:
  selection_api:
    eventName: 'GetObject'
    requestParameters.Range: '*'
  timeframe: 10m
  condition: selection_api | count(sourceIPAddress) by (bucketName, userIdentity.principalId) > 5
level: critical
tags:
  - attack.exfiltration
  - attack.t1567.002
  - ai.novel_mutation`
    }
  },
  {
    id: "NATT-8802",
    name: "Kubernetes Ephemeral Debug Container Token Injection with Lateral Pod-Exec",
    discoveredAt: Date.now() - 95 * 60_000,
    severity: "CRITICAL",
    noveltyScore: 91,
    confidenceScore: 94,
    status: "ANALYZED",
    summary: "Adversary weaponizes the k8s Ephemeral Containers API (T1610) to bypass read-only container file system locks, attaching an unlogged debug sidecar to the payment processing pod and querying the internal metadata endpoint.",
    whyNovel: "Bypasses standard runtime container immutability checks by using native Kubernetes 1.28+ ephemeral debug containers, injecting an out-of-band debugging shell without restarting the pod or triggering traditional deployment revision alerts.",
    knownTechniquesUsed: [
      "T1610 Deploy Container",
      "T1552.007 Container and Resource Discovery: SA Tokens",
      "T1068 Exploitation for Privilege Escalation",
      "T1046 Network Service Discovery"
    ],
    novelAspects: [
      "Usage of kubectl debug API subresource to bypass PodSecurityAdmission restrict policies",
      "Memory-resident scraping of /var/run/secrets/kubernetes.io/serviceaccount/token without disk writes",
      "Immediate self-termination of the debug container within 45 seconds after token exfiltration"
    ],
    targetAsset: "prod-eks-core (Kubernetes Cluster)",
    affectedWorkloads: ["checkout-api-7d9f4b", "payments-worker-5c8d"],
    ttpSequence: [
      {
        techniqueId: "T1078.001",
        techniqueName: "Valid Accounts: Default K8s SA",
        tactic: "Initial Access",
        isNovelMutation: false,
        confidence: 92,
        evidence: "Compromised IRSA token used to query kube-apiserver endpoints.",
        telemetrySource: "EKS Audit Log"
      },
      {
        techniqueId: "T1610",
        techniqueName: "Ephemeral Debug Container Injection",
        tactic: "Execution",
        isNovelMutation: true,
        confidence: 96,
        evidence: "POST /api/v1/namespaces/payments/pods/checkout-api-7d9f4b/ephemeralcontainers containing raw busybox image.",
        telemetrySource: "Kubernetes API Audit"
      },
      {
        techniqueId: "T1552.007",
        techniqueName: "In-Memory Service Account Harvesting",
        tactic: "Credential Access",
        isNovelMutation: true,
        confidence: 95,
        evidence: "Process memory read of envoy sidecar secret buffer with zero disk I/O.",
        telemetrySource: "Sysdig / Falco Runtime Hook"
      },
      {
        techniqueId: "T1046",
        techniqueName: "Inter-Pod Namespace SYN Sweep",
        tactic: "Discovery",
        isNovelMutation: false,
        confidence: 90,
        evidence: "Low-frequency port 5432 and 6379 probe toward database subnet.",
        telemetrySource: "VPC Flow Logs"
      }
    ],
    predictiveBlastRadius: {
      criticalAssetsAtRisk: ["prod-eks-core", "payments-worker-5c8d", "prod-postgres-payments"],
      potentialDataImpact: "Full Kubernetes cluster privilege escalation to cluster-admin level",
      estimatedTimeToExfiltration: "Threat halted at isolation stage"
    },
    synthesizedRule: {
      format: "SIGMA",
      code: `title: Ephemeral Debug Container Injection on Production Namespaces
id: sigma-k8s-ephemeral-debug-inject-8802
status: experimental
description: Detects unauthorized ephemeral container attachments in production namespaces.
logsource:
  service: k8s-audit
detection:
  selection:
    verb: ['create', 'update']
    subresource: 'ephemeralcontainers'
    objectRef.namespace: ['payments', 'production', 'core']
  condition: selection
level: critical
tags:
  - attack.execution
  - attack.t1610`
    }
  },
  {
    id: "NATT-8803",
    name: "Polymorphic User-Agent Cross-Cloud Identity Pivoting via Cloudflare Tunnel",
    discoveredAt: Date.now() - 180 * 60_000,
    severity: "HIGH",
    noveltyScore: 88,
    confidenceScore: 89,
    status: "RULE_GENERATED",
    summary: "Threat actor pivots between AWS IAM roles and GCP Workload Identity pools using randomly generated User-Agent strings and encrypted cloudflare tunnels, obfuscating API telemetry across multi-cloud boundaries.",
    whyNovel: "Synthesizes multi-cloud IAM federation with dynamically morphed client telemetry signatures, preventing cross-cloud SIEM event correlation that relies on static client fingerprinting.",
    knownTechniquesUsed: [
      "T1078.004 Cloud Accounts",
      "T1573.002 Encrypted Channel: Asymmetric Tunnel",
      "T1036.007 Masquerading: Double-Extension / Randomized Header"
    ],
    novelAspects: [
      "Simultaneous credential pivot across AWS and GCP within 18 seconds",
      "JA3/TLS fingerprint randomization per API request",
      "Tunnel egress multiplexing through legitimate reverse-proxy CDN origins"
    ],
    targetAsset: "acme-prod & gcp-analytics-gke",
    affectedWorkloads: ["svc-deploy", "etl-sa@gcp", "prod-nlb-public"],
    ttpSequence: [
      {
        techniqueId: "T1078.004",
        techniqueName: "Multi-Cloud Account Pivoting",
        tactic: "Initial Access",
        isNovelMutation: true,
        confidence: 91,
        evidence: "Identical STS token hash utilized in GCP STS token exchange endpoint.",
        telemetrySource: "GCP Audit Logs"
      },
      {
        techniqueId: "T1573.002",
        techniqueName: "Encrypted Cloudflare Ingress Tunneling",
        tactic: "Command and Control",
        isNovelMutation: true,
        confidence: 88,
        evidence: "Outbound tunnel establishment to Argo Smart Routing endpoint with no prior DNS baseline.",
        telemetrySource: "VPC DNS & Flow Logs"
      }
    ],
    predictiveBlastRadius: {
      criticalAssetsAtRisk: ["gcp-analytics-gke", "ml-datasets-eu", "finance-exports"],
      potentialDataImpact: "Access to cross-cloud analytics pipelines and machine learning weights",
      estimatedTimeToExfiltration: "Contained by security policy"
    }
  },
  {
    id: "NATT-8804",
    name: "Serverless Cold-Start Memory Harvesting via Concurrency Inflation",
    discoveredAt: Date.now() - 280 * 60_000,
    severity: "MEDIUM",
    noveltyScore: 82,
    confidenceScore: 86,
    status: "CONTAINED",
    summary: "Adversary flood-invoked a Lambda function to trigger rapid cold starts, attempting to inspect shared microVM execution memory buffers for leaked database credentials.",
    whyNovel: "Exploits serverless scale-out concurrency behavior to maximize memory exposure rather than aiming for denial of service.",
    knownTechniquesUsed: ["T1499.004 Serverless Resource Exhaustion", "T1552 Unsecured Credentials"],
    novelAspects: ["High-frequency invocation pulse tuned to function timeout limits", "Memory recycling probe"],
    targetAsset: "auth-token-refresh (AWS Lambda)",
    affectedWorkloads: ["auth-token-refresh"],
    ttpSequence: [
      {
        techniqueId: "T1499.004",
        techniqueName: "Serverless Concurrency Forcing",
        tactic: "Impact",
        isNovelMutation: true,
        confidence: 86,
        evidence: "1,840 invocations in 5 minutes with identical payload hashes.",
        telemetrySource: "AWS CloudWatch Metrics"
      }
    ],
    predictiveBlastRadius: {
      criticalAssetsAtRisk: ["auth-token-refresh", "az-crm-sql"],
      potentialDataImpact: "Token refresh secret leak",
      estimatedTimeToExfiltration: "Throttled automatically"
    }
  }
];

/* ================================================================== */
/*  2. TRAFFIC FLOW BASELINE & STATISTICAL ANOMALY MODEL               */
/* ================================================================== */

export interface TrafficFlowPoint {
  ts: number;
  timeLabel: string;
  baselineMeanMbps: number; // Mean (mu)
  baselineUpper3SigmaMbps: number; // Mean + 3*Sigma
  baselineLower3SigmaMbps: number; // Mean - 3*Sigma
  actualThroughputMbps: number; // Observed throughput
  packetRatePps: number;
  entropyScore: number; // 0.0 - 8.0 (Shannon entropy)
  isAnomaly: boolean;
  anomalyType?: "EGRESS_BURST" | "BEACONING_JITTER" | "LATERAL_SWEEP" | "PORT_SCAN" | "PROTOCOL_DEVIATION";
  anomalyScore?: number; // 0 - 100 (Isolation Forest / Outlier score)
}

export interface BeaconingPattern {
  id: string;
  workload: string;
  destinationIp: string;
  destinationAsn: string;
  intervalSec: number; // Target interval (e.g. 60s)
  jitterPercent: number; // e.g. 8.4%
  confidenceScore: number;
  observedHits: number;
  verdict: "CONFIRMED_C2" | "BENIGN_TELEMETRY" | "SUSPICIOUS_WATCH";
}

export interface FlowAnomaly {
  id: string;
  ts: number;
  workload: string;
  sourceIp: string;
  destIp: string;
  destPort: number;
  protocol: "TLS1.3" | "TLS1.2" | "SSH" | "HTTP/2" | "HTTPS" | "STRATUM" | "DNS" | "CUSTOM_TCP";
  ja3Fingerprint?: string;
  bytesTransferred: number;
  packetsTransferred: number;
  deviationSigma: number; // e.g. 6.4x sigma
  anomalyReason: string;
  recommendation: string;
  status: "ACTIVE" | "QUARANTINED" | "CLEARED" | "FALSE_POSITIVE";
}

export interface WorkloadFlowProfile {
  workloadId: string;
  workloadName: string;
  environment: "prod" | "staging" | "dev";
  provider: "AWS" | "Azure" | "GCP";
  avgDailyThroughputGb: number;
  normalActiveConnections: number;
  observedProtocols: string[];
  historical3SigmaThresholdMbps: number;
  currentStatus: "NORMAL" | "ANOMALOUS" | "CRITICAL_BURST";
  flowPoints24h: TrafficFlowPoint[];
  activeBeaconing?: BeaconingPattern;
}

/* Helper to build 24-hour flow points with realistic sinusoidal baseline + anomalies */
function generate24hFlowPoints(
  baseMean: number,
  baseSigma: number,
  burstHour?: number,
  burstFactor: number = 1
): TrafficFlowPoint[] {
  const points: TrafficFlowPoint[] = [];
  const now = Date.now();
  const ONE_HOUR = 3600_000;

  for (let i = 24; i >= 0; i--) {
    const ts = now - i * ONE_HOUR;
    const hourOfDay = new Date(ts).getHours();
    const timeLabel = `${String(hourOfDay).padStart(2, "0")}:00`;

    // Diurnal day-night cycle multiplier (0.6 night, 1.4 peak business hours)
    const diurnal = 1 + 0.35 * Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI);
    const mean = Math.round(baseMean * diurnal * 10) / 10;
    const sigma = Math.round(baseSigma * diurnal * 10) / 10;
    const upper = Math.round((mean + 3 * sigma) * 10) / 10;
    const lower = Math.max(0, Math.round((mean - 3 * sigma) * 10) / 10);

    // Random normal fluctuation
    const noise = (Math.random() - 0.5) * sigma * 1.5;
    let actual = Math.max(0.1, Math.round((mean + noise) * 10) / 10);
    let isAnomaly = false;
    let anomalyType: TrafficFlowPoint["anomalyType"] = undefined;
    let anomalyScore: number | undefined = undefined;

    // Inject burst anomaly if at targeted hour
    if (burstHour !== undefined && i <= burstHour && i >= burstHour - 2) {
      actual = Math.round((upper * burstFactor + Math.random() * 2) * 10) / 10;
      isAnomaly = true;
      anomalyType = burstFactor > 3 ? "EGRESS_BURST" : "BEACONING_JITTER";
      anomalyScore = Math.min(99, Math.round(85 + (actual / upper) * 5));
    }

    const packetRate = Math.round(actual * 125 * (1 + (Math.random() - 0.5) * 0.2));
    const entropyScore = isAnomaly ? 6.8 + Math.random() * 0.9 : 3.8 + Math.random() * 0.6;

    points.push({
      ts,
      timeLabel,
      baselineMeanMbps: mean,
      baselineUpper3SigmaMbps: upper,
      baselineLower3SigmaMbps: lower,
      actualThroughputMbps: actual,
      packetRatePps: packetRate,
      entropyScore: Math.round(entropyScore * 10) / 10,
      isAnomaly,
      anomalyType,
      anomalyScore
    });
  }

  return points;
}

export const WORKLOAD_FLOW_PROFILES: WorkloadFlowProfile[] = [
  {
    workloadId: "checkout-api-7d9f4b",
    workloadName: "checkout-api-7d9f4b (Pod / Payments)",
    environment: "prod",
    provider: "AWS",
    avgDailyThroughputGb: 142.5,
    normalActiveConnections: 840,
    observedProtocols: ["TLS 1.3", "HTTP/2", "Postgres-Wire"],
    historical3SigmaThresholdMbps: 18.5,
    currentStatus: "CRITICAL_BURST",
    flowPoints24h: generate24hFlowPoints(4.2, 1.1, 2, 4.8), // 4.8x breach in last 2 hours
    activeBeaconing: {
      id: "BEAC-991",
      workload: "checkout-api-7d9f4b",
      destinationIp: "185.220.101.34",
      destinationAsn: "AS200651 (TOR Exit Relay)",
      intervalSec: 45,
      jitterPercent: 4.2,
      confidenceScore: 97,
      observedHits: 38,
      verdict: "CONFIRMED_C2"
    }
  },
  {
    workloadId: "prod-postgres-payments",
    workloadName: "prod-postgres-payments (RDS)",
    environment: "prod",
    provider: "AWS",
    avgDailyThroughputGb: 480.0,
    normalActiveConnections: 320,
    observedProtocols: ["Postgres-Wire (Port 5432)"],
    historical3SigmaThresholdMbps: 42.0,
    currentStatus: "ANOMALOUS",
    flowPoints24h: generate24hFlowPoints(12.5, 2.8, 1, 3.2)
  },
  {
    workloadId: "finance-exports",
    workloadName: "finance-exports (S3 Bucket)",
    environment: "prod",
    provider: "AWS",
    avgDailyThroughputGb: 88.0,
    normalActiveConnections: 45,
    observedProtocols: ["HTTPS / REST (Port 443)"],
    historical3SigmaThresholdMbps: 8.5,
    currentStatus: "ANOMALOUS",
    flowPoints24h: generate24hFlowPoints(1.8, 0.6, 3, 5.1)
  },
  {
    workloadId: "prod-api-gateway-01",
    workloadName: "prod-api-gateway-01 (EC2)",
    environment: "prod",
    provider: "AWS",
    avgDailyThroughputGb: 820.0,
    normalActiveConnections: 2400,
    observedProtocols: ["HTTPS (Port 443)", "SSH (Port 22)", "Stratum (Port 3333)"],
    historical3SigmaThresholdMbps: 65.0,
    currentStatus: "ANOMALOUS",
    flowPoints24h: generate24hFlowPoints(22.0, 4.5, 4, 2.6)
  },
  {
    workloadId: "az-frontend-vm",
    workloadName: "az-frontend-vm (Azure VM)",
    environment: "prod",
    provider: "Azure",
    avgDailyThroughputGb: 310.0,
    normalActiveConnections: 950,
    observedProtocols: ["HTTPS (Port 443)"],
    historical3SigmaThresholdMbps: 28.0,
    currentStatus: "NORMAL",
    flowPoints24h: generate24hFlowPoints(8.0, 1.8)
  },
  {
    workloadId: "gcp-analytics-gke",
    workloadName: "gcp-analytics-gke (GCP GKE)",
    environment: "staging",
    provider: "GCP",
    avgDailyThroughputGb: 540.0,
    normalActiveConnections: 1200,
    observedProtocols: ["gRPC (Port 50051)", "HTTPS (Port 443)"],
    historical3SigmaThresholdMbps: 45.0,
    currentStatus: "NORMAL",
    flowPoints24h: generate24hFlowPoints(14.0, 3.2)
  }
];

export const FLOW_ANOMALIES: FlowAnomaly[] = [
  {
    id: "FLW-9401",
    ts: Date.now() - 12 * 60_000,
    workload: "checkout-api-7d9f4b",
    sourceIp: "10.0.4.18",
    destIp: "185.220.101.34",
    destPort: 9001,
    protocol: "TLS1.3",
    ja3Fingerprint: "cd08e31494f9531f560d64c695473da9",
    bytesTransferred: 48_213_000,
    packetsTransferred: 32_410,
    deviationSigma: 8.4,
    anomalyReason: "Outbound TLS to curated TOR exit relay; Shannon entropy 7.6 indicates high-grade encrypted tunnel with zero historical baseline.",
    recommendation: "Quarantine pod network namespace immediately; apply default-deny Calico NetworkPolicy.",
    status: "QUARANTINED"
  },
  {
    id: "FLW-9402",
    ts: Date.now() - 34 * 60_000,
    workload: "finance-exports",
    sourceIp: "10.0.4.18",
    destIp: "45.134.26.11",
    destPort: 443,
    protocol: "HTTPS",
    ja3Fingerprint: "771c65e8c11a9b2b87b05233b14329d8",
    bytesTransferred: 4_213_000_000,
    packetsTransferred: 2_890_120,
    deviationSigma: 6.2,
    anomalyReason: "Bulk data stream 31× baseline to unclassified ASN (AS39824); rate exceeds 3σ threshold by 4.2 GB.",
    recommendation: "Apply S3 bucket policy condition denying ASN 45.134.26.0/24.",
    status: "ACTIVE"
  },
  {
    id: "FLW-9403",
    ts: Date.now() - 76 * 60_000,
    workload: "prod-api-gateway-01",
    sourceIp: "10.0.2.14",
    destIp: "pool.minexmr.com",
    destPort: 443,
    protocol: "STRATUM",
    ja3Fingerprint: "a0e9f5d64bc6e82110c7104b2a9d8011",
    bytesTransferred: 14_820_000,
    packetsTransferred: 84_100,
    deviationSigma: 4.8,
    anomalyReason: "Stratum cryptomining protocol packet sequence detected over port 443 with uniform 64-byte payload cadence.",
    recommendation: "Terminate host process and isolate EC2 security group.",
    status: "QUARANTINED"
  },
  {
    id: "FLW-9404",
    ts: Date.now() - 120 * 60_000,
    workload: "vpc-prod-use1",
    sourceIp: "10.0.4.18",
    destIp: "10.0.4.0/24",
    destPort: 5432,
    protocol: "CUSTOM_TCP",
    bytesTransferred: 2_140_000,
    packetsTransferred: 18_400,
    deviationSigma: 5.6,
    anomalyReason: "Rapid TCP SYN sweep across 61 private subnet endpoints within 24s; zero TLS handshake completions.",
    recommendation: "Restrict pod east-west ingress/egress to explicitly mapped service CIDRs.",
    status: "ACTIVE"
  }
];

export interface MLEvaluationResult {
  isNovelAttack: boolean;
  noveltyScore: number;
  confidence: number;
  synthesizedTechniques: string[];
  explanation: string;
  suggestedMitigation: string;
  generatedSigmaRule: string;
}
