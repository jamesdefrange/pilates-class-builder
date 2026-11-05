#!/usr/bin/env python3
"""Override the prompt for one image in images/status.json (for a retry with new wording,
or to fix a direction problem before the first try). Run prompts.js afterwards so
images/PROMPTS.md picks it up.
Usage: python3 scripts/images/setprompt.py <exercise-id> "<full new prompt>" """
import json, sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
status_path = root / 'images' / 'status.json'
data = json.loads(status_path.read_text())
entry = next(x for x in data['images'] if x['id'] == sys.argv[1])
entry['customPrompt'] = sys.argv[2]
entry['prompt'] = sys.argv[2]
status_path.write_text(json.dumps(data, indent=2) + '\n')
print('set', sys.argv[1])
