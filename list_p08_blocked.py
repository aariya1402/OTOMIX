import json

data = json.load(open('Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json', encoding='utf-8'))
p08 = [t for t in data if t['id'].startswith('P08-')]
for t in p08:
    if t['status'] == 'BLOCKED':
        print(f"{t['id']}: {t['status']} - {t['description'][:80]}...")