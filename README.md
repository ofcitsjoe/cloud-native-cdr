# Cloud-Native Detection and Response (CDR) Platform

An event-driven, Zero Trust security operations platform designed to monitor AWS infrastructure, detect anomalous activity via context-aware YAML signatures, and execute automated incident containment.

## 🛡️ Overview

This project implements a decoupled Security Operations Center (SOC) pipeline. It continuously ingests AWS CloudTrail telemetry, evaluates API actions against a prioritized rule engine, and visualizes threats in a real-time React dashboard.

The platform operates on a **Zero Trust Architecture**, evaluating both identity (IAM credentials) and network context (Source IP) to accurately distinguish between legitimate administration and compromised access.

---

## ✨ Key Features

- **Context-Aware Threat Detection**  
  Evaluates network origin alongside IAM credentials to prevent false positives and detect compromised keys.

- **YAML Rule Engine with Prioritization**  
  Solves "rule shadowing" by evaluating highly specific, priority-scored threat signatures before falling back to general anomaly detection.

- **Automated Containment**  
  Integrates with AWS Lambda to automatically attach `Deny-All` policies to compromised IAM entities when a critical breach is detected.

- **Decoupled Architecture**  
  Utilizes AWS SQS to separate telemetry ingestion from the core Python evaluation engine, improving availability and fault tolerance.

- **Real-Time Dashboard**  
  A modern, dark-mode SOC interface featuring live KPIs, incident feeds, and dynamic threat signature visualization.

---

## 🛠️ Tech Stack

### Frontend — SOC Dashboard

- React
- Vite
- Tailwind CSS v4
- Lucide React
- Axios

### Backend — Zero Trust Detection Engine

- Python 3
- FastAPI
- Uvicorn
- Boto3 (AWS SDK)

### Cloud Infrastructure

- AWS CloudTrail
- AWS EventBridge
- Amazon SQS
- Amazon EC2
- Amazon S3
- AWS IAM
- AWS Lambda
- Terraform

---

## ⚙️ Architecture & Data Flow

The platform operates across four distinct phases:

```text
AWS CloudTrail
      │
      ▼
  EventBridge
      │
      ▼
     SQS
      │
      ▼
Python Detection Engine
      │
      ├── YAML Rule Engine
      ├── Priority Evaluation
      ├── IP/CIDR Verification
      │
      ├── CRITICAL ──────► AWS Lambda
      │                       │
      │                       ▼
      │                   IAM Deny-All
      │
      ▼
   FastAPI
      │
      ▼
React SOC Dashboard
```

### 1. Telemetry Ingestion — EventBridge → SQS

AWS CloudTrail captures management and data events across the cloud environment.

An EventBridge rule filters logs for specific services such as:

- IAM
- EC2
- S3
- CloudTrail

Matching events are routed directly into a centralized Amazon SQS queue.

This decouples the AWS environment from the local detection engine.

---

### 2. Zero Trust Evaluation — Python Engine

The Python detection engine continuously polls the SQS queue.

When an event arrives, the engine normalizes the JSON data and passes it through the evaluation pipeline.

#### Signature Matching

The engine checks incoming events against active YAML-based threat signatures.

#### Priority Sorting

Rules are evaluated according to their priority score, ensuring that highly specific rules are evaluated before generic anomaly rules.

#### Context Verification

The engine evaluates both:

- IAM identity
- Source IP / network origin

If an event matches a rule but originates from a whitelisted CIDR block, such as a corporate VPN, the engine:

1. Short-circuits the threat rule.
2. Logs the event as an `INFO` allowlist action.
3. Prevents the event from being incorrectly classified as malicious.

This helps prevent **rule shadowing and false positives**.

---

### 3. Automated Containment — AWS Lambda

If an event triggers a rule classified as `CRITICAL`, such as:

- Defense evasion activity
- Untrusted IAM login
- Compromised credentials

the detection engine uses Boto3 to invoke a dedicated AWS Lambda function.

The Lambda function attaches an inline `Deny-All` policy to the offending IAM entity, immediately revoking its cloud access while preserving the relevant forensic information.

---

### 4. Real-Time Visualization — FastAPI → React

The Python detection engine exposes:

- Parsed incident data
- Active YAML rules
- Incident statistics

through FastAPI REST endpoints.

The React frontend continuously polls these endpoints and dynamically calculates metrics such as:

- Total Incidents
- Critical Incidents
- Automated Containments
- Active Threat Signatures

The information is presented through a highly scannable, enterprise-style SOC dashboard.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18+
- Python 3.10+
- AWS CLI
- Terraform
- AWS credentials with the required permissions

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ofcitsjoe/cloud-native-cdr.git
cd cloud-native-cdr
```

### 2. Start the Zero Trust Detection Engine

```bash
cd detection-engine

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI detection engine
python engine.py
```

The backend API will be available at:

```text
http://localhost:8000
```

---

### 3. Start the SOC Dashboard

Open a new terminal:

```bash
cd dashboard

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

The dashboard will be available at:

```text
http://localhost:5173
```

---

## 🔐 Security Architecture

The platform follows a **Zero Trust** approach by evaluating multiple dimensions of an AWS event rather than relying solely on identity.

```text
                 ┌──────────────────────┐
                 │     CloudTrail       │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │     EventBridge      │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │        SQS           │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Detection Engine     │
                 │                      │
                 │ IAM Identity         │
                 │ Source IP            │
                 │ YAML Signatures      │
                 │ Rule Priority        │
                 └──────────┬───────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
        ┌───────────┐              ┌─────────────┐
        │   ALLOW   │              │   CRITICAL  │
        │  / INFO   │              │    ALERT    │
        └───────────┘              └──────┬──────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │ AWS Lambda  │
                                  └──────┬──────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │ IAM DENY    │
                                  │    ALL      │
                                  └─────────────┘
```

---

## 📁 Project Structure

```text
cloud-native-cdr/
│
├── detection-engine/
│   ├── engine.py
│   ├── requirements.txt
│   └── ...
│
├── dashboard/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── response-playbooks/
│   └── ...
│
├── terraform/
│   └── ...
│
└── README.md
```

---

## 🎯 Project Goals

The CDR platform is designed to provide:

- Automated AWS threat detection
- Context-aware security analysis
- Reduced false positives
- Automated incident containment
- Decoupled and fault-tolerant event processing
- Real-time security visibility
- Infrastructure-as-Code deployment

---

## 👥 Team

Cloud-Native Detection and Response (CDR) Platform developed as a collaborative cloud security project.

---

## 📄 License

This project is intended for educational and demonstration purposes.
