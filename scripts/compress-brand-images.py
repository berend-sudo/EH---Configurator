#!/usr/bin/env python3
"""Compress the brand photo JPGs in public/brand/ in place.

The originals shipped straight from cameras at 3–5 MB / 4096 px — far
larger than anything the configurator or PDF ever display, and slow to
load on mobile (Kim's feedback, 05/06). next/image already re-encodes to
AVIF/WebP at request time, but the *source* files still have to be read,
decoded and re-encoded on the first request, and the first paint waits on
the original bytes.

This script resamples every JPG to a sensible web ceiling and re-encodes
at a high-but-not-lossless quality. Run it whenever new brand photos are
dropped in:

    python3 scripts/compress-brand-images.py

It rewrites the files in place; git tracks the change and the full-res
originals remain in history if they're ever needed again. Idempotent —
re-running on already-compressed files is a no-op-ish (they're already
under the ceiling, so only a light re-encode).

Pass one or more filenames to compress only those (handy after dropping a
single new batch in, so the rest of the catalog isn't needlessly
re-encoded). Names resolve against public/brand/ unless an explicit path
is given:

    python3 scripts/compress-brand-images.py monopitch-2br-1.jpg aframe1.jpg
"""
import os
import sys
from PIL import Image, ImageOps

BRAND_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "brand")
MAX_EDGE = 2000   # px on the longest side — well above any on-screen size
QUALITY = 82      # visually lossless for photography at this scale

def _targets(argv):
    """Files to process: the given args (resolved against BRAND_DIR when bare),
    or every JPG in BRAND_DIR when none are passed."""
    if argv:
        return [a if os.path.dirname(a) else os.path.join(BRAND_DIR, a) for a in argv]
    return [os.path.join(BRAND_DIR, n) for n in sorted(os.listdir(BRAND_DIR))]

def main() -> int:
    total_before = total_after = 0
    for path in _targets(sys.argv[1:]):
        name = os.path.basename(path)
        if not name.lower().endswith((".jpg", ".jpeg")):
            continue
        before = os.path.getsize(path)
        im = Image.open(path)
        # Bake in any EXIF orientation so phone photos aren't sideways once
        # metadata is stripped, then flatten to RGB.
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        scale = min(1.0, MAX_EDGE / max(w, h))
        if scale < 1.0:
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        im.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        after = os.path.getsize(path)
        total_before += before
        total_after += after
        print(f"{name:18} {before/1e6:5.2f} -> {after/1e6:5.2f} MB")
    saved = total_before - total_after
    print(f"\ntotal: {total_before/1e6:.1f} -> {total_after/1e6:.1f} MB "
          f"({saved/1e6:.1f} MB saved, {saved/total_before*100:.0f}%)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
