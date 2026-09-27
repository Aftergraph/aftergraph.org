#!/usr/bin/env python3
"""Deterministic tests for the independent, standard-library PNG observer."""
import binascii
import base64
import hashlib
import json
import struct
import sys
from pathlib import Path
import tempfile
import unittest
import zlib

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.pock_m8_f15_evidence_package import collect_browser_artifacts
from scripts.verify_pock_m8_f15_evidence import (
    analyze_frame_pair, decode_png_rgba, verify_browser_frame_bundle,
)


def png_chunk(kind, payload):
    return (struct.pack(">I", len(payload)) + kind + payload
            + struct.pack(">I", binascii.crc32(kind + payload) & 0xffffffff))


def make_png(*, changed_pixel=None, filter_mode=0):
    width, height = 800, 600
    previous = bytearray(width * 4)
    scanlines = bytearray()
    expected = bytearray()
    for y in range(height):
        row = bytearray(width * 4)
        for x in range(width):
            i = x * 4
            row[i:i + 4] = bytes(((x + y) & 255, (x * 3) & 255, (y * 5) & 255, 255))
        if changed_pixel == (12, y):
            row[12 * 4:12 * 4 + 4] = b"\xff\x00\xff\xff"
        expected.extend(row)
        mode = (y + filter_mode) % 5
        encoded = bytearray(len(row))
        for i, value in enumerate(row):
            left = row[i - 4] if i >= 4 else 0
            up = previous[i]
            upper_left = previous[i - 4] if i >= 4 else 0
            if mode == 0:
                predictor = 0
            elif mode == 1:
                predictor = left
            elif mode == 2:
                predictor = up
            elif mode == 3:
                predictor = (left + up) // 2
            else:
                p = left + up - upper_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - upper_left)
                predictor = left if pa <= pb and pa <= pc else up if pb <= pc else upper_left
            encoded[i] = (value - predictor) & 255
        scanlines.append(mode)
        scanlines.extend(encoded)
        previous = row
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr)
            + png_chunk(b"IDAT", zlib.compress(scanlines)) + png_chunk(b"IEND", b"")), bytes(expected)


