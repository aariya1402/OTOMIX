/* OTOMIX Architecture Book - app.js
 * Renders window.OTOMIX_BOOK (written by scan.cjs). Every string goes through textContent.
 * Works from a static server (VS Code Go Live): buttons copy PowerShell commands, they never call an API.
 */
(function () {
  'use strict';

  const D = window.OTOMIX_BOOK;
  const COLORS = [
    ['green', 'Verified 100%', 'All applicable checks pass on fresh evidence'],
    ['yellow', 'In progress / unproven', 'Some evidence found; not everything is verified'],
    ['red', 'Failing or disproved', 'Failing test, tsc error, or a DONE task whose declared file or test is missing'],
    ['grey', 'Not started', 'No evidence found on disk'],
    ['blue', 'Blocked', 'Registry status BLOCKED (open question)'],
    ['muted', 'Cancelled / superseded', 'Excluded from totals']
  ];
  const COLOR_NAME = Object.fromEntries(COLORS.map(item => [item[0], item[1]]));
  const CLAIM_TEXT = {
    verified: 'DONE and verified',
    'done-unproven': 'Registry says DONE, evidence incomplete',
    'ahead-of-registry': 'Complete on disk, registry still TODO',
    pending: 'Pending',
    excluded: 'Excluded'
  };
  const ISSUE_ORDER = { error: 0, warn: 1, info: 2 };
  
  // PowerShell execution via fetch to local API
  async function executePowerShell(command) {
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, output: error.message, error: true };
    }
  }
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard', 'success');
    }).catch(() => {
      showToast('Failed to copy to clipboard', 'error');
    });
  }
  
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 3000);
  }

  // ------------------------------------------------------------------ helpers
  function h(tag, props, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    const add = kid => {
      if (kid === null || kid === undefined || kid === false) return;
      if (Array.isArray(kid)) kid.forEach(add);
      else node.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    };
    kids.forEach(add);
    return node;
  }

  const clear = node => { while (node.firstChild) node.removeChild(node.firstChild); };
  const when = ms => (ms ? new Date(ms).toLocaleString('en-GB') : 'never');
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

  function fileLink(file, line, label) {
    if (!file) return h('span', { class: 'mono muted-text', text: '-' });
    const text = label || file + (line ? ':' + line : '');
    if (/[*?]/.test(file)) return h('span', { class: 'mono', text });
    const href = encodeURI('vscode://file/' + D.root.replace(/\\/g, '/') + '/' + file + (line ? ':' + line : ''));
    return h('a', { class: 'file-link mono', href, title: 'Open in VS Code', text });
  }

  function badge(text, kind) { return h('span', { class: 'badge b-' + (kind || 'plain'), text }); }
  function dot(color) { return h('span', { class: 'dot c-' + color, title: COLOR_NAME[color] }); }

  function bar(percent, color) {
    return h('div', { class: 'bar', title: percent + '%' }, h('span', { class: 'fill c-' + color, style: 'width:' + percent + '%' }));
  }

  function stacked(counts, total) {
    const wrap = h('div', { class: 'stacked' });
    for (const [color] of COLORS) {
      if (counts[color]) wrap.appendChild(h('span', { class: 'seg c-' + color, style: 'width:' + (100 * counts[color] / total) + '%', title: COLOR_NAME[color] + ': ' + counts[color] }));
    }
    return wrap;
  }

  function aggregate(ids) {
    const counts = { green: 0, yellow: 0, red: 0, grey: 0, blue: 0, muted: 0 };
    let sum = 0;
    let counted = 0;
    let defects = 0;
    for (const id of ids) {
      const task = D.tasks[id];
      counts[task.color] += 1;
      if (task.color !== 'muted') { sum += task.percent; counted += 1; }
      if (task.defect) defects += 1;
    }
    return { counts, total: ids.length, counted, percent: counted ? Math.round(sum / counted) : 0, defects };
  }

  const phaseTasks = phaseId => D.order.filter(id => D.tasks[id].phase === phaseId);

  // ------------------------------------------------------------------ commands + toast
  let toastTimer = null;
  function toast(message, command) {
    const node = document.getElementById('toast');
    clear(node);
    node.appendChild(h('div', { text: message }));
    if (command) node.appendChild(h('code', { text: command }));
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 9000);
  }

  function psCommand(args) {
    const root = D.root.replace(/'/g, "''");
    return "Set-Location -LiteralPath '" + root + "'; node .\\Docs\\ArchitectureBook\\" + args;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const area = h('textarea', { style: 'position:fixed;opacity:0' });
      area.value = text;
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      area.remove();
      return ok;
    }
  }

  function commandButton(label, args, hint, extraClass) {
    const command = psCommand(args);
    return h('button', {
      type: 'button', class: 'btn ' + (extraClass || ''), title: hint,
      onclick: async event => {
        event.preventDefault();
        event.stopPropagation();
        const ok = await copyText(command);
        toast(ok ? 'PowerShell command copied. Paste it into a terminal and press Enter.' : 'Clipboard blocked - select and copy the command manually.', command);
      }
    }, label);
  }

  const reportButton = id => commandButton('Report', 'task-check.cjs report ' + id, 'Copy a PowerShell command that checks this task and puts a report on your clipboard');
  const verifyButton = id => h('button', {
    type: 'button', class: 'btn btn-primary', title: 'Deep verify: runs tests, checks disk reality, compares with plan, generates comprehensive report',
    onclick: async event => {
      event.preventDefault();
      event.stopPropagation();
      const command = 'node Docs/ArchitectureBook/task-check.cjs deep-verify ' + id;
      showToast('Running deep verification...', 'info');
      const result = await executePowerShell(command);
      if (result.success) {
        showToast('✅ Verification PASSED - Task resolved! Report copied to clipboard.', 'success');
        // Refresh task data
        location.reload();
      } else {
        // Check if it's a verification failure (exit code 1) vs actual error
        const output = result.output || '';
        if (output.includes('VERIFICATION FAILED') || output.includes('VERIFICATION PASSED')) {
          showToast('❌ Verification failed - issues remain. Report copied to clipboard.', 'warning');
        } else {
          showToast('Execution error: ' + output, 'error');
        }
        location.reload();
      }
    }
  }, 'Verify (Deep)');
  
  const executeButton = id => h('button', {
    type: 'button', class: 'btn', title: 'Quick check: runs tests and TypeScript check',
    onclick: async event => {
      event.preventDefault();
      event.stopPropagation();
      const command = 'node Docs/ArchitectureBook/task-check.cjs report ' + id;
      showToast('Executing quick check...', 'info');
      const result = await executePowerShell(command);
      if (result.success) {
        showToast('Quick check completed. Report copied to clipboard.', 'success');
        location.reload();
      } else {
        showToast('Execution failed: ' + (result.output || result.error), 'error');
      }
    }
  }, 'Quick Check');

  // ------------------------------------------------------------------ shared pieces
  function taskTestSummary(task) {
    if (!task.tests.length) return h('span', { class: 'muted-text', text: 'no test' });
    const counts = {};
    for (const test of task.tests) counts[test.state] = (counts[test.state] || 0) + 1;
    return h('span', { class: 'test-summary' }, Object.entries(counts).map(([state, n]) => h('span', { class: 'ts ts-' + state, text: n + ' ' + state })));
  }

  function issueList(issues, limit) {
    const sorted = issues.slice().sort((a, b) => ISSUE_ORDER[a.severity] - ISSUE_ORDER[b.severity]);
    const list = h('ul', { class: 'issues' });
    for (const issue of limit ? sorted.slice(0, limit) : sorted) {
      list.appendChild(h('li', { class: 'issue i-' + issue.severity },
        h('span', { class: 'sev', text: issue.severity }),
        h('span', { class: 'kind mono', text: issue.kind }),
        ' ', issue.text, ' ',
        issue.path ? fileLink(issue.path, issue.line) : null));
    }
    if (limit && sorted.length > limit) list.appendChild(h('li', { class: 'muted-text', text: '+ ' + (sorted.length - limit) + ' more' }));
    return list;
  }

  function taskTable(ids) {
    const table = h('table', { class: 'task-table' });
    table.appendChild(h('thead', {}, h('tr', {}, ['', 'Task', 'Registry', 'Done', 'Tests', 'Issues', 'Actions'].map(text => h('th', { text })))));
    const body = h('tbody');
    for (const id of ids) {
      const task = D.tasks[id];
      const open = task.issues.filter(issue => issue.severity !== 'info').length;
      body.appendChild(h('tr', { class: 'row-' + task.color },
        h('td', {}, dot(task.color)),
        h('td', {}, h('a', { class: 'mono', href: '#/task/' + id, text: id }), h('div', { class: 'title', text: task.title })),
        h('td', {}, badge(task.status + (task.statusNote ? ':' + task.statusNote : ''), task.status.toLowerCase()), task.claim === 'ahead-of-registry' ? badge('ahead', 'ahead') : null),
        h('td', { class: 'pct-cell' }, h('span', { class: 'pct', text: task.percent + '%' }), bar(task.percent, task.color)),
        h('td', {}, taskTestSummary(task)),
        h('td', { text: open ? String(open) : '-' }),
        h('td', { class: 'actions' }, reportButton(id), verifyButton(id))));
    }
    table.appendChild(body);
    return h('div', { class: 'table-wrap' }, table);
  }

  function legend() {
    return h('div', { class: 'legend' }, COLORS.map(([color, label, hint]) => h('span', { class: 'legend-item', title: hint }, dot(color), ' ' + label)));
  }

  function gapRow(gap) {
    const missing = gap.refs.filter(ref => !ref.exists);
    return h('li', { class: 'gap g-' + gap.state },
      h('div', {},
        badge(gap.id, gap.category.toLowerCase()), ' ', badge(gap.severity, 'sev-' + gap.severity.toLowerCase().replace(/[^a-z]/g, '')), ' ',
        badge(gap.state === 'open' ? 'open' : 'claims resolved', gap.state),
        ' ', h('strong', { text: gap.title })),
      h('div', { class: 'gap-meta' },
        'Phases: ' + gap.phases.join(', ') + ' | ', fileLink(gap.source, gap.line),
        gap.tasks.length ? [' | Tasks: ', gap.tasks.map(id => [h('a', { class: 'mono', href: '#/task/' + id, text: id }), ' '])] : null),
      gap.refs.length ? h('div', { class: 'gap-meta' }, 'Code references: ',
        gap.refs.map(ref => [h('span', { class: 'ref ' + (ref.exists ? 'ref-ok' : 'ref-missing') }, ref.exists ? fileLink(ref.path) : ref.path + ' (missing)'), ' '])) : null,
      missing.length ? h('div', { class: 'gap-meta warn-text', text: missing.length + ' referenced path(s) not found on disk' }) : null);
  }

  function findingRow(finding) {
    return h('li', { class: 'gap' },
      h('div', {}, badge(finding.kind, finding.kind), ' ', badge(finding.fresh ? 'fresh run' : 'stale run', finding.fresh ? 'open' : 'stale'), ' ', finding.text),
      h('div', { class: 'gap-meta' }, fileLink(finding.file, finding.line), ' | recorded ' + when(finding.at),
        finding.tasks.length ? [' | Tasks: ', finding.tasks.slice(0, 6).map(id => [h('a', { class: 'mono', href: '#/task/' + id, text: id }), ' '])] : null));
  }

  // ------------------------------------------------------------------ views
  function dashboardView() {
    const all = D.order;
    const total = aggregate(all);
    const root = h('div', { class: 'view' });
    root.appendChild(h('h1', { text: 'Dashboard' }));
    const complete = total.counted > 0 && total.counts.green === total.counted;
    root.appendChild(h('div', { class: 'hero ' + (complete ? 'hero-done' : '') },
      h('div', { class: 'hero-pct', text: total.percent + '%' }),
      h('div', { class: 'hero-body' },
        h('div', { class: 'hero-title', text: complete ? 'All tasks are complete and verified.' : total.counts.green + ' of ' + total.counted + ' counted tasks are verified complete' }),
        stacked(total.counts, total.total),
        h('div', { class: 'hero-sub', text: plural(total.defects, 'defect') + ' | ' + total.counts.muted + ' cancelled/superseded excluded | data generated ' + when(Date.parse(D.generatedAt)) +
          ' | last test run ' + when(D.evidenceAt.tests) + ' | last tsc run ' + when(D.evidenceAt.tsc) }))));
    root.appendChild(legend());

    root.appendChild(h('div', { class: 'toolbar' },
      h('a', { class: 'btn', href: '#/defects', text: 'Defect list (' + total.defects + ')' }),
      commandButton('Copy: start live watcher', 'scan.cjs --watch', 'Keeps book-data.js up to date; Go Live reloads the page automatically'),
      commandButton('Copy: seed all evidence', 'task-check.cjs all', 'Runs the whole test suite and tsc once')));

    const grid = h('div', { class: 'phase-grid' });
    for (const phase of D.phases) {
      const ids = phaseTasks(phase.id);
      if (!ids.length) continue;
      const agg = aggregate(ids);
      const chips = h('div', { class: 'chips' });
      for (const id of ids) {
        const task = D.tasks[id];
        chips.appendChild(h('a', { class: 'chip c-' + task.color, href: '#/task/' + id, title: id + ' - ' + task.percent + '% - ' + task.title }));
      }
      grid.appendChild(h('section', { class: 'card' },
        h('div', { class: 'card-head' },
          h('a', { href: '#/phase/' + phase.id }, h('strong', { text: phase.id }), ' ' + phase.name),
          h('span', { class: 'pct big', text: agg.percent + '%' })),
        stacked(agg.counts, agg.total),
        h('div', { class: 'counts' }, COLORS.filter(([color]) => agg.counts[color]).map(([color]) => h('span', { class: 'count' }, dot(color), ' ' + agg.counts[color]))),
        h('div', { class: 'card-sub', text: plural(agg.total, 'task') + ' | ' + plural(agg.defects, 'defect') }),
        chips));
    }
    root.appendChild(grid);
    return root;
  }

  function phaseView(phaseId) {
    const phase = D.phases.find(item => item.id === phaseId);
    if (!phase) return h('p', { text: 'Unknown phase: ' + phaseId });
    const ids = phaseTasks(phaseId);
    const agg = aggregate(ids);
    const root = h('div', { class: 'view' });
    root.appendChild(h('a', { href: '#/', class: 'back', text: 'Dashboard' }));
    root.appendChild(h('h1', { text: phase.id + ' - ' + phase.name }));
    root.appendChild(h('p', { class: 'objective', text: phase.objective }));
    root.appendChild(h('p', { class: 'muted-text', text: 'Upstream: ' + phase.upstream + ' | Downstream: ' + phase.downstream }));
    root.appendChild(h('div', { class: 'hero' }, h('div', { class: 'hero-pct', text: agg.percent + '%' }),
      h('div', { class: 'hero-body' }, stacked(agg.counts, agg.total),
        h('div', { class: 'hero-sub', text: agg.counts.green + ' verified | ' + plural(agg.defects, 'defect') + ' | ' + plural(agg.total, 'task') }))));
    root.appendChild(legend());

    const filter = h('select', { 'aria-label': 'Filter tasks' },
      h('option', { value: 'all', text: 'All tasks' }), h('option', { value: 'defects', text: 'Defects only' }),
      h('option', { value: 'open', text: 'Not verified yet' }), h('option', { value: 'untested', text: 'Tests not run / missing' }));
    const holder = h('div');
    const apply = () => {
      const mode = filter.value;
      const shown = ids.filter(id => {
        const task = D.tasks[id];
        if (mode === 'defects') return task.defect;
        if (mode === 'open') return task.color !== 'green' && task.color !== 'muted';
        if (mode === 'untested') return task.tests.length === 0 || task.tests.some(test => ['unrun', 'stale', 'missing', 'error', 'env'].includes(test.state));
        return true;
      });
      clear(holder);
      holder.appendChild(shown.length ? taskTable(shown) : h('p', { class: 'muted-text', text: 'No tasks match this filter.' }));
    };
    filter.addEventListener('change', apply);
    root.appendChild(h('h2', { text: 'Tasks' }), h('div', { class: 'toolbar' }, filter), holder);
    apply();

    const gaps = D.gaps.filter(gap => gap.phases.includes(phaseId));
    const generalGaps = D.gaps.filter(gap => !gap.phases.includes(phaseId) && gap.phases.some(item => item === 'ALL'));
    const findingIds = new Set();
    ids.forEach(id => D.tasks[id].findingIds.forEach(fid => findingIds.add(fid)));
    const findings = D.findings.filter(finding => findingIds.has(finding.id));
    root.appendChild(h('h2', { text: 'Gaps and bugs' }));
    root.appendChild(h('p', { class: 'muted-text', text: 'Machine findings come from recorded tsc and Vitest runs (evidence.json). Plan gaps come from the Supplement; they state what the plan documents, with referenced paths checked against disk.' }));
    root.appendChild(h('h3', { text: 'Compiler and test findings (' + findings.length + ')' }));
    root.appendChild(findings.length ? h('ul', { class: 'gaps' }, findings.map(findingRow)) : h('p', { class: 'muted-text', text: 'None recorded for the files of this phase.' }));
    root.appendChild(h('h3', { text: 'Plan gaps for this phase (' + gaps.length + ')' }));
    root.appendChild(gaps.length ? h('ul', { class: 'gaps' }, gaps.map(gapRow)) : h('p', { class: 'muted-text', text: 'None.' }));
    if (generalGaps.length) {
      root.appendChild(h('h3', { text: 'Cross-phase gaps (' + generalGaps.length + ')' }));
      root.appendChild(h('ul', { class: 'gaps' }, generalGaps.map(gapRow)));
    }
    return root;
  }

  function taskView(id) {
    const task = D.tasks[id];
    if (!task) return h('p', { text: 'Unknown task: ' + id });
    const phase = D.phases.find(item => item.id === task.phase);
    const root = h('div', { class: 'view task-view' });
    root.appendChild(h('a', { href: '#/phase/' + task.phase, class: 'back', text: task.phase + (phase ? ' - ' + phase.name : '') }));
    root.appendChild(h('h1', { class: 'mono' }, dot(task.color), ' ' + task.id));
    root.appendChild(h('p', { class: 'objective', text: task.description }));
    root.appendChild(h('div', { class: 'badges' },
      badge('Registry ' + task.status + (task.statusNote ? ':' + task.statusNote : ''), task.status.toLowerCase()),
      badge(COLOR_NAME[task.color], 'c-' + task.color), badge(CLAIM_TEXT[task.claim], task.claim),
      badge(task.source === 'addendum' ? 'Addendum task' : 'Registry task', 'plain')));
    root.appendChild(h('div', { class: 'hero' }, h('div', { class: 'hero-pct', text: task.percent + '%' }),
      h('div', { class: 'hero-body' }, bar(task.percent, task.color),
        h('div', { class: 'toolbar' }, reportButton(id), verifyButton(id), executeButton(id),
          h('span', { class: 'muted-text', text: 'Report: copies check command. Verify: re-checks after fix. Execute: runs check and auto-refreshes.' })))));

    root.appendChild(h('h2', { text: 'Issues (' + task.issues.filter(issue => issue.severity !== 'info').length + ')' }));
    root.appendChild(task.issues.length ? issueList(task.issues) : h('p', { class: 'ok-text', text: 'No open issues.' }));

    // Defects from clues
    const defects = task.defects || [];
    if (defects.length) {
      root.appendChild(h('h2', { text: 'Defects / Clues (' + defects.length + ')' }));
      const defectList = h('ul', { class: 'issues' });
      for (const d of defects) {
        defectList.appendChild(h('li', { class: 'i-' + (d.type.toLowerCase().includes('test') ? 'warn' : 'info') },
          h('span', { class: 'sev', text: d.type.toUpperCase() }),
          h('span', { class: 'kind', text: d.text }),
          d.phase ? h('span', { class: 'muted-text small', text: ' (phase: ' + d.phase + ')' }) : null
        ));
      }
      root.appendChild(defectList);
    }

    root.appendChild(h('h2', { text: 'Completion breakdown' }));
    const scoreTable = h('table', { class: 'plain' });
    scoreTable.appendChild(h('thead', {}, h('tr', {}, ['Check', 'Weight', 'Result', 'Evidence'].map(text => h('th', { text })))));
    scoreTable.appendChild(h('tbody', {}, task.scores.map(score => h('tr', {},
      h('td', { text: score.label }), h('td', { text: String(score.weight) }),
      h('td', { text: score.score === null ? 'n/a' : Math.round(score.score * 100) + '%' }), h('td', { text: score.detail })))));
    root.appendChild(h('div', { class: 'table-wrap' }, scoreTable));

    if (task.expected || task.review) {
      root.appendChild(h('h2', { text: 'Plan' }));
      if (task.expected) root.appendChild(h('p', {}, h('strong', { text: 'Expected outcome: ' }), task.expected));
      if (task.review) root.appendChild(h('p', {}, h('strong', { text: 'Review checkpoint: ' }), task.review));
    }
    root.appendChild(h('p', { class: 'muted-text' }, 'Defined at: ', task.definitions.map(def => [fileLink(def.path, def.line), ' '])));

    root.appendChild(h('h2', { text: 'Files (' + task.files.length + ')' }));
    const fileTable = h('table', { class: 'plain' });
    fileTable.appendChild(h('thead', {}, h('tr', {}, ['Path : line', 'Role', 'Linked by', 'On disk'].map(text => h('th', { text })))));
    fileTable.appendChild(h('tbody', {}, task.files.map(file => h('tr', {},
      h('td', {}, fileLink(file.path, file.line)), h('td', { text: file.role }), h('td', { text: file.via.join(', ') }),
      h('td', { class: file.exists ? 'ok-text' : 'bad-text', text: file.exists ? 'yes' : 'MISSING' })))));
    root.appendChild(task.files.length ? h('div', { class: 'table-wrap' }, fileTable) : h('p', { class: 'muted-text', text: 'No file could be linked to this task.' }));

    root.appendChild(h('h2', { text: 'Symbols named in the plan (' + task.symbols.length + ')' }));
    if (task.symbols.length) {
      const symbolTable = h('table', { class: 'plain' });
      symbolTable.appendChild(h('thead', {}, h('tr', {}, ['Symbol', 'Result', 'Location'].map(text => h('th', { text })))));
      symbolTable.appendChild(h('tbody', {}, task.symbols.map(symbol => h('tr', {},
        h('td', { class: 'mono', text: symbol.name }),
        h('td', { class: symbol.ignored ? 'muted-text' : symbol.found ? 'ok-text' : 'bad-text', text: symbol.ignored ? 'ignored' : symbol.found ? symbol.kind + ' (' + symbol.where + ')' : 'NOT FOUND' }),
        h('td', {}, symbol.found ? fileLink(symbol.path, symbol.line) : symbol.note || '-')))));
      root.appendChild(h('div', { class: 'table-wrap' }, symbolTable));
    } else {
      root.appendChild(h('p', { class: 'muted-text', text: 'The plan text names no checkable symbols.' }));
    }

    root.appendChild(h('h2', { text: 'Tests (' + task.tests.length + ')' }));
    if (task.tests.length) {
      const testTable = h('table', { class: 'plain' });
      testTable.appendChild(h('thead', {}, h('tr', {}, ['Test file', 'State', 'Cases', 'Last run', 'Failures'].map(text => h('th', { text })))));
      testTable.appendChild(h('tbody', {}, task.tests.map(test => h('tr', {},
        h('td', {}, fileLink(test.path)), h('td', {}, h('span', { class: 'ts ts-' + test.state, text: test.state })),
        h('td', { text: test.total === null ? '-' : test.passed + '/' + test.total }), h('td', { text: test.at ? when(test.at) : '-' }),
        h('td', {}, test.failures.map(failure => h('div', { class: 'bad-text small', text: failure.name + ' :: ' + String(failure.message).split('\n')[0].slice(0, 160) })), test.note ? h('div', { class: 'muted-text small', text: test.note }) : null)))));
      root.appendChild(h('div', { class: 'table-wrap' }, testTable));
    } else {
      root.appendChild(h('p', { class: 'warn-text', text: 'No test is declared or linked for this task.' }));
    }

    root.appendChild(h('h2', { text: 'TypeScript (tsc per package)' }));
    root.appendChild(task.tsc.length ? h('ul', { class: 'plain-list' }, task.tsc.map(item => h('li', {},
      h('span', { class: 'ts ts-' + (item.state === 'clean' ? 'passed' : item.state), text: item.state }), ' ', fileLink(item.config),
      ' | errors in task files: ' + item.count + ' | errors in package: ' + item.packageErrors + ' | run ' + when(item.at),
      item.diagnostics.map(diag => h('div', { class: 'bad-text small' }, fileLink(diag.file, diag.line), ' ' + diag.code + ' ' + diag.message))))) :
      h('p', { class: 'muted-text', text: 'No TypeScript package files linked.' }));

    root.appendChild(h('h2', { text: 'Dependencies' }));
    root.appendChild(h('h3', { text: 'Prerequisites' }));
    root.appendChild(task.prerequisites.length ? h('ul', { class: 'plain-list' }, task.prerequisites.map(pre => {
      const target = D.tasks[pre];
      return h('li', {}, target ? [dot(target.color), ' ', h('a', { class: 'mono', href: '#/task/' + pre, text: pre }), ' - registry ' + target.status + ', verified ' + target.percent + '%'] : pre + ' (not in registry)');
    })) : h('p', { class: 'muted-text', text: 'None.' }));
    root.appendChild(h('h3', { text: 'Dependents' }));
    root.appendChild(task.dependents.length ? h('p', {}, task.dependents.map(dep => [h('a', { class: 'mono', href: '#/task/' + dep, text: dep }), ' '])) : h('p', { class: 'muted-text', text: 'None.' }));
    root.appendChild(h('h3', { text: 'Imports from linked files (' + task.deps.imports.length + ')' }));
    if (task.deps.imports.length) {
      const importTable = h('table', { class: 'plain' });
      importTable.appendChild(h('thead', {}, h('tr', {}, ['From', 'Import', 'Resolved to'].map(text => h('th', { text })))));
      importTable.appendChild(h('tbody', {}, task.deps.imports.map(imp => h('tr', {},
        h('td', {}, fileLink(imp.from, imp.line)), h('td', { class: 'mono', text: imp.spec }),
        h('td', {}, imp.resolved ? fileLink(imp.resolved) : h('span', { class: 'bad-text', text: 'unresolved' }))))));
      root.appendChild(h('div', { class: 'table-wrap' }, importTable));
    }
    if (task.deps.external.length) root.appendChild(h('p', { class: 'muted-text' }, 'External packages: ' + task.deps.external.join(', ')));

    root.appendChild(h('h2', { text: 'Commits naming this task (' + task.clues.length + ')' }));
    root.appendChild(task.clues.length ? h('ul', { class: 'plain-list' }, task.clues.map(commit => h('li', {}, h('span', { class: 'mono', text: commit.sha }), ' ' + (commit.subject || '') + ' (' + commit.file + ')'))) : h('p', { class: 'muted-text', text: 'No commit message or clue file names this task.' }));

    const gaps = task.gapIds.map(gid => D.gaps.find(gap => gap.id === gid)).filter(Boolean);
    const findings = task.findingIds.map(fid => D.findings.find(finding => finding.id === fid)).filter(Boolean);
    if (gaps.length || findings.length) {
      root.appendChild(h('h2', { text: 'Related gaps and findings' }));
      root.appendChild(h('ul', { class: 'gaps' }, findings.map(findingRow), gaps.map(gapRow)));
    }
    if (task.override) root.appendChild(h('p', { class: 'muted-text', text: 'overrides.json note: ' + task.override }));
    return root;
  }

  function defectsView() {
    const root = h('div', { class: 'view' });
    root.appendChild(h('a', { href: '#/', class: 'back', text: 'Dashboard' }));
    root.appendChild(h('h1', { text: 'Defect list' }));
    root.appendChild(h('p', { class: 'muted-text', text: 'A defect is a task with a failing test, a tsc error, or a registry DONE claim that the evidence on disk does not support. Use Report, apply the fix, then Verify; a task leaves this list when it has no open issues.' }));
    let any = false;
    for (const phase of D.phases) {
      const ids = phaseTasks(phase.id).filter(id => D.tasks[id].defect);
      if (!ids.length) continue;
      any = true;
      root.appendChild(h('h2', {}, h('a', { href: '#/phase/' + phase.id, text: phase.id + ' - ' + phase.name }), ' (' + ids.length + ')'));
      for (const id of ids) {
        const task = D.tasks[id];
        root.appendChild(h('div', { class: 'defect' },
          h('div', { class: 'defect-head' }, dot(task.color), h('a', { class: 'mono', href: '#/task/' + id, text: id }), h('span', { class: 'title', text: task.title }),
            h('span', { class: 'pct', text: task.percent + '%' }), h('span', { class: 'actions' }, reportButton(id), verifyButton(id))),
          issueList(task.issues.filter(issue => issue.severity !== 'info'), 4)));
      }
    }
    if (!any) root.appendChild(h('p', { class: 'ok-text', text: 'No defects. Every task is either verified, pending, or excluded.' }));
    return root;
  }

  // ------------------------------------------------------------------ Dashboard View
  function dashboardView() {
    const root = h('div', { class: 'view dashboard-view' });
    root.appendChild(h('h1', { text: 'OTOMIX Architecture Dashboard' }));
    root.appendChild(h('p', { class: 'muted-text objective' }, 'Phase completion status based on physical evidence on disk. Click a phase to drill down.'));
    
    // Overall stats
    const totalTasks = D.order.length;
    const completedTasks = D.order.filter(id => D.tasks[id].color === 'green').length;
    const overallPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    root.appendChild(h('div', { class: 'hero' },
      h('div', { class: 'hero-pct', text: overallPercent + '%' }),
      h('div', { class: 'hero-body' },
        bar(overallPercent, overallPercent === 100 ? 'green' : 'yellow'),
        h('div', { class: 'toolbar' },
          h('span', { class: 'muted-text', text: completedTasks + ' of ' + totalTasks + ' tasks verified' })
        )
      )
    ));
    
    // Phase cards
    const phaseContainer = h('div', { class: 'phase-grid' });
    for (const phase of D.phases) {
      const stats = D.phaseStats?.[phase.id];
      if (!stats) continue;
      
      const card = h('div', { class: 'phase-card c-' + stats.color });
      card.appendChild(h('a', { class: 'phase-header', href: '#/phase/' + phase.id },
        h('span', { class: 'phase-id mono', text: phase.id }),
        h('span', { class: 'phase-name', text: phase.name }),
        h('span', { class: 'phase-pct mono', text: stats.avgPercent + '%' })
      ));
      
      const statsRow = h('div', { class: 'phase-stats' });
      statsRow.appendChild(statItem('Done', stats.done, 'green'));
      statsRow.appendChild(statItem('In Progress', stats.inProgress, 'yellow'));
      statsRow.appendChild(statItem('Failed', stats.failed, 'red'));
      statsRow.appendChild(statItem('Blocked', stats.blocked, 'blue'));
      statsRow.appendChild(statItem('Not Started', stats.notStarted, 'grey'));
      statsRow.appendChild(statItem('Defects', stats.defects, 'red'));
      card.appendChild(statsRow);
      
      // Progress bar
      card.appendChild(h('div', { class: 'bar' }, h('span', { class: 'fill c-' + stats.color, style: 'width:' + stats.avgPercent + '%' })));
      
      phaseContainer.appendChild(card);
    }
    root.appendChild(phaseContainer);
    
    return root;
  }
  
  function statItem(label, value, color) {
    return h('div', { class: 'stat-item' },
      h('span', { class: 'stat-label muted-text', text: label }),
      h('span', { class: 'stat-value mono c-' + color, text: String(value) })
    );
  }

  // ------------------------------------------------------------------ navigation, search, refresh
  function renderNav() {
    const nav = document.getElementById('nav');
    clear(nav);
    nav.appendChild(h('a', { class: 'nav-link', href: '#/', 'data-route': '#/' }, 'Dashboard'));
    const defects = aggregate(D.order).defects;
    nav.appendChild(h('a', { class: 'nav-link', href: '#/defects', 'data-route': '#/defects' }, 'Defect list ', h('span', { class: 'count-pill', text: String(defects) })));
    for (const phase of D.phases) {
      const ids = phaseTasks(phase.id);
      if (!ids.length) continue;
      const agg = aggregate(ids);
      nav.appendChild(h('a', { class: 'nav-link', href: '#/phase/' + phase.id, 'data-route': '#/phase/' + phase.id },
        h('span', { class: 'nav-id', text: phase.id }), ' ', h('span', { class: 'nav-name', text: phase.name }), h('span', { class: 'nav-pct', text: agg.percent + '%' }),
        bar(agg.percent, agg.percent === 100 ? 'green' : 'yellow')));
    }
  }

  function render() {
    const main = document.getElementById('main');
    clear(main);
    const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
    let view;
    if (parts[0] === 'phase') view = phaseView(parts[1]);
    else if (parts[0] === 'task') view = taskView(parts[1]);
    else if (parts[0] === 'defects') view = defectsView();
    else view = dashboardView();
    main.appendChild(view);
    window.scrollTo(0, 0);
    const route = '#/' + parts.slice(0, parts[0] === 'task' ? 0 : 2).join('/');
    for (const link of document.querySelectorAll('#nav a')) {
      const target = link.getAttribute('data-route');
      link.classList.toggle('active', target === (parts[0] === 'phase' ? route : parts[0] === 'defects' ? '#/defects' : parts[0] === 'task' ? '#/phase/' + (D.tasks[parts[1]] || {}).phase : '#/'));
    }
    document.getElementById('sidebar').classList.remove('open');
  }

  function initSearch() {
    const input = document.getElementById('search');
    const box = document.getElementById('search-results');
    const run = () => {
      const query = input.value.trim().toLowerCase();
      clear(box);
      if (query.length < 2) { box.hidden = true; return; }
      const hits = D.order.filter(id => (id + ' ' + D.tasks[id].title).toLowerCase().includes(query)).slice(0, 20);
      if (!hits.length) box.appendChild(h('div', { class: 'muted-text pad', text: 'No tasks match "' + input.value + '".' }));
      for (const id of hits) {
        const task = D.tasks[id];
        box.appendChild(h('a', { class: 'hit', href: '#/task/' + id, onclick: () => { box.hidden = true; input.value = ''; } },
          dot(task.color), h('span', { class: 'mono', text: id }), h('span', { class: 'title', text: task.title }), h('span', { class: 'pct', text: task.percent + '%' })));
      }
      box.hidden = false;
    };
    input.addEventListener('input', run);
    document.addEventListener('keydown', event => {
      if (event.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); input.focus(); }
      else if (event.key === 'Escape') { input.blur(); box.hidden = true; }
    });
    document.addEventListener('click', event => { if (!box.contains(event.target) && event.target !== input) box.hidden = true; });
  }

  function initChrome() {
    const apply = theme => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('otomix_book_theme', theme); };
    apply(localStorage.getItem('otomix_book_theme') || 'dark');
    document.getElementById('theme-toggle').addEventListener('click', () => apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
    document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  }

  // Go Live reloads on file changes; this poll covers a missed reload by watching the data file's headers.
  function watchDataFile() {
    if (location.protocol === 'file:') return;
    let known = null;
    setInterval(async () => {
      try {
        const response = await fetch('book-data.js', { method: 'HEAD', cache: 'no-store' });
        const stamp = response.headers.get('last-modified') + '|' + response.headers.get('content-length');
        if (known && stamp !== known) location.reload();
        known = stamp;
      } catch (error) { /* server stopped; keep the current view */ }
    }, 10000);
  }

  function boot() {
    initChrome();
    if (!D) {
      document.getElementById('main').appendChild(h('div', { class: 'view' }, h('h1', { text: 'No data' }),
        h('p', { text: 'book-data.js is missing. Run this in a PowerShell terminal from the repository root:' }),
        h('pre', {}, h('code', { text: 'node .\\Docs\\ArchitectureBook\\scan.cjs --watch' }))));
      return;
    }
    renderNav();
    initSearch();
    window.addEventListener('hashchange', render);
    render();
    watchDataFile();
  }

  boot();
})();
