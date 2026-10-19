"""Validate/sync the Markdown authoring catalogue and its two runtime JSON files."""
import argparse
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument('--check', action='store_true')
mode.add_argument('--write', action='store_true')
parser.add_argument('--catalogue', type=Path, default=ROOT/'context/Adventurer_Classes_and_Dialogue.md')
parser.add_argument('--output', type=Path, default=ROOT/'data')
args = parser.parse_args()
source = args.catalogue.read_text(encoding='utf-8-sig')
names = ['RPGManagerClasses.json', 'RPGManagerDialogue.json']

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'Duplicate JSON key: {key}')
        result[key] = value
    return result

values = []
for name in names:
    blocks = re.findall(r'<!-- runtime: '+re.escape(name)+r' -->\s*```json\s*([\s\S]*?)\s*```', source)
    if len(blocks) != 1:
        raise SystemExit(f'Expected exactly one runtime block: {name}')
    values.append(json.loads(blocks[0], object_pairs_hook=unique_object))

# Evaluate only the trusted validator, without loading possibly broken runtime
# data. Author text enters through JSON.parse; it never becomes executable code.
validation = subprocess.run(['node', '-e', '''
const fs=require('fs'),vm=require('vm');
const box={module:{exports:{}},window:{}};
vm.runInNewContext(fs.readFileSync('js/plugins/RPGManagerProgression.js','utf8'),box);
box.module.exports.validateContent(...JSON.parse(fs.readFileSync(0,'utf8')));
'''], cwd=ROOT, input=json.dumps(values), text=True, capture_output=True)
if validation.returncode:
    raise SystemExit(validation.stderr)

rows = ['## Generated class reference', '', '| ID / class | Purpose | HP | ATK | DEF | SPD |', '|---|---|---:|---:|---:|---:|']
for c in values[0]['classes']:
    s={k:f'{r[0]}?{r[1]}' for k,r in c['ranges'].items()}
    rows.append(f"| {c['id']} / {c['name']} | {c['purpose']} | {s['maxHealth']} | {s['attack']} | {s['defense']} | {s['speed']} |")
rows += ['', '| Class | Move ID / name | Effect | Power | Basic turns to recharge |', '|---|---|---|---:|---:|']
for c in values[0]['classes']:
    for m in c['moves']:
        rows.append(f"| {c['name']} | {m['id']} / {m['name']} | {m['description']} | {m['multiplier']} | {m['cooldown']} |")
updated, count = re.subn(r'<!-- summary:start -->[\s\S]*?<!-- summary:end -->', lambda _: '<!-- summary:start -->\n'+'\n'.join(rows)+'\n<!-- summary:end -->', source)
if count != 1:
    raise SystemExit('Expected exactly one generated-summary marker pair.')
if args.check:
    for name, value in zip(names, values):
        if json.loads((args.output/name).read_text(encoding='utf-8-sig'), object_pairs_hook=unique_object) != value:
            raise SystemExit(f'Catalogue/runtime mismatch: {name}. Review before using --write.')
    if updated != source:
        raise SystemExit('Generated tables are stale; run --write.')
    print(f'PASS: {len(values[0]["classes"])} classes, {sum(len(c["moves"]) for c in values[0]["classes"])} moves, dialogue and catalogue/runtime agreement.')
else:
    args.output.mkdir(parents=True, exist_ok=True)
    for name, value in zip(names, values):
        destination=args.output/name
        staged=destination.with_suffix('.json.tmp')
        staged.write_text(json.dumps(value, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
        staged.replace(destination)
    args.catalogue.write_text(updated, encoding='utf-8')
    print('Validated and wrote both runtime files; refreshed catalogue tables.')
