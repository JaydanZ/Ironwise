import gzip
import hashlib
import json

import boto3
import pytest
from moto import mock_aws

from backend.scripts import sync_exercise_art as sync

SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor"/></svg>'


@pytest.fixture
def checkout(tmp_path):
    (tmp_path / "svg").mkdir()
    (tmp_path / "svg" / "bench-press.svg").write_bytes(SVG)
    (tmp_path / "LICENSE-ARTWORK.md").write_text("licence")
    (tmp_path / "ATTRIBUTION.md").write_text("credit")
    exercise = {
        "id": "bench-press",
        "name": "Bench Press",
        "svg": {"file": "svg/bench-press.svg", "sha256": hashlib.sha256(SVG).hexdigest()},
    }
    (tmp_path / "catalogue.json").write_text(json.dumps({"exercises": [exercise]}))
    return tmp_path


def test_rejects_a_drawing_that_fails_its_checksum(checkout):
    (checkout / "svg" / "bench-press.svg").write_bytes(b"<svg/>")

    with pytest.raises(SystemExit, match="Checksum mismatch"):
        sync.load_exercises(checkout)


def test_uploads_drawings_the_browser_can_use_as_masks(checkout):
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="art")

        sync.upload_art(s3, "art", checkout, sync.load_exercises(checkout))

        drawing = s3.get_object(Bucket="art", Key=f"{sync.ART_PREFIX}/bench-press.svg")
        body = drawing["Body"].read()

    assert drawing["ContentType"] == "image/svg+xml"
    assert drawing["ContentEncoding"] == "gzip"
    assert "immutable" in drawing["CacheControl"]
    assert gzip.decompress(body) == SVG


def test_ships_the_licence_with_the_art(checkout):
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="art")

        sync.upload_art(s3, "art", checkout, sync.load_exercises(checkout))

        keys = {item["Key"] for item in s3.list_objects_v2(Bucket="art")["Contents"]}

    assert keys == {
        f"{sync.ART_PREFIX}/bench-press.svg",
        f"{sync.ART_PREFIX}/LICENSE-ARTWORK.md",
        f"{sync.ART_PREFIX}/ATTRIBUTION.md",
    }
