// OTOMIX §4.1; §4.2 · Mother §3.1; §3.2

export type SemVerGateResult =
  | { ok: true; action: 'ACCEPT' }
  | { ok: false; action: 'REJECT' | 'PURGE_AND_REANALYZE'; reason: string };

const ACCEPTED_MINOR = 2; // Only 1.2.x is accepted
const ACCEPTED_MAJOR = 1;

export function validateSchemaVersion(version: string): SemVerGateResult {
  // 1. Validate format: exactly major.minor.patch, all numeric, no leading zeros
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return { ok: false, action: 'REJECT', reason: 'MALFORMED_VERSION' };
  }
  const [, majorStr, minorStr, patchStr] = match;
  
  // Reject leading zeros (e.g., "01.2.0")
  if (majorStr.length > 1 && majorStr.startsWith('0')) {
    return { ok: false, action: 'REJECT', reason: 'MALFORMED_VERSION' };
  }
  if (minorStr.length > 1 && minorStr.startsWith('0')) {
    return { ok: false, action: 'REJECT', reason: 'MALFORMED_VERSION' };
  }
  if (patchStr.length > 1 && patchStr.startsWith('0')) {
    return { ok: false, action: 'REJECT', reason: 'MALFORMED_VERSION' };
  }

  const major = Number(majorStr);
  const minor = Number(minorStr);
  // patch is parsed but not used for gating logic

  // 2. Major version bump → PURGE_AND_REANALYZE
  if (major > ACCEPTED_MAJOR) {
    return { ok: false, action: 'PURGE_AND_REANALYZE', reason: `MAJOR_VERSION_BUMP_${major}` };
  }
  if (major < ACCEPTED_MAJOR) {
    return { ok: false, action: 'REJECT', reason: `UNSUPPORTED_MAJOR_${major}` };
  }

  // 3. Major === 1: check minor
  if (minor === ACCEPTED_MINOR) {
    return { ok: true, action: 'ACCEPT' };
  }
  if (minor < ACCEPTED_MINOR) {
    return { ok: false, action: 'REJECT', reason: `UNSUPPORTED_MINOR_${minor}` };
  }
  // minor > 2 (e.g., 1.3.0)
  return { ok: false, action: 'REJECT', reason: `UNSUPPORTED_MINOR_${minor}` };
}
