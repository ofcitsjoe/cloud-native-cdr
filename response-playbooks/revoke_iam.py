# response-playbooks/revoke_iam.py
import boto3
import json
import logging

# Configure logging for AWS CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------
# SAFETY MECHANISM: The Allowlist
# ---------------------------------------------------------
# These users can NEVER be contained by the automated system,
# preventing accidental self-destruction of the cloud environment.
ALLOWLIST = ["cdr-admin", "root", "admin"]

def lambda_handler(event, context):
    """
    AWS Lambda entry point for IAM Containment.
    Expected event payload: {"user_name": "TestHacker"}
    """
    user_name = event.get("user_name")
    
    if not user_name:
        msg = "Containment Failed: No user_name provided in the event payload."
        logger.error(msg)
        return {"statusCode": 400, "body": msg}
        
    if user_name in ALLOWLIST:
        msg = f"Containment Aborted: User '{user_name}' is protected by the Allowlist."
        logger.warning(msg)
        return {"statusCode": 403, "body": msg}
        
    iam = boto3.client('iam')
    
    # The ultimate quarantine policy. 
    # Explicit Denys in AWS always override any Allows.
    deny_all_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Deny",
                "Action": "*",
                "Resource": "*"
            }
        ]
    }
    
    try:
        # Attach the policy directly to the compromised user
        iam.put_user_policy(
            UserName=user_name,
            PolicyName="CDR-Automated-Containment-Deny-All",
            PolicyDocument=json.dumps(deny_all_policy)
        )
        
        msg = f"Containment Successful: Deny-All policy attached to '{user_name}'."
        logger.info(msg)
        return {"statusCode": 200, "body": msg}
        
    except Exception as e:
        msg = f"Containment Failed for user '{user_name}': {str(e)}"
        logger.error(msg)
        return {"statusCode": 500, "body": msg}

# ---------------------------------------------------------
# LOCAL TESTING BLOCK
# ---------------------------------------------------------
# This allows us to test the logic on our local machine 
# before deploying it to AWS Lambda.
if __name__ == "__main__":
    # Test 1: Try to contain an allowed user (Should fail safely)
    print("Running Test 1 (Allowlist Check)...")
    test_event_safe = {"user_name": "cdr-admin"}
    print(lambda_handler(test_event_safe, None))
    
    print("\n" + "-"*50 + "\n")
    
    # Test 2: Try to contain the dummy hacker user (Should succeed)
    print("Running Test 2 (Active Containment)...")
    test_event_hacker = {"user_name": "TestHacker"}
    print(lambda_handler(test_event_hacker, None))