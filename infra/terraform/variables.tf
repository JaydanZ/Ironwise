variable "aws_region" {
  description = "AWS region for the queues."
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile Terraform signs in with."
  type        = string
  default     = "ironwise"
}

variable "visibility_timeout_seconds" {
  description = "How long a received message stays hidden before SQS redelivers it. Must exceed a full generate_program run."
  type        = number
  default     = 120
}

variable "max_receive_count" {
  description = "Deliveries before a message moves to the dead-letter queue."
  type        = number
  default     = 3
}
