# SENTINEL-X · Cloud-Native Intrusion Detection & Response (CN-IDR)

[![Version](https://img.shields.io/badge/version-2.0.0--ai--ml-2FD6B5.svg)](https://github.com/ofcitsjoe/cloud-native-cdr)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Design Inspiration](https://img.shields.io/badge/design-SSTR--inspired-121920.svg)](https://sstr.tech/en/)

> **Next-Generation Cloud-Native Detection and Response (CDR)** featuring a dual AI/ML threat engine (Novel Zero-Day Attack Vectorizer & 3-Sigma Behavioral Traffic Flow Baselines), grounded AI Security Analyst Copilot, automated multi-cloud containment, and an editorial SSTR-inspired SOC operations console.

```
Visibility → Detection → ML Vectorization → Investigation → Decision → Automated Response
```

---

## 🚀 Version Evolution: v1.0 vs v2.0

| Feature Area | v1.0 (Legacy Baseline) | v2.0 (Current AI & Behavioral Release) |
| :--- | :--- | :--- |
| **Detection Approach** | Static threshold rules & YAML definitions | **Dual AI/ML Engines**: Multi-Tactic TTP Sequence Vectorizer + 3-Sigma Sinusoidal Flow Baselines |
| **Zero-Day / Novel Threats** | Not supported (relied on known signatures) | **Novel Mutation Scoring (0–100)** with auto-synthesized Sigma rules & predictive blast radius |
| **Network Traffic Analysis** | Basic egress filtering | **24h Dynamic Confidence Bands ($\mu \pm 3\sigma$)**, FFT C2 beaconing jitter detector & Shannon entropy |
| **AI Analyst / Copilot** | None | **Grounded RAG AI Analyst** generating executable `kubectl`, `aws cli`, and `terraform` playbooks |
| **Console & Visual Design** | Standard dashboard | **SSTR-inspired editorial UI** with interactive topology radar, SVG confidence charts, and dark abyss palettes |
| **Attack Simulation** | Manual script execution | **Live Terminal Attack Simulator (`npm run attack`)** that pushes real-time alerts to the browser |
| **Backend Architecture** | Python FastAPI / Postgres dependency | **Dual-Mode Express API**: Enterprise PostgreSQL + Zero-Setup Standalone In-Memory fallback |

---

## 🛠️ System Architecture

```
                                  [Cloud Telemetry Sources]
                 (AWS CloudTrail · VPC Flow Logs · Kubernetes Audit · Okta Identity)
                                             │
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │           SENTINEL-X 2.0 Ingestion & ML Engine         │
                 ├───────────────────────────┬────────────────────────────┤
                 │ 1. AI Sequence Vectorizer │ 2. 3-Sigma Flow Engine     │
                 │    - Multi-stage TTP math │    - Diurnal moving curves │
                 │    - Novelty score (0-100)│    - C2 beaconing & jitter │
                 │    - Sigma rule generator │    - Shannon entropy check │
                 └───────────────────────────┴────────────────────────────┘
                                             │
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │             SOC Operations Console (SSTR UI)           │
                 ├───────────────────────────┬────────────────────────────┤
                 │ • Novel Threat Matrix     │ • AI Security Analyst      │
                 │ • Traffic Flow Explorer   │ • Attack Path Graph        │
                 │ • Incident Timeline       │ • 1-Click Containment      │
                 └───────────────────────────┴────────────────────────────┘
                                             │
                                             ▼
                 [Automated Containment: Calico NetworkPolicy · AWS IAM Revoke · Security Groups]
```

---

## 📂 Repository Layout

```
├── src/                               # SENTINEL-X 2.0 Frontend Console & Models
│   ├── App.tsx                        # Mode switch: Marketing site ↔ SOC Console
│   ├── store.tsx                      # Global state, live 2.5s telemetry sync & alerts
│   ├── api/client.ts                  # Unified API client (FastAPI, Express, & In-Memory)
│   ├── data/
│   │   ├── mlData.ts                  # Novel attack chains, 24h baseline profiles, beaconing
│   │   └── securityData.ts            # Typed telemetry models, alerts, and incident graphs
│   ├── components/                    # SVG charts, BaselineFlowChart, NoveltyMutationGauge, Analyst
│   ├── landing/Landing.tsx            # SSTR-inspired product narrative with topology radar
│   └── views/                         # NovelThreats · TrafficAnomaly · Threats · Incidents · 
│                                      # Infrastructure · AttackPath · Response · Rules · Events
├── server/                            # SENTINEL-X 2.0 Dual-Mode Backend API
│   ├── index.js                       # Express REST API (Auth, ML endpoints, attack ingestion)
│   ├── ml-engine.js                   # Sequence vectorizer, baseline calculator, AI Copilot
│   ├── detect.js                      # SQL windowed rule evaluator
│   └── seed.js                        # PostgreSQL schema & dataset seeder
├── scripts/                           # Testing & Live Simulation Tools
│   ├── cli-test.js                    # Interactive terminal CLI (chat with AI Analyst & test ML)
│   └── simulate-attack.js             # Live attack simulator (pushes unauthorized actions to UI)
├── detection-engine/                  # v1.0 Python FastAPI Detection Engine
├── response-playbooks/                # v1.0 AWS Lambda Containment Scripts (Python)
├── infrastructure/                    # Terraform Telemetry & IAM Infrastructure
└── dashboard/                         # v1.0 Legacy React Dashboard
```

---

## ⚡ Quick Start (v2.0)

### 1. Install Dependencies
```powershell
npm install
```

### 2. Start the Frontend Console
```powershell
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 3. Start the Backend ML Server (Optional / Recommended)
In a second terminal:
```powershell
npm run server
```
*The server starts on port `8080` in Standalone In-Memory mode (or PostgreSQL mode if `DATABASE_URL` is set).*

---

## 🧪 Interactive Testing & Terminal Simulations

### Option A: Launch a Live Attack from Your Terminal
Watch live alerts and incident correlation appear on the web dashboard in real time:
```powershell
npm run attack
```
Select a scenario (e.g. *Unauthorized IAM Privilege Escalation*, *S3 Data Exfiltration*, or *Kubernetes Secrets Theft*) and watch the red alert banner pop up on the website!

### Option B: Interactive AI Analyst & ML CLI
Chat with the AI Security Analyst and test custom attack sequence vectors:
```powershell
npm run cli
```

### Option C: Direct PowerShell Commands
```powershell
# Ask the AI Analyst:
Invoke-RestMethod -Uri "http://localhost:8080/api/ai/copilot" `
  -Method POST -ContentType "application/json" `
  -Body '{"query": "Why is checkout-api traffic anomalous?"}' | ConvertTo-Json -Depth 4

# Test a custom MITRE sequence with the ML Vectorizer:
Invoke-RestMethod -Uri "http://localhost:8080/api/ml/novel-attacks/analyze" `
  -Method POST -ContentType "application/json" `
  -Body '{"actions": ["T1078 Valid Cloud Accounts", "STS AssumeRole", "Micro-session token rotation", "Distributed S3 egress"]}' | ConvertTo-Json -Depth 4
```

---

## 🛡️ Response Playbooks & Containment

SENTINEL-X generates and executes verified containment actions:
- **Kubernetes Pod Isolation**: Applies Calico default-deny `NetworkPolicy` to cut ingress/egress while preserving memory for digital forensics.
- **IAM Session Revocation**: Attaches an explicit `DenyAll` inline policy to attacker credentials and terminates active STS tokens.
- **VPC Border Blocking**: Automatically adds egress deny rules to AWS Security Groups and Network ACLs.

---

## 📜 License

MIT License. Designed and engineered for Cloud-Native Intrusion Detection & Response.