class IndependentFrameAnalysisTests(unittest.TestCase):
    def test_decodes_rgba_png_with_all_five_filters(self):
        encoded, expected = make_png(filter_mode=0)
        width, height, pixels = decode_png_rgba(encoded)
        self.assertEqual((width, height), (800, 600))
        self.assertEqual(pixels, expected)

    def test_detects_a_localized_fixture_change(self):
        before, _ = make_png()
        after, _ = make_png(changed_pixel=(12, 14))
        metrics = analyze_frame_pair(before, after)
        self.assertEqual(metrics["changedPixels"], 1)
        self.assertEqual(metrics["fixtureRegionChangedPixels"], 1)
        self.assertEqual(metrics["changedBounds"], [12, 14, 12, 14])

    def test_identical_frames_fail_closed(self):
        frame, _ = make_png()
        with self.assertRaisesRegex(ValueError, "frame_pixel_change_outside_expected_bounds"):
            analyze_frame_pair(frame, frame)

    def test_corrupt_png_crc_is_rejected(self):
        frame, _ = make_png()
        damaged = bytearray(frame)
        damaged[-5] ^= 1
        with self.assertRaisesRegex(ValueError, "png_chunk_crc_invalid"):
            decode_png_rgba(bytes(damaged))

    def test_deflate_expansion_is_capped_at_expected_frame_size(self):
        width, height = 800, 600
        ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
        # This tiny payload expands beyond the fixed frame scanline budget.
        expanded = b"\x00" * (height * (width * 4 + 1) + 2_000_000)
        encoded = (b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr)
                   + png_chunk(b"IDAT", zlib.compress(expanded)) + png_chunk(b"IEND", b""))
        with self.assertRaisesRegex(ValueError, "png_pixel_data_length_invalid"):
            decode_png_rgba(encoded)

    def test_execution_id_rejects_path_syntax(self):
        from scripts.pock_m8_f15_evidence_package import EXECUTION_ID, path_has_symlink
        for valid in ("36339288646-1", "9-2"):
            self.assertIsNotNone(EXECUTION_ID.fullmatch(valid))
        for invalid in ("../escape-1", "123/../x", "1--1", "1-0", "1-a", "1-1/more"):
            self.assertIsNone(EXECUTION_ID.fullmatch(invalid))
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            link = root / "linked-dir"
            try:
                link.symlink_to(root, target_is_directory=True)
            except OSError:
                self.skipTest("symlink creation unavailable")
            self.assertTrue(path_has_symlink(link))
            self.assertTrue(path_has_symlink(link / "child"))
            self.assertFalse(path_has_symlink(root / "regular"))

    def test_packager_and_independent_verifier_bind_the_same_raw_frames(self):
        before, _ = make_png()
        after, _ = make_png(changed_pixel=(12, 14))
        before_sha = hashlib.sha256(before).hexdigest()
        after_sha = hashlib.sha256(after).hexdigest()
        fixture_sha = "c" * 64
        binding_hash = "d" * 64
        proof_hash = "a" * 64
        boot_hash = "b" * 64
        event_digest = "sha256:" + "e" * 64
        receipt = {
            "contract": "GuestBrowserProbeReceipt/v1",
            "bindingHash": binding_hash,
            "executionProofHash": proof_hash,
            "nonce": "f" * 64,
            "observation": {
                "contract": "GuestBrowserObservation/v1",
                "browserSource": "GUEST_LOCAL_CHROMIUM_CDP",
                "browserBinarySha256": "60c03e8882f4bb47459a905ede1074e1e746c5b765e437c288e460320540a8a3",
                "fixtureSha256": fixture_sha,
                "before": {"counter": "0", "frameSha256": before_sha,
                           "pngBase64": base64.b64encode(before).decode("ascii")},
                "after": {"counter": "1", "frameSha256": after_sha,
                          "pngBase64": base64.b64encode(after).decode("ascii")},
                "inputMethod": "CDP_INPUT_DISPATCH_MOUSE_EVENT",
                "inputEffectObservedInGuestBrowser": True,
                "independentObservation": False,
                "humanTakeover": False,
                "hardwareAttestation": "BLOCKED",
            },
            "guestBrowserMac": "9" * 64,
        }
        receipt_bytes = (json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n").encode()
        receipt_sha = hashlib.sha256(receipt_bytes).hexdigest()
        ready = {"contract": "GuestBrowserArtifactSet/v1", "beforeFrameSha256": before_sha,
                 "afterFrameSha256": after_sha, "receiptSha256": receipt_sha}

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            run_dir = root / "run"
            evidence_dir = run_dir / "browser-evidence"
            evidence_dir.mkdir(parents=True)
            (evidence_dir / "before.png").write_bytes(before)
            (evidence_dir / "after.png").write_bytes(after)
            (evidence_dir / "receipt.json").write_bytes(receipt_bytes)
            (evidence_dir / "READY.json").write_text(
                json.dumps(ready, sort_keys=True), encoding="utf-8")
            result = {
                "f13Run": {
                    "executionProof": {"proofHash": proof_hash, "bootObservationHash": boot_hash},
                    "guestBrowserProbe": {
                        "artifactsPath": str(evidence_dir), "receiptSha256": receipt_sha,
                        "beforeFrameSha256": before_sha, "afterFrameSha256": after_sha,
                        "bindingHash": binding_hash, "executionProofHash": proof_hash,
                        "bootObservationHash": boot_hash, "fixtureSha256": fixture_sha,
                        "frameCaptureMethod": "CDP_PAGE_SCREENCAST",
                        "guestLocalBrowserClickEffectObserved": True,
                    },
                },
                "guestBrowser": {
                    "guestInputAck": {"contract": "HabitatGuestInputAck/v1", "applied": True,
                                      "afterFrameSha256": after_sha, "inputEventDigest": event_digest},
                    "inputEventDigest": event_digest,
                },
            }
            bundle = root / "bundle"
            bundle.mkdir()
            package_summary, copied = collect_browser_artifacts(run_dir, result, bundle)
            self.assertTrue(package_summary["matchesResult"])
            self.assertEqual(len(copied), 4)
            independent = verify_browser_frame_bundle(bundle, result)
            self.assertEqual(independent["status"], "INDEPENDENT_PIXEL_ANALYSIS_PASS")
            self.assertEqual(independent["changedPixels"], 1)
            self.assertEqual(independent["fixtureRegionChangedPixels"], 1)
            self.assertIs(independent["guestReceiptMacIndependentlyVerified"], False)
            self.assertIs(independent["controlInputAckMacIndependentlyVerified"], False)
            self.assertIs(independent["pixelDeltaBoundToPointerCoordinate"], False)
            self.assertIs(independent["guestFrameSourceIndependentlyAuthenticated"], False)

            (bundle / "browser-evidence" / "after.png").write_bytes(before)
            with self.assertRaisesRegex(SystemExit, "browser_frame_digest_binding_invalid"):
                verify_browser_frame_bundle(bundle, result)


if __name__ == "__main__":
    unittest.main(verbosity=2)
