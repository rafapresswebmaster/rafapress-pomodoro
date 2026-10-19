"""Build a source/evidence review ZIP from explicit project paths; never read saves."""
from pathlib import Path
import zipfile, json, hashlib
ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'context/RPG_Manager_ChatGPT_Review_Packet_20261017.zip'
patterns = [
 'context/Teamfight_Manager_Post_Sprint_Handoff.md', 'context/README.md',
 'docs/Handoff_*_20261017.*', 'docs/Altar_Rituals.md', 'docs/Fantasy_Expansion.md',
 'docs/Polish_*_20261017*.json', 'docs/Polish_25_Implementation_20261017.md',
 'tests/polish25-browser.json', 'tests/polish25_smoke.py', 'tests/visuals/polish25-*.webp',
 'scripts/polish_class_audit.js', 'img/pictures/Quest*_v8.webp',
 'docs/Architecture.md', 'docs/Camp_Rendering_Performance.md',
 'docs/Individual_Skeletons_96_Contact.webp', 'docs/Playtest_20_Art_Contact.webp',
 'js/plugins/RPGManager*.js', 'js/plugins.js', 'js/main.js', 'js/rmmz_*.js',
 'js/focus*', 'package.json', 'index.html', 'css/*.css', 'data/*.json',
 'tests/*.test.js', 'tests/fixtures/**/*', 'tests/altar-rituals-browser.json',
 'tests/*altar*.py', 'tests/*fantasy*.py',
 'tests/visuals/altar-816-quickening.webp', 'tests/visuals/altar-816-barred.webp',
 'tests/visuals/gear-switch.webp', 'tests/visuals/pirate-boss.webp',
 'scripts/handoff_*', 'scripts/build_current_handoff.js',
 'scripts/package_handoff_review.py', 'scripts/art_silhouettes*',
]
paths = sorted({p for pattern in patterns for p in ROOT.glob(pattern) if p.is_file()})
for p in paths:
    parts = {part.lower() for part in p.relative_to(ROOT).parts}
    assert not parts.intersection({'save','saves','backup','backups','.git','.aws','.codex'})
manifest = json.loads((ROOT/'docs/Handoff_Manifest_20261017.json').read_text(encoding='utf-8'))
for item in manifest['sourceManifest']:
    assert hashlib.sha256((ROOT/item['path']).read_bytes()).hexdigest() == item['sha256'], item['path']
readme = """# RPG Manager: ChatGPT systems, mechanics and balance review

Start with context/Teamfight_Manager_Post_Sprint_Handoff.md. Section 23 contains the user's sprint-proposal prompt. This packet describes October 17, 2026, schema 28.

The handoff includes the complete current mechanics and content catalogues. docs/Handoff_Runtime_Snapshot_20261017.json contains exact custom data, full dialogue/narratives, asset inventory and exported configuration. Fresh balance/test audit methods, raw results and limitations are included.

Source and all database JSON are included for verification. Selected images provide visual context; bulk engine libraries/art/audio are not a runnable game distribution. No personal saves, credentials or backups are included. Historical architecture material is explicitly marked; it does not override current mechanics.

Please propose a coherent upgrade sprint focused on polishing existing systems, mechanics and balance. Distinguish confirmed defects, clarity problems, balance hypotheses and unresolved product decisions. Respect the constraints in the handoff and give measurable acceptance criteria.
"""
with zipfile.ZipFile(OUTPUT, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=8) as z:
    z.writestr('REVIEW_PACKET_README.md', readme)
    for p in paths: z.write(p, p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(OUTPUT) as z:
    assert z.testzip() is None
print(json.dumps({'packet':str(OUTPUT.relative_to(ROOT)), 'files':len(paths)+1, 'bytes':OUTPUT.stat().st_size}, indent=2))
