import json

data = json.load(open('Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json', encoding='utf-8'))

# Overall stats
total = len(data)
done = sum(1 for t in data if t.get('status') == 'DONE')
todo = sum(1 for t in data if t.get('status') == 'TODO')
blocked = sum(1 for t in data if t.get('status', '').startswith('BLOCKED'))
superseded = sum(1 for t in data if t.get('status', '').startswith('SUPERSEDED'))
cancelled = sum(1 for t in data if t.get('status', '').startswith('CANCELLED'))

print(f'=== OVERALL ===')
print(f'Total: {total}')
print(f'DONE: {done}')
print(f'TODO: {todo}')
print(f'BLOCKED: {blocked}')
print(f'SUPERSEDED: {superseded}')
print(f'CANCELLED: {cancelled}')

# GATE0/X- tasks
gate0 = [t for t in data if t['id'].startswith('GATE0-') or t['id'].startswith('X-')]
gate0_done = sum(1 for t in gate0 if t.get('status') == 'DONE')
gate0_todo = sum(1 for t in gate0 if t.get('status') == 'TODO')
gate0_blocked = sum(1 for t in gate0 if t.get('status', '').startswith('BLOCKED'))
print(f'\n=== GATE0/X- ===')
print(f'Total: {len(gate0)}')
print(f'DONE: {gate0_done}')
print(f'TODO: {gate0_todo}')
print(f'BLOCKED: {gate0_blocked}')

# P05 tasks
p05 = [t for t in data if t['id'].startswith('P05-')]
p05_done = sum(1 for t in p05 if t.get('status') == 'DONE')
p05_todo = sum(1 for t in p05 if t.get('status') == 'TODO')
p05_blocked = sum(1 for t in p05 if t.get('status', '').startswith('BLOCKED'))
print(f'\n=== P05 ===')
print(f'Total: {len(p05)}')
print(f'DONE: {p05_done}')
print(f'TODO: {p05_todo}')
print(f'BLOCKED: {p05_blocked}')

# P07 tasks
p07 = [t for t in data if t['id'].startswith('P07-')]
p07_done = sum(1 for t in p07 if t.get('status') == 'DONE')
p07_todo = sum(1 for t in p07 if t.get('status') == 'TODO')
p07_blocked = sum(1 for t in p07 if t.get('status', '').startswith('BLOCKED'))
print(f'\n=== P07 ===')
print(f'Total: {len(p07)}')
print(f'DONE: {p07_done}')
print(f'TODO: {p07_todo}')
print(f'BLOCKED: {p07_blocked}')

# P08 tasks
p08 = [t for t in data if t['id'].startswith('P08-')]
p08_done = sum(1 for t in p08 if t.get('status') == 'DONE')
p08_todo = sum(1 for t in p08 if t.get('status') == 'TODO')
p08_blocked = sum(1 for t in p08 if t.get('status', '').startswith('BLOCKED'))
print(f'\n=== P08 ===')
print(f'Total: {len(p08)}')
print(f'DONE: {p08_done}')
print(f'TODO: {p08_todo}')
print(f'BLOCKED: {p08_blocked}')

# Critical tasks (GATE0)
critical = [t for t in data if t['id'].startswith('GATE0-')]
crit_done = sum(1 for t in critical if t.get('status') == 'DONE')
crit_todo = sum(1 for t in critical if t.get('status') == 'TODO')
crit_blocked = sum(1 for t in critical if t.get('status', '').startswith('BLOCKED'))
print(f'\n=== CRITICAL (GATE0) ===')
print(f'Total: {len(critical)}')
print(f'DONE: {crit_done}')
print(f'TODO: {crit_todo}')
print(f'BLOCKED: {crit_blocked}')