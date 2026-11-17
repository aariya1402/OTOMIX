'use strict';

// Builds book-data.js from physical evidence on disk. No network, no guessing:
// every claim carries a path and (where possible) a line number.
//
//   node Docs/ArchitectureBook/scan.cjs            one-shot build
//   node Docs/ArchitectureBook/scan.cjs --watch    rebuild on every relevant file change

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const BOOK = __dirname;
const PLAN_DIR = path.join(ROOT, 'Docs', 'OtoMix Todo-Plan');
const PLAN_REL = 'Docs/OtoMix Todo-Plan/';
const FILES = {
  master: 'OTOMIX_MicroTask_Plan.md',
  addendum: 'OTOMIX_MicroTask_Plan_Addendum.md',
  supplement: 'OTOMIX_MicroTask_Plan_Supplement.md',
  registry: 'OTOMIX_MicroTask_Plan.tasks.json'
};
const OUTPUT = path.join(BOOK, 'book-data.js');
const EVIDENCE = path.join(BOOK, 'evidence.json');
const OVERRIDES = path.join(BOOK, 'overrides.json');
const CLUES_DIR = path.join(BOOK, 'clues');

const CODE_DIRS = ['packages', 'tools', 'scripts', 'bench', 'fuzz', 'features', 'policy', 'deploy', 'proto'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.turbo', 'corpus']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.sql', '.proto', '.feature', '.json', '.yaml', '.yml', '.rego']);
const MAX_BYTES = 1024 * 1024;
const TEST_FILE = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
const BARREL_FILE = /^packages\/[^/]+\/src\/index\.ts$/; // barrels re-export; mtime change is not a test failure signal
const TASK_ID = /\bP\d{2}(?:-[A-Z0-9]+)+\b/g;
const PATH_TOKEN = /(?:packages|tools|scripts|features|bench|fuzz|policy|deploy|proto|e2e)\/[A-Za-z0-9_./@-]+\.(?:tsx|json|ts|js|cjs|mjs|sql|proto|feature|yaml|yml|rego)(?!\w)/g;
const WEIGHTS = { files: 25, symbols: 25, testFile: 15, testRun: 20, tsc: 15 };
const EXCLUDED_STATUS = new Set(['CANCELLED', 'SUPERSEDED']);
const SYMBOL_STOP = new Set(['PostgreSQL', 'TypeScript', 'JavaScript', 'LaunchDarkly', 'OpenTelemetry', 'WebAssembly',
  'TensorFlow', 'VirtualDJ', 'AudioWorklet', 'Testcontainers', 'AudioContext', 'IndexedDB', 'RuleTester', 'JetStream',
  'NodeJS', 'OpenAPI', 'MinIO', 'GitHub', 'EssentiaJS', 'GitLab', 'DevOps', 'ReactDOM']);
const ENV_FAILURE = /docker|container runtime|testcontainers|ECONNREFUSED|could not find a working container/i;
const VITEST_RUNNER = /vitest|ruletester|fast-check|pact/i;

// Phase definitions for dashboard
const PHASES = [
  { id: 'P01', name: 'Foundation & Shared Contracts', order: 1 },
  { id: 'P02', name: 'Beat-Index Engine & Absolute Locked Grid', order: 2 },
  { id: 'P03', name: 'Dual Grid & Runtime Observer', order: 3 },
  { id: 'P04', name: 'DSP Port & Real-Time Safety', order: 4 },
  { id: 'P05', name: 'Feature Extraction & Analysis Pipeline', order: 5 },
  { id: 'P06', name: 'Security, RBAC & Tenant Isolation', order: 6 },
  { id: 'P07', name: 'Local Ingestion & Hostile-File Handling', order: 7 },
  { id: 'P08', name: 'MixPlan, UI & Redux Architecture', order: 8 },
  { id: 'P09', name: 'XML Export & Set Shop', order: 9 },
  { id: 'P10', name: 'Observability, Deployment & DR', order: 10 },
  { id: 'P11', name: 'Hardening, Determinism Proof & Acceptance', order: 11 }
];

const rel = full => path.relative(ROOT, full).split(path.sep).join('/');
const readText = full => fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '');
const readJson = (full, fallback) => {
  try { return JSON.parse(readText(full)); } catch (error) { return fallback; }
};
const existsFile = relative => {
  try { return fs.statSync(path.join(ROOT, relative)).isFile(); } catch (error) { return false; }
};

// ---------------------------------------------------------------------------
// Source index: one pass over every code file.
// ---------------------------------------------------------------------------
const DECL = /^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/;
const PROP = /^\s*(?:(?:public|private|protected|static|readonly)\s+)*["']?([A-Za-z_$][\w$]*)["']?\??\s*:/;
const METHOD = /^\s{2,}(?:(?:public|private|protected|static|readonly|async|get|set)\s+)*([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\([^)]*\)\s*(?::\s*[^={;]+)?\s*\{\s*$/;
const EXPORT_LIST = /^\s*export\s*(?:type\s*)?\{([^}]*)\}/;

function walk(dir, callback) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (error) { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, callback);
    } else if (entry.isFile() && TEXT_EXT.has(path.extname(entry.name))) {
      callback(full);
    }
  }
}

