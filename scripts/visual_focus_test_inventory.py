"""Survey current and historical Node suites in fresh processes; never edit saves."""
from pathlib import Path
import subprocess,json,re,time
ROOT=Path(__file__).resolve().parents[1];rows=[];logs=[];started=time.monotonic()
for file in sorted((ROOT/'tests').glob('*.test.js')):
 relative=file.relative_to(ROOT).as_posix()
 try:
  result=subprocess.run(['node','--test','--test-isolation=none',relative],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=40)
  output=result.stdout+'\n'+result.stderr
  def count(label):
   matches=re.findall(r'(?:ℹ\s*|#\s*)'+label+r'\s+(\d+)',output);return int(matches[-1]) if matches else None
  failures=[line.strip() for line in output.splitlines() if line.startswith('✖ ') or line.startswith('not ok ')]
  row=dict(file=relative,exit=result.returncode,passed=count('pass'),failed=count('fail'),skipped=count('skipped'),failingTitles=list(dict.fromkeys(failures)))
  logs.append('FILE '+relative+'\n'+output)
 except subprocess.TimeoutExpired as error:
  row=dict(file=relative,timeoutSeconds=40);logs.append('TIMEOUT '+relative)
 rows.append(row);print(json.dumps(row,ensure_ascii=True),flush=True)
summary=dict(date='2026-10-17',method='Each tests/*.test.js file runs in a fresh Node process using --test-isolation=none. Includes historical suites with superseded expectations. This is a test-debt inventory, not a claim that all legacy specifications should be restored.',seconds=round(time.monotonic()-started,2),files=len(rows),passingFiles=sum(r.get('exit')==0 for r in rows),failingFiles=sum(r.get('exit',0)!=0 for r in rows),timeouts=sum('timeoutSeconds' in r for r in rows),passedTests=sum(r.get('passed') or 0 for r in rows),failedTests=sum(r.get('failed') or 0 for r in rows),rows=rows)
(ROOT/'docs/visual-focus-sprint/test-inventory.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
(ROOT/'docs/visual-focus-sprint/test-inventory.txt').write_text('\n\n'.join(logs),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k!='rows'}))
