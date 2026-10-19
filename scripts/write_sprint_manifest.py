from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1];baseline=root/'backups/next-sprint-source';paths=set()
for old in (baseline/'plugins').glob('*.js'):
 new=root/'js/plugins'/old.name
 if new.read_bytes()!=old.read_bytes():paths.add(new)
for old in (baseline/'data').glob('*'):
 new=root/'data'/old.name
 if new.is_file() and new.read_bytes()!=old.read_bytes():paths.add(new)
for pattern in ['img/faces/*_v4.webp','img/characters/*_v4.webp','img/sv_actors/*_v4.webp','img/sprint-source/*.webp','docs/Next_Sprint*','data/RPGManagerArtV4.json','tests/strict_focus*','tests/strict-focus*','tests/visuals/strict-*','scripts/*strict_focus*','scripts/*sprint_art.py','scripts/run_sprint_regressions.py','scripts/write_sprint_handoff.py']:
 paths.update(p for p in root.glob(pattern) if p.is_file())
paths.update(root/p for p in ['context/README.md','context/Teamfight_Manager_Post_Sprint_Handoff.md','docs/Strict_Focus_Progression_Sprint.md'])
for row in json.loads((root/'tests/strict-focus-regressions.json').read_text()):
 p=root/row['file']
 if p.stat().st_mtime>baseline.stat().st_ctime:paths.add(p)
provenance=root/'docs/Next_Sprint_Art_Provenance.json';data=json.loads(provenance.read_text())
data['sourceHashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root/'img/sprint-source').glob('*.webp'))}
provenance.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');paths.add(provenance)
rows=[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths)]
(root/'docs/Strict_Focus_Changed_Files.json').write_text(json.dumps({'baseline':'backups/next-sprint-source','files':rows},indent=2)+'\n',encoding='utf-8')
print(f'Manifest written: {len(rows)} implementation, art, test, report and evidence files; source hashes recorded.')