function buildIndex() {
  const files = new Map();
  const decls = new Map();
  const packageMtime = new Map();
  let newest = 0;

  const addDecl = (name, entry) => {
    const list = decls.get(name) || [];
    if (list.length < 8) { list.push(entry); decls.set(name, list); }
  };

  const visit = full => {
    const relative = rel(full);
    const stat = fs.statSync(full);
    const info = { path: relative, mtime: stat.mtimeMs, ids: {}, imports: [] };
    files.set(relative, info);
    newest = Math.max(newest, stat.mtimeMs);
    const pkg = /^packages\/([^/]+)\//.exec(relative);
    if (pkg) packageMtime.set(pkg[1], Math.max(packageMtime.get(pkg[1]) || 0, stat.mtimeMs));
    if (stat.size > MAX_BYTES) return;
    const code = /\.(?:ts|tsx|js|jsx|cjs|mjs)$/.test(relative);
    const lines = readText(full).split(/\r?\n/);
    lines.forEach((line, index) => {
      const number = index + 1;
      for (const id of line.match(TASK_ID) || []) if (!(id in info.ids)) info.ids[id] = number;
      if (!code && !relative.endsWith('.json')) return;
      let match = DECL.exec(line);
      if (match) addDecl(match[1], { path: relative, line: number, kind: 'declaration' });
      else if ((match = EXPORT_LIST.exec(line))) {
        for (const part of match[1].split(',')) {
          const name = part.trim().split(/\s+as\s+/).pop();
          if (/^[A-Za-z_$][\w$]*$/.test(name)) addDecl(name, { path: relative, line: number, kind: 'export' });
        }
      } else if ((match = PROP.exec(line))) addDecl(match[1], { path: relative, line: number, kind: 'property' });
      else if ((match = METHOD.exec(line))) addDecl(match[1], { path: relative, line: number, kind: 'method' });
      if (code && info.imports.length < 80) {
        const imp = /\bfrom\s+['"]([^'"]+)['"]/.exec(line) || /^\s*import\s+['"]([^'"]+)['"]/.exec(line) || /\brequire\(\s*['"]([^'"]+)['"]\s*\)/.exec(line);
        if (imp) info.imports.push({ line: number, spec: imp[1] });
      }
    });
  };

  for (const dir of CODE_DIRS) walk(path.join(ROOT, dir), visit);
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && TEXT_EXT.has(path.extname(entry.name))) visit(path.join(ROOT, entry.name));
  }
  return { files, decls, packageMtime, newest };
}

function resolveImport(index, from, spec) {
  if (spec.startsWith('.')) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
    const bare = base.replace(/\.[cm]?js$/, '');
    const candidates = [base, bare + '.ts', bare + '.tsx', base + '.ts', base + '.tsx', base + '.js', base + '.cjs', base + '.mjs',
      base + '/index.ts', base + '/index.js'];
    const hit = candidates.find(candidate => index.files.has(candidate));
    return hit ? { type: 'relative', resolved: hit } : { type: 'relative', resolved: null };
  }
  const workspace = /^@otomix\/([^/]+)(?:\/(.*))?$/.exec(spec);
  if (workspace) {
    const entry = 'packages/' + workspace[1] + '/src/index.ts';
    return { type: 'workspace', resolved: index.files.has(entry) ? entry : (fs.existsSync(path.join(ROOT, 'packages', workspace[1])) ? 'packages/' + workspace[1] : null) };
  }
  return { type: 'external', resolved: null, name: spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0] };
}

// ---------------------------------------------------------------------------
// Plan parsing
// ---------------------------------------------------------------------------
function parseHeadings(text, source) {
  const lines = text.split(/\r?\n/);
  const tasks = [];
  let task;
  lines.forEach((line, index) => {
    const heading = /^######\s+(P\d{2}-[A-Z0-9-]+)\s+\u2014\s+(.+?)\s*$/.exec(line);
    if (heading) {
      task = { id: heading[1], marker: heading[2], source, line: index + 1, fields: {} };
      tasks.push(task);
    } else if (/^#{1,6}\s/.test(line)) {
      task = undefined;
    } else if (task) {
      const field = /^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
      if (field && field[1] !== 'Field' && !/^[-: ]+$/.test(field[1])) task.fields[field[1]] = field[2];
    }
  });
  return tasks;
}

function parsePhases(masterText) {
  const phases = [];
  for (const line of masterText.split(/\r?\n/)) {
    const match = /^\|\s*(P\d{2})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/.exec(line);
    if (match && !phases.some(item => item.id === match[1])) {
      phases.push({ id: match[1], name: match[2], objective: match[3], upstream: match[4], downstream: match[5] });
    }
  }
  return phases;
}

