// OTOMIX §5.2 · Mother §1 · GAP-014
// Local confinement. In the browser, `File System Access API` guarantees
// that a FileSystemFileHandle obtained from a user-picked directory
// descends from that directory; the wrapper therefore validates the handle
// shape and documents the API guarantee. GAP-014: local implementation is
// independent of the cloud wrapper.

export interface HandleLike {
  readonly kind?: string;
  readonly name?: string;
}

export type ConfineWarnSink = (record: {
  event: string;
  outcome: string;
  durationMs: number;
  reason: 'INVALID_HANDLE';
  fileName: string;
}) => void;

export type LocalConfineResult =
  | { ok: true }
  | { ok: false; error: 'INVALID_ARGUMENT'; message: string };

export function confineForLocal(handle: HandleLike, warn?: ConfineWarnSink): LocalConfineResult {
  if (!handle || handle.kind !== 'file') {
    const record = {
      event: 'ingest.confine_rejected',
      outcome: 'failure',
      durationMs: 0,
      reason: 'INVALID_HANDLE' as const,
      fileName: handle?.name ?? 'unknown',
    };
    if (warn) { warn(record); }
    else if (typeof console !== 'undefined' && console.warn) { console.warn(record); }
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'handle is not a file handle' };
  }
  // API guarantee: the handle came from the user-picked directory.
  return { ok: true };
}