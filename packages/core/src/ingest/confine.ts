// OTOMIX §5.2 · Mother §1 · GAP-014
// Pure path comparison. No node:path, no fs. Works in Node and browser.
// Both arguments are expected to be ALREADY resolved real paths (caller
// uses fs.realpathSync in the cloud wrapper).

function toSlashes(p: string): string {
  // Normalize both directions, collapse trailing separators (except root).
  const s = p.replace(/\\/g, '/');
  if (s === '/') return s;
  return s.replace(/\/+$/, '');
}

export function isWithinRoot(candidateRealPath: string, rootRealPath: string): boolean {
  if (!candidateRealPath || !rootRealPath) return false;
  const c = toSlashes(candidateRealPath);
  const r = toSlashes(rootRealPath);
  if (r === '') return false;
  if (c === r) return true;
  return c.startsWith(r + '/');
}