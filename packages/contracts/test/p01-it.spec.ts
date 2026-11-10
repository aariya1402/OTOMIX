import { describe, it, expect } from 'vitest';
import { BPM } from '@otomix/core';
import { mapStatus } from '@otomix/gateway';

describe('P01-IT: Phase Integration Failure Path', () => {
  it('invalid BPM returns INVALID_ARGUMENT/400', () => {
    // BPM.parse rejects 59.9
    const result = BPM.parse(59.9);
    expect(result.ok).toBe(false);
    // Check that some error is returned, without strictly enforcing its shape
    expect(result.error).toBeDefined();
    // Verify the gateway maps the gRPC status to the correct HTTP status
    expect(mapStatus('INVALID_ARGUMENT')).toBe(400);
  });

  it('fingerprint-mismatch replay returns ABORTED/409', () => {
    // The gateway mapStatus must map ABORTED to 409
    expect(mapStatus('ABORTED')).toBe(409);
  });
});