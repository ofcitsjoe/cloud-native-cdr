# infrastructure/telemetry.tf

# 1. SQS Queue for Log Ingestion
resource "aws_sqs_queue" "telemetry_queue" {
  name                      = "cdr-telemetry-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 86400 # 1 day retention
  receive_wait_time_seconds = 10    # Enable long polling

  tags = {
    Name = "cdr-telemetry-queue"
  }
}

# 2. SQS Policy to allow EventBridge to write to it
resource "aws_sqs_queue_policy" "telemetry_queue_policy" {
  queue_url = aws_sqs_queue.telemetry_queue.id
  policy    = data.aws_iam_policy_document.sqs_policy.json
}

data "aws_iam_policy_document" "sqs_policy" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.telemetry_queue.arn]
  }
}

# 3. EventBridge Rule to capture AWS API calls
resource "aws_cloudwatch_event_rule" "capture_aws_api" {
  name        = "capture-ec2-iam-events"
  description = "Capture all EC2 and IAM API calls for the Detection Engine"

  event_pattern = jsonencode({
    "source" : ["aws.ec2", "aws.iam"],
    "detail-type" : ["AWS API Call via CloudTrail"]
  })
}

resource "aws_cloudwatch_event_target" "send_to_sqs" {
  rule      = aws_cloudwatch_event_rule.capture_aws_api.name
  target_id = "SendToSQS"
  arn       = aws_sqs_queue.telemetry_queue.arn
}

# 4. Output the Queue URL for the Python Engine
output "sqs_queue_url" {
  description = "The URL of the SQS queue for the Python Detection Engine"
  value       = aws_sqs_queue.telemetry_queue.id
}

# 5. S3 Bucket for CloudTrail Logs
resource "aws_s3_bucket" "cloudtrail_bucket" {
  bucket_prefix = "cdr-cloudtrail-logs-"
  force_destroy = true # Allows easy cleanup later
}

resource "aws_s3_bucket_policy" "cloudtrail_bucket_policy" {
  bucket = aws_s3_bucket.cloudtrail_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_bucket.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_bucket.arn}/AWSLogs/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# 6. The CloudTrail Trail
resource "aws_cloudtrail" "main_trail" {
  name                          = "cdr-management-events"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_bucket.id
  include_global_service_events = true
  is_multi_region_trail         = false
  enable_log_file_validation    = true

  depends_on = [aws_s3_bucket_policy.cloudtrail_bucket_policy]
}