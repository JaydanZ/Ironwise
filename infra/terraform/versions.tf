terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Local state for now; see "Remote Terraform state" in docs/plans/2026-10-20-durable-program-generation.md
  backend "local" {}
}
