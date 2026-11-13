// OTOMIX §5.2 · Mother §1
import { describe, it, expect } from 'vitest';
import { isWithinRoot } from '../../src/ingest/confine';

describe('isWithinRoot (pure)', () => {
  it('identical paths -> true', () => {
    expect(isWithinRoot('/tmp/root', '/tmp/root')).toBe(true);
  });
  it('nested path -> true', () => {
    expect(isWithinRoot('/tmp/root/subdir/file.wav', '/tmp/root')).toBe(true);
  });
  it('sibling path -> false', () => {
    expect(isWithinRoot('/tmp/root2/file.wav', '/tmp/root')).toBe(false);
  });
  it('parent path -> false', () => {
    expect(isWithinRoot('/tmp', '/tmp/root')).toBe(false);
  });
  it('trailing separator tolerated', () => {
    expect(isWithinRoot('/tmp/root/', '/tmp/root')).toBe(true);
  });
  it('backslashes normalised', () => {
    expect(isWithinRoot('C:\\root\\sub\\file.wav', 'C:\\root')).toBe(true);
    expect(isWithinRoot('C:\\root2\\file.wav', 'C:\\root')).toBe(false);
  });
  it('empty args -> false', () => {
    expect(isWithinRoot('', '/tmp/root')).toBe(false);
    expect(isWithinRoot('/tmp/root', '')).toBe(false);
  });
});