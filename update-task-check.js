const fs = require('fs');
const backup = fs.readFileSync('Docs/ArchitectureBook/task-check.cjs.backup', 'utf8');

const newHeader = `const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const scan = require('./scan.cjs');

const ROOT = scan.ROOT;
const ENV_FAILURE = /docker|container runtime|testcontainers|ECONNREFUSED|could not find a working container/i;
const MINUTE = 60 * 1000;
const UI_ROOT = path.join(ROOT, 'packages', 'ui');
const SHARED_ROOT = path.join(ROOT, 'packages', 'shared');

// UI-UX Phase specific constants
const UI_PATTERNS = {
  COMPONENT_FILE: /\.(tsx|jsx)$/,
  COMPONENT_TEST: /\.spec\.(tsx|jsx)$/,
  COMPONENT_STORY: /\.stories\.(tsx|jsx)$/,
  BARREL_EXPORT: /^index\.ts$/,
  PAGE_DIRECTORY: /^pages\\\//,
  COMPONENT_DIRECTORY: /^components\\\//,
  HOOKS_DIRECTORY: /^hooks\\\//,
  STORE_DIRECTORY: /^stores\\\//,
  SERVICE_DIRECTORY: /^services\\\//,
  DEEP_IMPORT: /@modules\\\/[^\\\/]+\\\/(!index\.ts)/,
  RELATIVE_DEEP_IMPORT: /\.\.\/.*\.\.\/.*\.\.\//,
  DIRECT_STATE_MUTATION: /\.dispatch\(|useReducer\(|useState\(/,
  SERVER_STATE_IN_STORE: /useQuery\(|useMutation\(|useSWR\(/,
  ARIA_ATTRIBUTES: /aria-[a-z-]+/,
  ROLE_ATTRIBUTE: /role=/,
  ALT_TEXT: /alt=/,
  LABEL_ASSOCIATION: /htmlFor=|id=/,
  SEMANTIC_HTML: /<(header|footer|main|nav|section|article|aside|button|label|input|select|textarea)\b/,
  TAILWIND_CLASSES: /className=["']([^"']*\b(?:flex|grid|gap|p-|m-|w-|h-|text-|bg-|border-|rounded|shadow|hover:|focus:|dark:))[^"']*["']/,
  CSS_MODULES: /\.module\.(css|scss|sass)$/,
  STYLED_COMPONENTS: /styled\.|css/,
  ZUSTAND_STORE: /create\(.*\)\s*=>\s*{/,
  REDUX_SLICE: /createSlice\(/,
  REACT_QUERY: /useQuery\(|useMutation\(/,
  SWR: /useSWR\(/,
  API_CLIENT: /fetch\(|axios\.|ky\(/,
  TYPED_API: /interface.*Request|interface.*Response|type.*Request|type.*Response/,
  COMPONENT_PROPS_INTERFACE: /interface.*Props|type.*Props/,
  FORWARD_REF: /forwardRef\(/,
  MEMO: /React\.memo\(|memo\(/,
  LAZY_LOAD: /React\.lazy\(|lazy\(/,
  SUSPENSE: /<Suspense/,
  MEMOIZATION: /useMemo\(|useCallback\(/,
};

const UI_TASK_PATTERNS = [
  'P07-REG-M06',
  'P08-T01-S01-M01',
  'P08-T01-S01-M02',
  'P08-T01-S02-M01',
  'P08-T01-S02-M02',
  'P08-T02-S01-M01',
  'P08-T02-S01-M02',
  'P08-T03-S01-M01',
  'P08-T03-S01-M02',
  'P08-T04-S01-M01',
  'P08-T04-S01-M02',
  'P08-T05-S01-M01',
  'P09-T01-S01-M01',
  'P09-T01-S01-M02',
  'P09-T02-S01-M01',
  'P09-T02-S01-M02',
];

function loadEvidence() { try { return JSON.parse(fs.readFileSync(scan.EVIDENCE, 'utf8')); } catch (error) { return { tests: {}, tsc: {}, ui: {}, a11y: {}, bundle: {} }; } }
function saveEvidence(evidence) { fs.writeFileSync(scan.EVIDENCE, JSON.stringify(evidence, null, 1) + '\n'); }
function say(text) { process.stdout.write(text + '\n'); }
`;

const newContent = backup.replace(/const fs = require\('fs'\);/, newHeader);

fs.writeFileSync('Docs/ArchitectureBook/task-check.cjs', newContent);
console.log('Updated task-check.cjs');