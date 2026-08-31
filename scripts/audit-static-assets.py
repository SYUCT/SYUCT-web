#!/usr/bin/env python3
"""Fast, dependency-free static performance guard for SYUCT-web."""
from __future__ import annotations

import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(ROOT.glob("*.html"))
FAILURES: list[str] = []
WARNINGS: list[str] = []


def clean_local_url(value: str) -> str | None:
    if not value or value.startswith(("http://", "https://", "//", "data:", "mailto:", "javascript:", "#")):
        return None
    return urlsplit(value).path.lstrip("/")


class AuditParser(HTMLParser):
    def __init__(self, page: Path):
        super().__init__(convert_charrefs=True)
        self.page = page
        self.image_preloads: list[str] = []

    def handle_starttag(self, tag: str, attrs_raw):
        attrs = dict(attrs_raw)
        line, _ = self.getpos()
        where = f"{self.page.name}:{line}"

        if tag == "img":
            src = attrs.get("src", "")
            local = clean_local_url(src)
            if local and not (ROOT / local).exists():
                FAILURES.append(f"{where} image does not exist: {local}")
            if "width" not in attrs or "height" not in attrs:
                FAILURES.append(f"{where} <img> missing width/height: {src}")
            if attrs.get("decoding") != "async":
                WARNINGS.append(f"{where} image should use decoding=async: {src}")
            if local:
                p = ROOT / local
                if p.exists() and p.is_file() and p.stat().st_size > 250_000:
                    above_fold = (
                        "landmark-" in local
                        or local.endswith("syuct-community-icon.webp")
                    )
                    if not above_fold and attrs.get("loading") != "lazy":
                        FAILURES.append(f"{where} heavy image should be lazy-loaded: {local}")

        if tag == "button" and attrs.get("data-lightbox"):
            local = clean_local_url(attrs["data-lightbox"])
            if local and not (ROOT / local).exists():
                FAILURES.append(f"{where} lightbox original does not exist: {local}")

        if tag == "link" and attrs.get("rel") == "preload" and attrs.get("as") == "image":
            href = attrs.get("href", "")
            self.image_preloads.append(href)
            local = clean_local_url(href)
            if local and not (ROOT / local).exists():
                FAILURES.append(f"{where} preload image does not exist: {local}")


for page in HTML_FILES:
    parser = AuditParser(page)
    parser.feed(page.read_text(encoding="utf-8"))
    duplicates = [url for url, count in Counter(parser.image_preloads).items() if count > 1]
    for url in duplicates:
        FAILURES.append(f"{page.name} duplicates image preload: {url}")

# Gallery pages must use lightweight display previews; lightbox originals stay untouched.
for page_name in ("index.html", "campus.html"):
    text = (ROOT / page_name).read_text(encoding="utf-8")
    for src in re.findall(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']', text, flags=re.I):
        local = clean_local_url(src) or ""
        if local.startswith("assets/gallery-") and local.endswith(".jpg"):
            FAILURES.append(f"{page_name} still renders a full gallery original: {local}")

# Original information images are protected: they must stay available for full-resolution viewing.
protected = [
    "assets/campus-map.jpg",
    "assets/sports-map.png",
    "assets/delivery-pickup-overview.png",
    "assets/delivery-haochijie-layout.png",
]
for rel in protected:
    if not (ROOT / rel).exists():
        FAILURES.append(f"protected high-resolution source missing: {rel}")

# Screenshot OCR must remain fully self-hosted; these are loaded only after the user starts OCR.
ocr_assets = [
    "assets/tesseract/v7.0.0/tesseract.min.js",
    "assets/tesseract/v7.0.0/worker.min.js",
    "assets/tesseract/v7.0.0/core/tesseract-core-lstm.wasm.js",
    "assets/tesseract/v7.0.0/core/tesseract-core-simd-lstm.wasm.js",
    "assets/tesseract/v7.0.0/core/tesseract-core-relaxedsimd-lstm.wasm.js",
    "assets/tesseract/v7.0.0/lang/chi_sim.traineddata.gz",
]
for rel in ocr_assets:
    if not (ROOT / rel).exists():
        FAILURES.append(f"local timetable OCR asset missing: {rel}")

ocr_source = (ROOT / "assets/timetable-ocr.js").read_text(encoding="utf-8")
if re.search(r"https?://|cdn\.", ocr_source, flags=re.I):
    FAILURES.append("assets/timetable-ocr.js must not load OCR code or models from a third-party origin")

# Optimized files should actually be smaller than the corresponding source.
pairs = [
    ("assets/syuct-community-icon.png", "assets/optimized/syuct-community-icon.webp"),
    ("assets/syuct-mini-qr-poster.png", "assets/optimized/syuct-mini-qr-poster.webp"),
    ("assets/sports-map.png", "assets/optimized/sports-map.webp"),
    ("assets/delivery-pickup-overview.png", "assets/optimized/delivery-pickup-overview.webp"),
    ("assets/delivery-haochijie-layout.png", "assets/optimized/delivery-haochijie-layout.webp"),
]
for src_rel, out_rel in pairs:
    src, out = ROOT / src_rel, ROOT / out_rel
    if not out.exists():
        FAILURES.append(f"optimized asset missing: {out_rel}")
    elif out.stat().st_size >= src.stat().st_size:
        WARNINGS.append(f"optimized asset is not smaller: {out_rel}")

# Guard the shared CSS/JS from accidental framework-sized growth.
for rel, budget in (("assets/styles.css", 120_000), ("assets/app.js", 120_000)):
    p = ROOT / rel
    if p.stat().st_size > budget:
        WARNINGS.append(f"{rel} is {p.stat().st_size/1024:.1f} KiB (budget {budget/1024:.0f} KiB)")

print(f"Audited {len(HTML_FILES)} HTML pages.")
if WARNINGS:
    print("Warnings:")
    for item in WARNINGS:
        print(f"  - {item}")
if FAILURES:
    print("Failures:")
    for item in FAILURES:
        print(f"  - {item}")
    sys.exit(1)
print("Static performance audit passed.")
