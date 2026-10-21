# Access keys are created by hand in the console so their secrets stay out of Terraform state.

resource "aws_iam_user" "api" {
  name = "ironwise-api"
}

resource "aws_iam_user" "worker" {
  name = "ironwise-worker"
}

data "aws_iam_policy_document" "api_send" {
  statement {
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.program_generation.arn]
  }
}

data "aws_iam_policy_document" "worker_consume" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
    ]
    resources = [aws_sqs_queue.program_generation.arn]
  }
}

resource "aws_iam_user_policy" "api_send" {
  name   = "program-generation-send"
  user   = aws_iam_user.api.name
  policy = data.aws_iam_policy_document.api_send.json
}

resource "aws_iam_user_policy" "worker_consume" {
  name   = "program-generation-consume"
  user   = aws_iam_user.worker.name
  policy = data.aws_iam_policy_document.worker_consume.json
}
