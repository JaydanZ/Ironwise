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

output "exercise_art_bucket" {
  value = aws_s3_bucket.exercise_art.bucket
}

output "exercise_art_origin" {
  value = "https://${aws_s3_bucket.exercise_art.bucket_regional_domain_name}"
}
