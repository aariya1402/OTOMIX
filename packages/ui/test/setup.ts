import { vi, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock ResizeObserver for jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock DragEvent for jsdom
class MockDragEvent extends Event {
  dataTransfer: DataTransfer | null;
  constructor(type: string, eventInitDict?: DragEventInit) {
    super(type, eventInitDict);
    this.dataTransfer = eventInitDict?.dataTransfer ?? null;
  }
}

global.DragEvent = MockDragEvent as any;
global.DataTransfer = class DataTransfer {
  private data: Map<string, string> = new Map();
  dropEffect: 'none' | 'copy' | 'link' | 'move' = 'none';
  effectAllowed: string = 'uninitialized';
  
  setData(format: string, data: string): void {
    this.data.set(format, data);
  }
  
  getData(format: string): string {
    return this.data.get(format) ?? '';
  }
  
  clearData(format?: string): void {
    if (format) {
      this.data.delete(format);
    } else {
      this.data.clear();
    }
  }
  
  setDragImage(): void {}
} as any;