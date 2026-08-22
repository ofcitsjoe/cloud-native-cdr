# detection-engine/engine.py
import boto3
import json
import yaml
import time
import threading
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from config import settings
import os
import ipaddress

# Initialize AWS clients
sqs = boto3.client('sqs', region_name=settings.AWS_REGION)
lambda_client = boto3.client('lambda', region_name=settings.AWS_REGION)

# Initialize FastAPI app
app = FastAPI(title="CDR API", version="1.0")

# Allow the React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, this would be locked down to the frontend domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory database for MVP (Resets when server restarts)
incidents_db = []

def load_rules():
    """Loads all YAML signatures and sorts them by Priority (Highest First)."""
    rules = []
    for filename in os.listdir("rules"):
        if filename.endswith(".yml"):
            with open(f"rules/{filename}", "r") as file:
                rules.append(yaml.safe_load(file))
                
    # --- NEW: RULE PRIORITIZATION ---
    # Sort the rules descending based on the 'priority' key. 
    # If a rule has no priority, default to 0.
    rules.sort(key=lambda x: x.get('priority', 0), reverse=True)
    # --------------------------------
    
    return rules

def normalize_event(raw_event):
    """Extracts the critical fields from the raw AWS CloudTrail JSON."""
    detail = raw_event.get("detail", {})
    return {
        "event_time": raw_event.get("time"),
        "event_source": raw_event.get("source"),
        "action": detail.get("eventName"),
        "user_identity": detail.get("userIdentity", {}).get("arn", "Unknown"),
        "source_ip": detail.get("sourceIPAddress", "Unknown"),
        "raw_payload": raw_event
    }

def evaluate_rules(normalized_event, rules_list):
    if "cdr-lambda-execution-role" in normalized_event["user_identity"]:
        return False

    for rule in rules_list:
        if normalized_event["event_source"] == rule["event_source"]:
            if normalized_event["action"] in rule["target_actions"]:

                # Parse user_name early so we can use it in both conditions
                arn = normalized_event['user_identity']
                user_name = arn.split("/")[-1] if "/" in arn else arn
                
                # --- NEW CONTEXT-AWARE IP LOGIC ---
                if "trusted_cidrs" in rule:
                    is_trusted = False
                    try:
                        source_ip = ipaddress.ip_address(normalized_event["source_ip"])
                        for cidr in rule["trusted_cidrs"]:
                            if source_ip in ipaddress.ip_network(cidr):
                                is_trusted = True
                                break
                    except ValueError:
                        pass # Ignore malformed IPs
                    
                    # If the IP is inside the corporate VPN, log as INFO and HALT evaluation
                    if is_trusted:
                        incident = {
                            "id": f"INC-{int(time.time())}",
                            "timestamp": datetime.utcnow().isoformat(),
                            "rule_name": rule['name'],
                            "severity": "INFO",
                            "action": normalized_event['action'],
                            "user": user_name,
                            "source_ip": normalized_event['source_ip'],
                            "status": "Allowed (Trusted VPN)"
                        }
                        incidents_db.insert(0, incident)
                        print(f"✅ [INFO] {incident['rule_name']} - {incident['status']}")
                        return True # Short-circuits the engine so Priority 10 rules don't trigger
                # ----------------------------------

                # If IP is NOT trusted (or if rule doesn't check IPs), proceed as normal
                incident = {
                    "id": f"INC-{int(time.time())}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "rule_name": rule['name'],
                    "severity": rule['severity'],
                    "action": normalized_event['action'],
                    "user": user_name,
                    "source_ip": normalized_event['source_ip'],
                    "status": "Detected"
                }

                if rule['severity'] == "CRITICAL":
                    try:
                        lambda_client.invoke(
                            FunctionName="cdr-iam-containment",
                            InvocationType="Event",
                            Payload=json.dumps({"user_name": user_name})
                        )
                        incident["status"] = "Contained (Automated)"
                    except Exception as e:
                        incident["status"] = f"Containment Failed: {str(e)}"
                
                incidents_db.insert(0, incident) 
                print(f"🚨 [ALERT] {incident['rule_name']} - {incident['status']}")
                return True
                
    return False

def poll_queue():
    print(f"[*] SQS Poller Thread Started... Listening to {settings.SQS_QUEUE_URL}")
    rules_list = load_rules() # Now loads a list of rules
    
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=settings.SQS_QUEUE_URL,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=10
            )
            
            messages = response.get('Messages', [])
            for message in messages:
                raw_event = json.loads(message['Body']) 
                normalized_event = normalize_event(raw_event)
                
                evaluate_rules(normalized_event, rules_list) # Pass the list
                
                sqs.delete_message(
                    QueueUrl=settings.SQS_QUEUE_URL,
                    ReceiptHandle=message['ReceiptHandle']
                )
        except Exception as e:
            print(f"[-] Polling error: {e}")
            
        time.sleep(1)

# --- FASTAPI ENDPOINTS ---

@app.on_event("startup")
def startup_event():
    # Start the SQS polling in a background thread when the server starts
    thread = threading.Thread(target=poll_queue, daemon=True)
    thread.start()

@app.get("/api/v1/incidents")
def get_incidents():
    return {"incidents": incidents_db}

@app.get("/api/v1/rules")
def get_active_rules():
    """API endpoint to serve the active YAML rules to the frontend dashboard."""
    current_rules = load_rules()
    return {"rules": current_rules}

if __name__ == "__main__":
    print("[*] Starting CDR API Server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, access_log=False)