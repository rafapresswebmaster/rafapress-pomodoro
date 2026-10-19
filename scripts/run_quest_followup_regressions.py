from pathlib import Path
import subprocess,json,re
root=Path(__file__).resolve().parents[1]
doc=(root/'docs/Identity_Quest_Performance_Sprint.md').read_text(encoding='utf-8')
files=re.search(r'node --test --test-isolation=none (.+)',doc)[1].split()+['tests/oct16.test.js','tests/review.test.js','tests/strict_focus_sprint.test.js','tests/playtest20.test.js','tests/quest_followup.test.js']
results=[];output=[]
for file in files:
    try:
        r=subprocess.run(['node','--test','--test-isolation=none',file],cwd=root,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=25)
        output.append(f'FILE {file}\n{r.stdout}\n{r.stderr}');results.append({'file':file,'exit':r.returncode,'pass':re.findall(r'pass (\d+)',r.stdout)[-1:] or [0],'fail':re.findall(r'fail (\d+)',r.stdout)[-1:] or [0]})
    except subprocess.TimeoutExpired as e:results.append({'file':file,'timeout':True});output.append(f'TIMEOUT {file}')
    print(file,results[-1],flush=True)
(root/'tests/quest-followup-regressions.txt').write_text('\n'.join(output),encoding='utf-8')
(root/'tests/quest-followup-regressions.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
