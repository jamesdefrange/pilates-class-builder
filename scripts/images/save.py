#!/usr/bin/env python3
"""Download one generated image, crop to square, convert to grayscale, compress for web,
save into /images and mark it in images/status.json.
Usage: python3 scripts/images/save.py <exercise-id> <image-url> [done|review] [note]"""
import io, json, sys, urllib.request
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
ex_id, url = sys.argv[1], sys.argv[2]
state = sys.argv[3] if len(sys.argv) > 3 else 'done'
note = sys.argv[4] if len(sys.argv) > 4 else ''
status_path = root / 'images' / 'status.json'
data = json.loads(status_path.read_text())
entry = next(s for s in data['images'] if s['id'] == ex_id)

req = urllib.request.Request(url, headers={'User-Agent': 'pilates-class-builder/1.0'})
raw = urllib.request.urlopen(req, timeout=60).read()
img = Image.open(io.BytesIO(raw)).convert('L')
w, h = img.size
s = min(w, h)
img = img.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((480, 480), Image.LANCZOS)
out = root / 'images' / entry['file']
img.save(out, 'JPEG', quality=78, optimize=True, progressive=True)
entry['status'] = state
entry['tries'] = entry.get('tries', 0) + 1
if note:
    entry['note'] = note
status_path.write_text(json.dumps(data, indent=2) + '\n')
print(f"saved {out.name} {out.stat().st_size // 1024} KB status={state}")