function parseGaps(text, source, tasksById) {
  const lines = text.split(/\r?\n/);
  const gaps = [];
  let current;
  lines.forEach((line, index) => {
    const head = /^###\s+\[([A-Z]+)-(\d+)\]\s*(.*)$/.exec(line);
    if (head) {
      current = { category: head[1], id: head[1] + '-' + head[2], rest: head[3], source: PLAN_REL + source, line: index + 1, body: [] };
      gaps.push(current);
    } else if (/^#{1,3}\s/.test(line)) {
      current = undefined;
    } else if (current) {
      current.body.push(line);
    }
  });
  return gaps.filter(gap => ['GAP', 'CONFLICT', 'DEFERRED'].includes(gap.category)).map(gap => {
    const tags = [...gap.rest.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
    const phaseTag = tags.find(tag => tag.startsWith('PHASE:')) || 'PHASE: ALL';
    const severity = tags.find(tag => !tag.startsWith('PHASE:')) || 'UNSPECIFIED';
    const title = gap.rest.replace(/\[[^\]]+\]/g, '').trim();
    const body = gap.body.join('\n');
    const fields = {};
    for (const line of gap.body) {
      const field = /^-\s+\*\*([^*:]+):\*\*\s*(.*)$/.exec(line);
      if (field) fields[field[1]] = field[2].slice(0, 600);
    }
    const refs = [...new Set((body.match(PATH_TOKEN) || []).concat(body.match(/Docs\/[A-Za-z0-9_./ -]+\.(?:md|ps1|json|js|cjs)/g) || []))]
      .map(item => ({ path: item.trim(), exists: existsFile(item.trim()) }));
    const taskIds = [...new Set(body.match(TASK_ID) || [])].filter(id => tasksById.has(id));
    const claimedResolved = /\*\*Fix applied:\*\*|\bRESOLVED\b|\*\*Status:\*\*\s*(?:DONE|RESOLVED|FIXED)/i.test(body);
    return {
      id: gap.id, category: gap.category, severity, title, source: gap.source, line: gap.line,
      phases: phaseTag.replace('PHASE:', '').split(',').map(item => item.trim()).filter(Boolean),
      fields, refs, tasks: taskIds, state: claimedResolved ? 'claimed-resolved' : 'open'
    };
  });
}

