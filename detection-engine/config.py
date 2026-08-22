# detection-engine/config.py
import os

class Settings:
    # Replace this with the URL you got from the Terraform output
    SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "https://sqs.us-east-1.amazonaws.com/791316000394/cdr-telemetry-queue")
    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

settings = Settings()