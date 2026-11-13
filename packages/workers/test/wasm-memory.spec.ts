import { describe, it, expect } from 'vitest';
import {
  createAnalysisMemory,
  isMemoryWithinLimit,
  WASM_PAGE_BYTES,
  MAX_WASM_PAGES,
} from '../src/wasm-memory';

describe('WASM memory cap (P06-T05-S01-M02)', () => {
  it('(a) MAX_WASM_PAGES = 8192 and initial memory is 1 page', () => {
    expect(MAX_WASM_PAGES).toBe(8192);
    const mem = createAnalysisMemory();
    expect(mem.buffer.byteLength / WASM_PAGE_BYTES).toBe(1);
    expect(isMemoryWithinLimit(mem)).toBe(true);
  });

  it('(b) grow up to max succeeds', () => {
    const mem = createAnalysisMemory();
    const prev = mem.grow(MAX_WASM_PAGES - 1);
    expect(prev).toBe(1);
    expect(mem.buffer.byteLength / WASM_PAGE_BYTES).toBe(MAX_WASM_PAGES);
  });

  it('(c) grow beyond max fails (RangeError or -1)', () => {
    const mem = createAnalysisMemory();
    let result: number | null = null;
    let threw = false;
    try {
      result = mem.grow(MAX_WASM_PAGES);
    } catch (e) {
      threw = true;
      expect(e).toBeInstanceOf(RangeError);
    }
    if (!threw) {
      expect(result).toBe(-1);
    }
    expect(mem.buffer.byteLength / WASM_PAGE_BYTES).toBeLessThanOrEqual(MAX_WASM_PAGES);
  });

  it('(d) isMemoryWithinLimit boundary', () => {
    const mem = createAnalysisMemory();
    expect(isMemoryWithinLimit(mem)).toBe(true);
    mem.grow(MAX_WASM_PAGES - 1);
    expect(isMemoryWithinLimit(mem)).toBe(true);
  });
});