import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Vitest Coverage Configuration', () => {
  const configPath = resolve(__dirname, '../../vitest.config.ts');
  const configContent = readFileSync(configPath, 'utf-8');

  it('should have 90% branch threshold for packages/core/src/**/*.ts', () => {
    // Parse the config to find the thresholds
    const coreThresholdMatch = configContent.match(
      /packages[/\\]core[/\\]src[/\\]\*\*[/\\]\*\.ts.*?branches:\s*(\d+)/s
    );
    expect(coreThresholdMatch).not.toBeNull();
    expect(Number(coreThresholdMatch![1])).toBe(90);
  });

  it('should have 100% branch threshold for packages/access/src/**/*.ts', () => {
    const accessThresholdMatch = configContent.match(
      /packages[/\\]access[/\\]src[/\\]\*\*[/\\]\*\.ts.*?branches:\s*(\d+)/s
    );
    expect(accessThresholdMatch).not.toBeNull();
    expect(Number(accessThresholdMatch![1])).toBe(100);
  });

  it('should use v8 coverage provider', () => {
    expect(configContent).toContain("provider: 'v8'");
  });

  it('should include text, json, and html reporters', () => {
    expect(configContent).toContain("reporter: ['text', 'json', 'html']");
  });
});