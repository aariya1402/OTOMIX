import json

data = json.load(open('Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json', encoding='utf-8'))
gate0 = [t for t in data if t['id'].startswith('GATE0-') or t['id'].startswith('X-')]
for t in gate0:
    if t['status'] in ['TODO', 'BLOCKED']:
        print(f"{t['id']}: {t['status']} - {t['description'][:80]}...")