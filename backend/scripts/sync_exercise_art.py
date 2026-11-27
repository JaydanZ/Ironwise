"""Uploads a pinned Open Exercise Art checkout to S3 and writes the name catalogues.

Usage: python -I backend/scripts/sync_exercise_art.py <checkout> <bucket> [--profile ironwise]
"""
import argparse
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

import boto3

REPO = Path(__file__).resolve().parents[2]
PINNED_COMMIT = "0f11ea4680746970e58b83448cdcdb64e4fc2793"
# Each pinned commit gets its own prefix, so year-long caching never serves a stale drawing
ART_PREFIX = PINNED_COMMIT[:12]
CACHE_CONTROL = "public, max-age=31536000, immutable"
LICENCE_FILES = ("LICENSE-ARTWORK.md", "ATTRIBUTION.md")


def load_exercises(checkout: Path) -> list[dict]:
    exercises = json.loads((checkout / "catalogue.json").read_text(encoding="utf-8"))["exercises"]
    for exercise in exercises:
        svg = checkout / exercise["svg"]["file"]
        if hashlib.sha256(svg.read_bytes()).hexdigest() != exercise["svg"]["sha256"]:
            raise SystemExit(f"Checksum mismatch: {svg}")
    return exercises


def upload_art(s3, bucket: str, checkout: Path, exercises: list[dict]) -> None:
    for exercise in exercises:
        s3.put_object(
            Bucket=bucket,
            Key=f"{ART_PREFIX}/{exercise['id']}.svg",
            # S3 serves objects exactly as stored, so compressing here is the only way to shrink transfers
            Body=gzip.compress((checkout / exercise["svg"]["file"]).read_bytes()),
            ContentType="image/svg+xml",
            ContentEncoding="gzip",
            CacheControl=CACHE_CONTROL,
        )
    for name in LICENCE_FILES:
        s3.put_object(
            Bucket=bucket,
            Key=f"{ART_PREFIX}/{name}",
            Body=(checkout / name).read_bytes(),
            ContentType="text/markdown; charset=utf-8",
        )


def write_catalogues(exercises: list[dict]) -> None:
    catalogue = [{"id": e["id"], "name": e["name"], "aliases": e.get("aliases", [])} for e in exercises]
    (REPO / "frontend" / "src" / "data" / "exerciseCatalogue.json").write_text(json.dumps(catalogue), encoding="utf-8")

    names_path = REPO / "backend" / "data" / "exercise_names.json"
    names_path.parent.mkdir(exist_ok=True)
    names_path.write_text(json.dumps([e["name"] for e in exercises]), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkout", type=Path)
    parser.add_argument("bucket")
    parser.add_argument("--profile", default="ironwise")
    args = parser.parse_args()

    head = subprocess.run(
        ["git", "-C", str(args.checkout), "rev-parse", "HEAD"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    if head != PINNED_COMMIT:
        raise SystemExit(f"Checkout is at {head}, expected {PINNED_COMMIT}")

    exercises = load_exercises(args.checkout)
    s3 = boto3.Session(profile_name=args.profile).client("s3")
    upload_art(s3, args.bucket, args.checkout, exercises)
    write_catalogues(exercises)
    print(f"Uploaded {len(exercises)} drawings to s3://{args.bucket}/{ART_PREFIX}/")


if __name__ == "__main__":
    main()
