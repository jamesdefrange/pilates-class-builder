#!/usr/bin/env python3
"""Make a labeled contact sheet of finished images so they can be checked by eye.
Usage: python3 scripts/images/sheet.py <out.png> <id> [<id> ...]"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
out = sys.argv[1]
ids = sys.argv[2:]
data = {s['id']: s for s in json.loads((root / 'images' / 'status.json').read_text())['images']}
cell, label, cols = 300, 34, 3
rows = (len(ids) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell, rows * (cell + label)), 'white')
d = ImageDraw.Draw(sheet)
for i, ex_id in enumerate(ids):
    x, y = (i % cols) * cell, (i // cols) * (cell + label)
    p = root / 'images' / data[ex_id]['file']
    if p.exists():
        sheet.paste(Image.open(p).convert('RGB').resize((cell - 6, cell - 6)), (x + 3, y + 3))
    d.text((x + 6, y + cell + 4), f"{i + 1}. {data[ex_id]['name'][:44]}", fill='black')
sheet.save(out)
print('sheet', out, len(ids), 'images')
