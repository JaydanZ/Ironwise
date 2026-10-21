resource "aws_sqs_queue" "program_generation_dlq" {
  name                      = "program-generation-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "program_generation" {
  name                       = "program-generation"
  visibility_timeout_seconds = var.visibility_timeout_seconds
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.program_generation_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
}
