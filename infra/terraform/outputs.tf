output "program_queue_url" {
  value = aws_sqs_queue.program_generation.url
}

output "program_dlq_url" {
  value = aws_sqs_queue.program_generation_dlq.url
}

output "api_user_name" {
  value = aws_iam_user.api.name
}

output "worker_user_name" {
  value = aws_iam_user.worker.name
}
