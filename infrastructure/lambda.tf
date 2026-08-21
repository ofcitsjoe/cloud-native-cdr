# infrastructure/lambda.tf

# 1. Package the Python script into a ZIP file
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "../response-playbooks/revoke_iam.py"
  output_path = "revoke_iam.zip"
}

# 2. Create the IAM Role for the Lambda Function
resource "aws_iam_role" "lambda_execution_role" {
  name = "cdr-lambda-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# 3. Grant Least-Privilege Permissions to the Lambda
resource "aws_iam_role_policy" "lambda_policy" {
  name = "cdr-lambda-policy"
  role = aws_iam_role.lambda_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:PutUserPolicy",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# 4. Deploy the AWS Lambda Function
resource "aws_lambda_function" "containment_lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "cdr-iam-containment"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "revoke_iam.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.10"
}