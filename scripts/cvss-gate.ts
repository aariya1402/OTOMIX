import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface CvssFinding {
  cveId: string;
  cvssScore: number;
  packageName: string;
}

const CVSS_HALT_THRESHOLD = 7.0;

function loadFindings(reportPath: string): CvssFinding[] {
  if (!existsSync(reportPath)) {
    console.error(`[cvss-gate] Report file not found: ${reportPath}`);
    return [];
  }
  const raw = readFileSync(reportPath, 'utf-8');
  const parsed = JSON.parse(raw) as { findings?: CvssFinding[] };
  return parsed.findings ?? [];
}

export function evaluateGate(findings: CvssFinding[]): { exitCode: number; offending: CvssFinding[] } {
  const offending = findings.filter((finding) => finding.cvssScore >= CVSS_HALT_THRESHOLD);
  if (offending.length > 0) {
    console.error(`[cvss-gate] BLOCKED: ${offending.length} finding(s) at or above CVSS ${CVSS_HALT_THRESHOLD}`);
    for (const finding of offending) {
      console.error(`  - ${finding.cveId} (${finding.cvssScore}) in ${finding.packageName}`);
    }
    return { exitCode: 1, offending };
  }
  console.log(`[cvss-gate] PASS: no finding at or above CVSS ${CVSS_HALT_THRESHOLD}`);
  return { exitCode: 0, offending: [] };
}

if (require.main === module) {
  const reportPath = resolve(process.argv[2] ?? 'reports/snyk.json');
  const findings = loadFindings(reportPath);
  const { exitCode } = evaluateGate(findings);
  process.exit(exitCode);
}