function parseClues() {
  const result = {};
  const dirs = [path.join(BOOK, 'clues'), path.join(BOOK, 'clues', 'archive')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter(item => item.endsWith('.md'))) {
      let current;
      for (const line of readText(path.join(dir, name)).split(/\r?\n/)) {
        const head = /^##\s+(\S+)/.exec(line);
        if (head) {
          current = result[head[1]] = result[head[1]] || { commits: [], files: new Set(), defects: [] };
          continue;
        }
        if (!current) continue;
        const commit = /\*\*Commit\*\*:\s*([0-9a-f]{6,40})/.exec(line);
        if (commit) current.commits.push({ sha: commit[1], file: rel(path.join(dir, name)) });
        const file = /^\s+-\s+`([^`]+)`/.exec(line);
        if (file && !file[1].startsWith('...')) current.files.add(file[1]);
        // BUGFIX-SCAN-DEFECTS-001: structural clue fields (What/Expected/Test/...) are metadata, not defects.
      }
    }
  }
  return result;
}

// Parse phase-level defects from clues
function parsePhaseDefects(clues) {
  const phaseDefects = {};
  for (const [taskId, clue] of Object.entries(clues)) {
    if (!clue.defects || !clue.defects.length) continue;
    const phase = taskId.slice(0, 3); // P01, P02, etc.
    if (!phaseDefects[phase]) phaseDefects[phase] = [];
    for (const d of clue.defects) {
      phaseDefects[phase].push({ taskId, type: d.type, text: d.text });
    }
  }
  return phaseDefects;
}

// Compute phase statistics for dashboard
function computePhaseStats(tasks, phases) {
  const stats = {};
  for (const phase of phases) {
    const phaseTasks = Object.values(tasks).filter(t => t.phase === phase.id);
    const total = phaseTasks.length;
    const done = phaseTasks.filter(t => t.status === 'DONE' && t.color === 'green').length;
    const inProgress = phaseTasks.filter(t => t.color === 'yellow').length;
    const blocked = phaseTasks.filter(t => t.status === 'BLOCKED').length;
    const notStarted = phaseTasks.filter(t => t.color === 'grey').length;
    const failed = phaseTasks.filter(t => t.color === 'red').length;
    const excluded = phaseTasks.filter(t => t.color === 'muted').length;
    
    // Calculate completion percentage based on weighted scores
    const scored = phaseTasks.filter(t => t.color !== 'muted');
    const totalPercent = scored.reduce((sum, t) => sum + (t.percent || 0), 0);
    const avgPercent = scored.length > 0 ? Math.round(totalPercent / scored.length) : 0;
    
    // Count defects from clues
    const defects = phaseTasks.reduce((sum, t) => sum + (t.defects?.length || 0), 0);
    
    stats[phase.id] = {
      id: phase.id,
      name: phase.name,
      order: phase.order,
      total,
      done,
      inProgress,
      blocked,
      notStarted,
      failed,
      excluded,
      avgPercent,
      defects,
      color: failed > 0 ? 'red' : (blocked > 0 ? 'blue' : (excluded === total && total > 0 ? 'muted' : (done === (total - excluded) && (total - excluded) > 0 ? 'green' : 'yellow')))
    };
  }
  return stats;
}

const gitCache = { head: '', tasks: {} };
function loadGit() {
  const { spawnSync } = require('child_process');
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  if (head.status !== 0) return {};
  const sha = head.stdout.trim();
  if (gitCache.head === sha) return gitCache.tasks;
  const log = spawnSync('git', ['log', '--name-only', '--no-renames', '--pretty=format:@@%h%x09%s'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const tasks = {};
  if (log.status === 0) {
    for (const block of log.stdout.split('@@').slice(1)) {
      const [first, ...names] = block.split(/\r?\n/);
      const [commit, subject = ''] = first.split('\t');
      const ids = new Set(subject.match(TASK_ID) || []);
      for (const match of subject.matchAll(/\b(RBAC-M\d+)\b/g)) ids.add('P06-' + match[1]);
      const code = names.map(name => name.trim()).filter(name => CODE_DIRS.includes(name.split('/')[0]) || /^[^/]+\.(?:ts|json|js)$/.test(name));
      if (!ids.size || code.length > 30) continue;
      for (const id of ids) {
        const entry = tasks[id] = tasks[id] || { commits: [], files: new Set() };
        entry.commits.push({ sha: commit, file: 'git', subject: subject.slice(0, 120) });
        code.forEach(name => entry.files.add(name));
      }
    }
  }
  gitCache.head = sha;
  gitCache.tasks = tasks;
  return tasks;
}

// ---------------------------------------------------------------------------
// Per-task evidence
// ---------------------------------------------------------------------------
function globToRegExp(pattern) {
  const source = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp('^' + source + '$');
}

function extractSymbols(text) {
  const found = new Set();
  for (const match of text.matchAll(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\s*=/g)) found.add(match[1]);
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const token = match[1].trim().replace(/\(\)$/, '');
    if (!/^[A-Za-z_$][\w$]*$/.test(token) || token.length < 4 || SYMBOL_STOP.has(token)) continue;
    if (/[a-z][A-Z]/.test(token) || (/_/.test(token) && /[A-Z]/.test(token))) found.add(token);
  }
  return [...found].slice(0, 40);
}

function newestMtime(index, paths) {
  let newest = 0;
  for (const item of paths) {
    const info = index.files.get(item);
    if (info) newest = Math.max(newest, info.mtime);
  }
  return newest;
}

function summarizeTitle(text) {
  const clean = String(text || '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
  const sentence = clean.split(/(?<=[.:])\s/)[0] || clean;
  return sentence.length > 110 ? sentence.slice(0, 107) + '...' : sentence;
}

function build() {
  const index = buildIndex();
  const evidence = readJson(EVIDENCE, { tests: {}, tsc: {} });
  evidence.tests = evidence.tests || {};
  evidence.tsc = evidence.tsc || {};
  const overrides = readJson(OVERRIDES, {});
  const clues = parseClues();
  const gitTasks = loadGit();
  const masterText = readText(path.join(PLAN_DIR, FILES.master));
  const addendumText = readText(path.join(PLAN_DIR, FILES.addendum));
  const supplementText = readText(path.join(PLAN_DIR, FILES.supplement));
  const registryText = readText(path.join(PLAN_DIR, FILES.registry));
  const registry = JSON.parse(registryText);
  const registryLines = {};
  registryText.split(/\r?\n/).forEach((line, i) => {
    const match = /"id"\s*:\s*"([^"]+)"/.exec(line);
    if (match) registryLines[match[1]] = i + 1;
  });
  const supplementLines = supplementText.split(/\r?\n/);

  const definitions = new Map();
  for (const [name, text] of [[FILES.master, masterText], [FILES.addendum, addendumText]]) {
    for (const item of parseHeadings(text, name)) {
      const list = definitions.get(item.id) || [];
      list.push(item);
      definitions.set(item.id, list);
    }
  }

  const base = new Map();
  for (const entry of registry) {
    const status = String(entry.status || 'TODO');
    base.set(entry.id, {
      id: entry.id, source: 'registry', status: status.split(':')[0], statusNote: status.includes(':') ? status.slice(status.indexOf(':') + 1) : '',
      description: entry.description || '', prerequisites: entry.prerequisites || [], testField: entry.test || '', spec: entry.spec || '',
      registryLine: registryLines[entry.id] || null
    });
  }
  for (const [id, defs] of definitions) {
    if (base.has(id)) continue;
    const def = defs[0];
    const prereq = (def.fields.Prerequisites || '').match(/P\d{2}-[A-Z0-9-]+/g) || [];
    base.set(id, {
      id, source: 'addendum', status: /\[x\]|DONE/i.test(def.marker) ? 'DONE' : 'TODO', statusNote: '',
      description: (def.fields.Description || '').replace(/<br>/g, ' '), prerequisites: prereq,
      testField: '', planTest: def.fields['Independent Test(s)'] || '', spec: def.fields['Spec Reference'] || '', registryLine: null
    });
  }

  const tasksById = new Map([...base.entries()]);
  const phases = parsePhases(masterText);
  const gaps = parseGaps(supplementText, FILES.supplement, tasksById);
  
  // Parse phase-level defects from clues
  const phaseDefects = parsePhaseDefects(clues);

  const clueFor = id => {
    const fromClues = clues[id] || clues[id.replace(/^P\d{2}-/, '')] || null;
    const fromGit = gitTasks[id] || null;
    if (!fromClues && !fromGit) return null;
    return {
      commits: [...(fromClues ? fromClues.commits : []), ...(fromGit ? fromGit.commits : [])],
      files: new Set([...(fromClues ? fromClues.files : []), ...(fromGit ? fromGit.files : [])]),
      defects: fromClues ? fromClues.defects || [] : []
    };
  };
  const basenames = new Map();
  for (const file of index.files.keys()) {
    const name = path.posix.basename(file);
    const list = basenames.get(name) || [];
    if (list.length < 3) { list.push(file); basenames.set(name, list); }
  }
  const candidatesFor = file => (basenames.get(path.posix.basename(file)) || []).filter(item => item !== file);
  const knownIds = new Set(base.keys());

  // Citation association: only files that cite few tasks (a file citing many is an index, not an owner).
  const citationsByTask = new Map();
  for (const info of index.files.values()) {
    const ids = Object.keys(info.ids).filter(id => knownIds.has(id));
    if (!ids.length || ids.length > 3) continue;
    for (const id of ids) {
      const list = citationsByTask.get(id) || [];
      list.push({ path: info.path, line: info.ids[id] });
      citationsByTask.set(id, list);
    }
  }

  const tasks = {};
  for (const item of base.values()) {
    const defs = definitions.get(item.id) || [];
    const plan = (defs.find(def => def.source === FILES.master) || defs[0] || { fields: {} }).fields;
    const override = overrides[item.id] || {};
    const ignoreFiles = new Set(override.ignoreFiles || []);
    const ignoreSymbols = new Set(override.ignoreSymbols || []);
    const ignoreIssues = new Set(override.ignoreIssues || []);

    const parts = item.testField.split('|');
    const runnerText = parts.length >= 3 ? parts[1] : String(item.planTest || plan['Independent Test(s)'] || '');
    let locator = parts.length >= 3 ? parts[2].trim() : '';
    if (!locator) {
      const planned = /`([^`]+\.(?:ts|tsx|js|cjs|mjs|feature|rego))`/.exec(String(item.planTest || plan['Independent Test(s)'] || ''));
      if (planned) locator = planned[1];
    }
    const vitest = VITEST_RUNNER.test(runnerText);

    const declaredText = [item.description, item.testField, plan['Expected Outcome'] || '', plan['Independent Test(s)'] || ''].join('\n');
    const declared = new Set(declaredText.match(PATH_TOKEN) || []);
    if (locator && !/[*?]/.test(locator)) declared.add(locator);
    const files = new Map();
    const addFile = (file, role, via, line) => {
      if (ignoreFiles.has(file)) return;
      const current = files.get(file) || { path: file, role, via: [], exists: existsFile(file), line: null };
      if (!current.via.includes(via)) current.via.push(via);
      if (line && !current.line) current.line = line;
      files.set(file, current);
    };
    const roleOf = file => (TEST_FILE.test(file) || /^e2e\//.test(file) ? 'test' : 'source');

    const expectedTests = [];
    if (locator) {
      if (/[*?]/.test(locator)) {
        const matcher = globToRegExp(locator);
        const matches = [...index.files.keys()].filter(file => matcher.test(file));
        if (matches.length) matches.forEach(file => expectedTests.push(file));
        else expectedTests.push(locator);
      } else {
        expectedTests.push(locator);
      }
    }
    for (const file of declared) {
      if (roleOf(file) === 'test') { if (!expectedTests.includes(file)) expectedTests.push(file); }
      else addFile(file, 'source', 'declared', null);
    }
    const testSet = new Set();
    for (const file of expectedTests) {
      if (TEST_FILE.test(file) || /[*?]/.test(file) || file === locator || (locator && /[*?]/.test(locator) && globToRegExp(locator).test(file))) {
        testSet.add(file);
        addFile(file, 'test', 'declared', null);
      } else addFile(file, 'source', 'declared', null);
    }

    const clue = clueFor(item.id);
    const clueVia = file => (clue && clue.files.has(file) ? 'clue' : 'git');
    for (const file of clue ? clue.files : []) {
      if (/^Docs\//.test(file) || !existsFile(file)) continue;
      const via = clueVia(file);
      if (roleOf(file) === 'test') { testSet.add(file); addFile(file, 'test', via, null); }
      else if (CODE_DIRS.includes(file.split('/')[0]) || /^[^/]+\.config\.[mc]?[jt]s$/.test(file)) addFile(file, 'source', via, null);
      else addFile(file, 'related', via, null);
    }
    for (const cite of citationsByTask.get(item.id) || []) {
      if (roleOf(cite.path) === 'test') { testSet.add(cite.path); addFile(cite.path, 'test', 'citation', cite.line); }
      else addFile(cite.path, 'source', 'citation', cite.line);
    }

    const fileList = [...files.values()];
    const sourceFiles = fileList.filter(file => file.role === 'source' && file.exists);
    const declaredSource = fileList.filter(file => file.role === 'source' && file.via.includes('declared'));

    // Symbols named in the plan text
    const symbols = extractSymbols(item.description).map(name => {
      if (ignoreSymbols.has(name)) return { name, found: false, ignored: true, note: override.note || 'ignored by overrides.json' };
      const hits = index.decls.get(name) || [];
      const assocPaths = new Set(fileList.map(file => file.path));
      const inAssoc = hits.find(hit => assocPaths.has(hit.path) && hit.kind !== 'property') || hits.find(hit => assocPaths.has(hit.path));
      const hit = inAssoc || hits.find(entry => entry.kind !== 'property') || null;
      return hit ? { name, found: true, path: hit.path, line: hit.line, kind: hit.kind, where: inAssoc ? 'associated' : 'elsewhere' } : { name, found: false };
    });

    // Tests and their latest recorded runs
    const testPaths = [...testSet];
    const sourceMtimeSet = sourceFiles.map(file => file.path);
    const tests = testPaths.map(file => {
      const exists = existsFile(file);
      const kind = TEST_FILE.test(file) && vitest ? 'vitest' : 'manual';
      const record = evidence.tests[file] || null;
      const imports = (index.files.get(file) ? index.files.get(file).imports : [])
        .map(imp => resolveImport(index, file, imp.spec))
        .filter(imp => imp.resolved && imp.type === 'relative' && !BARREL_FILE.test(imp.resolved))
        .map(imp => imp.resolved);
      const stalenessPaths = [file, ...imports, ...sourceMtimeSet.filter(p => !BARREL_FILE.test(p))];
      const newest = newestMtime(index, stalenessPaths);
      let state = 'unrun';
      if (!exists) state = 'missing';
      else if (kind === 'manual') state = 'manual';
      else if (record) {
        if (record.at < newest) state = 'stale';
        else state = record.status;
      }
      return {
        path: file, kind, exists, state, runner: runnerText.slice(0, 80),
        at: record ? record.at : null, total: record ? record.total : null, passed: record ? record.passed : null,
        failed: record ? record.failed : null, failures: record && record.failures ? record.failures.slice(0, 8) : [],
        note: record && record.note ? record.note : ''
      };
    });

    // TypeScript diagnostics for the packages that host this task's files
    const configs = [...new Set(fileList.filter(file => file.exists && /\.(?:ts|tsx)$/.test(file.path))
      .map(file => /^packages\/([^/]+)\//.exec(file.path)).filter(Boolean).map(match => 'packages/' + match[1] + '/tsconfig.json'))]
      .filter(existsFile);
    const taskFilePaths = new Set(fileList.map(file => file.path));
    const tsc = configs.map(config => {
      const record = evidence.tsc[config] || null;
      const pkg = config.split('/')[1];
      const stale = record && record.at < (index.packageMtime.get(pkg) || 0);
      const own = record ? (record.diagnostics || []).filter(diag => taskFilePaths.has(diag.file)) : [];
      let state = 'unrun';
      if (record) state = stale ? 'stale' : record.error ? 'error' : own.length ? 'errors' : 'clean';
      return { config, state, at: record ? record.at : null, count: own.length, diagnostics: own.slice(0, 10), packageErrors: record && record.diagnostics ? record.diagnostics.length : 0 };
    });

    // Dependencies of associated files
    const imports = [];
    const external = new Set();
    for (const file of fileList.filter(entry => entry.exists && entry.role !== 'related')) {
      const info = index.files.get(file.path);
      if (!info) continue;
      for (const imp of info.imports) {
        const resolved = resolveImport(index, file.path, imp.spec);
        if (resolved.type === 'external') external.add(resolved.name);
        else if (imports.length < 60) imports.push({ from: file.path, line: imp.line, spec: imp.spec, type: resolved.type, resolved: resolved.resolved });
      }
    }

    // Scores
    const scores = [];
    const declaredSourceOk = declaredSource.filter(file => file.exists).length;
    if (declaredSource.length) {
      scores.push({ key: 'files', label: 'Declared files exist', weight: WEIGHTS.files, score: declaredSourceOk / declaredSource.length, detail: declaredSourceOk + ' of ' + declaredSource.length + ' declared files exist' });
    } else {
      scores.push({ key: 'files', label: 'Implementation files found', weight: WEIGHTS.files,
        score: override.skipCodeCheck === true ? null : (sourceFiles.length ? 1 : 0),
        detail: override.skipCodeCheck === true ? 'skipped (skipCodeCheck: decision task)' : (sourceFiles.length ? sourceFiles.length + ' files linked by commit clues or task-ID citations' : 'no declared paths and no linked files') });
    }
    const counted = symbols.filter(symbol => !symbol.ignored);
    if (counted.length) {
      const ok = counted.filter(symbol => symbol.found).length;
      scores.push({ key: 'symbols', label: 'Named symbols defined', weight: WEIGHTS.symbols, score: ok / counted.length, detail: ok + ' of ' + counted.length + ' symbols found' });
    } else {
      scores.push({ key: 'symbols', label: 'Named symbols defined', weight: WEIGHTS.symbols, score: null, detail: 'no checkable symbols in the plan text' });
    }
    const existingTests = tests.filter(test => test.exists).length;
    const testFileApplies = ignoreIssues.size === 0 || !ignoreIssues.has('no-test');
    scores.push({ key: 'testFile', label: 'Test file exists', weight: WEIGHTS.testFile, score: tests.length && testFileApplies ? existingTests / tests.length : null,
      detail: tests.length ? existingTests + ' of ' + tests.length + ' expected test files exist' : 'no test file declared or linked' });
    const runnable = tests.filter(test => test.kind === 'vitest');
    if (runnable.length) {
      const passing = runnable.filter(test => test.state === 'passed').length;
      scores.push({ key: 'testRun', label: 'Tests pass (fresh run)', weight: WEIGHTS.testRun, score: passing / runnable.length, detail: passing + ' of ' + runnable.length + ' test files have a fresh passing run' });
    } else {
      scores.push({ key: 'testRun', label: 'Tests pass (fresh run)', weight: WEIGHTS.testRun, score: null, detail: tests.length ? 'tests are not runnable by Vitest (manual)' : 'no runnable test' });
    }
    if (tsc.length) {
      const clean = tsc.filter(item2 => item2.state === 'clean').length;
      scores.push({ key: 'tsc', label: 'tsc clean for task files', weight: WEIGHTS.tsc, score: clean / tsc.length, detail: clean + ' of ' + tsc.length + ' packages have a fresh clean tsc run' });
    } else {
      scores.push({ key: 'tsc', label: 'tsc clean for task files', weight: WEIGHTS.tsc, score: null, detail: 'no TypeScript package files linked' });
    }
    const applicable = scores.filter(score => score.score !== null);
    const percent = applicable.length ? Math.round(100 * applicable.reduce((sum, score) => sum + score.weight * score.score, 0) / applicable.reduce((sum, score) => sum + score.weight, 0)) : 0;

    // Issues
    const issues = [];
    const done = item.status === 'DONE';
    const hint = file => {
      const names = candidatesFor(file);
      return names.length ? ' (same file name exists at: ' + names.join(', ') + ')' : '';
    };
    for (const file of declaredSource.filter(entry => !entry.exists)) {
      issues.push({ kind: 'file-missing', severity: done ? 'error' : 'warn', text: 'Declared file does not exist' + hint(file.path), path: file.path });
    }
    if (!declaredSource.length && !sourceFiles.length && override.skipCodeCheck !== true) {
      issues.push({ kind: 'no-files', severity: 'warn', text: 'No declared path and no linked file; implementation cannot be located' });
    }
    for (const symbol of counted.filter(entry => !entry.found)) {
      issues.push({ kind: 'symbol-missing', severity: 'warn', text: 'Symbol named in the plan was not found as a declaration: ' + symbol.name });
    }
    for (const test of tests) {
      if (test.state === 'missing') issues.push({ kind: 'test-missing', severity: done ? 'error' : 'warn', text: 'Test file does not exist' + hint(test.path), path: test.path });
      else if (test.state === 'failed' || test.state === 'error') issues.push({ kind: 'test-failed', severity: 'error', text: 'Test run failed (' + (test.failed || 0) + ' failed)', path: test.path });
      else if (test.state === 'env') issues.push({ kind: 'test-env', severity: 'warn', text: 'Test could not run: required environment is unavailable', path: test.path });
      else if (test.state === 'empty') issues.push({ kind: 'test-empty', severity: 'warn', text: 'Test file ran zero test cases', path: test.path });
      else if (test.state === 'unrun') issues.push({ kind: 'test-unrun', severity: 'warn', text: 'No recorded test run', path: test.path });
      else if (test.state === 'stale') issues.push({ kind: 'test-stale', severity: 'warn', text: 'Recorded run is older than a related file change', path: test.path });
      else if (test.state === 'manual') issues.push({ kind: 'test-manual', severity: 'info', text: 'Not runnable by Vitest (' + test.runner + ')', path: test.path });
    }
    if (!tests.length && !ignoreIssues.has('no-test')) issues.push({ kind: 'no-test', severity: 'warn', text: 'No test declared or linked for this task' });
    for (const item2 of tsc) {
      if (item2.state === 'errors' || item2.state === 'error') {
        for (const diag of item2.diagnostics) issues.push({ kind: 'tsc-error', severity: 'error', text: diag.code + ': ' + diag.message, path: diag.file, line: diag.line });
        if (item2.state === 'error') issues.push({ kind: 'tsc-error', severity: 'error', text: 'tsc did not complete for ' + item2.config, path: item2.config });
      } else if (item2.state === 'unrun') issues.push({ kind: 'tsc-unrun', severity: 'warn', text: 'No recorded tsc run for ' + item2.config, path: item2.config });
      else if (item2.state === 'stale') issues.push({ kind: 'tsc-stale', severity: 'warn', text: 'Recorded tsc run is older than a package change', path: item2.config });
    }

    const excluded = EXCLUDED_STATUS.has(item.status);
    const hardFail = issues.some(issue => issue.severity === 'error');
    let color;
    if (excluded) color = 'muted';
    else if (hardFail) color = 'red';
    else if (percent === 100 && !issues.some(issue => issue.severity === 'warn')) color = 'green';
    else if (item.status === 'BLOCKED') color = 'blue';
    else if (percent === 0) color = 'grey';
    else color = 'yellow';
    const defect = !excluded && (hardFail || (done && color !== 'green'));
    const claim = excluded ? 'excluded' : done && color === 'green' ? 'verified' : done ? 'done-unproven' : color === 'green' ? 'ahead-of-registry' : 'pending';

    tasks[item.id] = {
      id: item.id, phase: item.id.slice(0, 3), title: summarizeTitle(item.description), description: item.description,
      expected: plan['Expected Outcome'] || '', review: plan['Review Checkpoint'] || '', spec: item.spec || plan['Spec Reference'] || '',
      status: item.status, statusNote: item.statusNote, source: item.source,
      definitions: defs.map(def => ({ path: PLAN_REL + def.source, line: def.line }))
        .concat(item.registryLine ? [{ path: PLAN_REL + FILES.registry, line: item.registryLine }] : [])
        .concat(supplementDefinition(item.id, supplementLines)),
      prerequisites: item.prerequisites, dependents: [],
      files: fileList, symbols, tests, tsc, deps: { imports, external: [...external].sort() },
      clues: clue ? clue.commits : [], defects: clue ? clue.defects : [], scores, percent, color, defect, claim, issues, gapIds: [], findingIds: [],
      override: override.note || ''
    };
  }

  // Add phase defects to tasks
  for (const [phaseId, defects] of Object.entries(phaseDefects)) {
    for (const d of defects) {
      if (tasks[d.taskId]) {
        tasks[d.taskId].defects = [...(tasks[d.taskId].defects || []), { type: d.type, text: d.text, phase: phaseId }];
      }
    }
  }

  for (const task of Object.values(tasks)) {
    for (const pre of task.prerequisites) if (tasks[pre]) tasks[pre].dependents.push(task.id);
  }
  for (const gap of gaps) for (const id of gap.tasks) if (tasks[id]) tasks[id].gapIds.push(gap.id);

  // Machine-derived findings from recorded tsc and test runs
  const findings = [];
  for (const [config, record] of Object.entries(evidence.tsc)) {
    const pkg = config.split('/')[1];
    const fresh = !(record.at < (index.packageMtime.get(pkg) || 0));
    for (const diag of record.diagnostics || []) {
      findings.push({ id: 'tsc:' + diag.file + ':' + diag.line + ':' + diag.col + ':' + diag.code, kind: 'tsc', file: diag.file, line: diag.line, text: diag.code + ' ' + diag.message, at: record.at, fresh });
    }
  }
  for (const [file, record] of Object.entries(evidence.tests)) {
    const info = index.files.get(file);
    const fresh = info ? record.at >= info.mtime : false;
    if (record.status === 'failed' || record.status === 'env' || record.status === 'error') {
      const list = record.failures && record.failures.length ? record.failures : [{ name: '(suite)', message: record.note || '' }];
      for (const failure of list) {
        findings.push({ id: 'test:' + file + ':' + failure.name, kind: record.status === 'env' ? 'test-env' : 'test', file, line: null, text: failure.name + ' - ' + String(failure.message || '').split(/\r?\n/)[0].slice(0, 240), at: record.at, fresh });
      }
    }
  }
  for (const finding of findings) {
    finding.tasks = Object.values(tasks).filter(task => task.files.some(file => file.path === finding.file)).map(task => task.id);
    for (const id of finding.tasks) tasks[id].findingIds.push(finding.id);
  }

  const order = Object.keys(tasks).sort();
  
  // Compute phase statistics for dashboard
  const phaseStats = computePhaseStats(tasks, PHASES);
  
  return {
    generatedAt: new Date().toISOString(), root: ROOT, phases: PHASES, order, tasks, gaps, findings,
    evidenceAt: { tests: Object.values(evidence.tests).reduce((max, record) => Math.max(max, record.at || 0), 0), tsc: Object.values(evidence.tsc).reduce((max, record) => Math.max(max, record.at || 0), 0) },
    weights: WEIGHTS,
    phaseStats
  };
}

function supplementDefinition(id, lines) {
  const key = /^P\d{2}-((?:RBAC|REG)-M\d+)$/.exec(id);
  if (!key) return [];
  const index = lines.findIndex(line => line.includes('`' + key[1] + '`'));
  return index < 0 ? [] : [{ path: PLAN_REL + FILES.supplement, line: index + 1 }];
}

let lastHash = '';
function write(data) {
  const body = JSON.stringify({ ...data, generatedAt: '' });
  const hash = crypto.createHash('sha1').update(body).digest('hex');
  if (hash === lastHash && fs.existsSync(OUTPUT)) return false;
  lastHash = hash;
  const text = 'window.OTOMIX_BOOK = ' + JSON.stringify(data).replace(/</g, '\\u003c') + ';\n';
  fs.writeFileSync(OUTPUT, text);
  return true;
}

function run() {
  const started = Date.now();
  const data = build();
  const changed = write(data);
  const counts = {};
  for (const task of Object.values(data.tasks)) counts[task.color] = (counts[task.color] || 0) + 1;
  console.log('[' + new Date().toLocaleTimeString('en-GB') + '] ' + (changed ? 'updated' : 'unchanged') + ' - ' + data.order.length + ' tasks, ' +
    JSON.stringify(counts) + ', ' + data.gaps.length + ' gaps, ' + data.findings.length + ' findings (' + (Date.now() - started) + ' ms)');
  return data;
}

function watch() {
  run();
  let timer = null;
  const ignored = /(^|[\\/])(node_modules|dist|coverage|\.git|\.turbo)([\\/]|$)/;
  const trigger = (_event, name) => {
    if (!name || ignored.test(String(name)) || /book-data\.js$/.test(String(name))) return;
    clearTimeout(timer);
    timer = setTimeout(() => { try { run(); } catch (error) { console.error('Rebuild failed: ' + error.message); } }, 700);
  };
  const targets = [...CODE_DIRS.map(dir => path.join(ROOT, dir)), PLAN_DIR, path.join(BOOK, 'clues')].filter(fs.existsSync);
  for (const target of targets) {
    try { fs.watch(target, { recursive: true }, trigger); } catch (error) { console.error('Cannot watch ' + target + ': ' + error.message); }
  }
  for (const file of [EVIDENCE, OVERRIDES, ROOT]) {
    if (fs.existsSync(file)) {
      try { fs.watch(file, { recursive: false }, (event, name) => { if (file === ROOT && !/\.(?:ts|json|js|cjs|mjs)$/.test(String(name))) return; trigger(event, name || path.basename(file)); }); } catch (error) { /* best effort */ }
    }
  }
  console.log('Watching ' + targets.length + ' folders. Press Ctrl+C to stop.');
}

if (require.main === module) {
  if (process.argv.includes('--watch')) watch();
  else run();
}

module.exports = { build, write, run, ROOT, EVIDENCE, TEST_FILE };
