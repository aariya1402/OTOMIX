// P06-T06-S01-M01: cross-platform conftest runner.
// Runs the allow-list check against deploy/ and the deny-list check
// against policy/testdata/. If conftest is missing locally, prints a
// warning and exits 0 (CI installs conftest and always runs the check).

const { spawnSync } = require('node:child_process');

function hasConftest() {
  const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
  const res = spawnSync(cmd, ['conftest'], { stdio: 'ignore' });
  return res.status === 0;
}

function run(args) {
  const res = spawnSync('conftest', args, { stdio: 'inherit' });
  return typeof res.status === 'number' ? res.status : 1;
}

function main() {
  if (!hasConftest()) {
    console.log('WARNING: conftest not installed.');
    console.log('  Local install: winget install OPA.conftest');
    console.log('  CI runs the check automatically (.github/workflows/policy-check.yml)');
    console.log('Skipping local policy test.');
    process.exit(0);
  }

  console.log('==> conftest test --policy policy/ deploy/ (expect pass)');
  if (run(['test', '--policy', 'policy/', 'deploy/']) !== 0) {
    console.error('FAIL: allow-list test failed (deploy/ should have no plaintext Secret)');
    process.exit(1);
  }

  console.log('==> conftest test --policy policy/ policy/testdata/ (expect fail)');
  if (run(['test', '--policy', 'policy/', 'policy/testdata/']) === 0) {
    console.error('FAIL: deny-list test passed unexpectedly (plaintext Secret should be rejected)');
    process.exit(1);
  }

  console.log('PASS: allow-list accepted, deny-list rejected. Both correct.');
}

main();