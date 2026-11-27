resource "aws_s3_bucket" "exercise_art" {
  bucket = var.exercise_art_bucket_name
}

resource "aws_s3_bucket_public_access_block" "exercise_art" {
  bucket                  = aws_s3_bucket.exercise_art.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

data "aws_iam_policy_document" "exercise_art_public_read" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.exercise_art.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_policy" "exercise_art_public_read" {
  bucket = aws_s3_bucket.exercise_art.id
  policy = data.aws_iam_policy_document.exercise_art_public_read.json

  # S3 rejects a public policy until the access block allows one
  depends_on = [aws_s3_bucket_public_access_block.exercise_art]
}

# CSS masks load in CORS mode, so without this every drawing fails silently
resource "aws_s3_bucket_cors_configuration" "exercise_art" {
  bucket = aws_s3_bucket.exercise_art.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.exercise_art_allowed_origins
    max_age_seconds = 86400
  }
}
