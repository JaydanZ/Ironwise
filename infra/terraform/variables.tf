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

variable "exercise_art_bucket_name" {
  description = "Globally unique name for the public exercise illustration bucket."
  type        = string
}

variable "exercise_art_allowed_origins" {
  description = "Frontend origins allowed to load the illustrations as CSS masks."
  type        = list(string)
  default     = ["http://localhost:5173"]
}
