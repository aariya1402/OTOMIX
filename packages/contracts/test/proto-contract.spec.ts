import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Protobuf Contract (P01-T04-S01-M01)', () => {
  it('contains required messages and field numbers', () => {
    const protoPath = path.resolve(__dirname, '..', '..', '..', 'proto', 'core', 'v1', 'core.proto');
    const content = fs.readFileSync(protoPath, 'utf-8');
    
    expect(content).toContain('message AnalyzeAudioRequest');
    expect(content).toContain('message AnalyzeAudioResponse');
    expect(content).toContain('message TransitionPlanRequest');
    expect(content).toContain('message ExecutionFallback');
    
    // Verify field numbers from §9.2
    expect(content).toMatch(/string idempotency_key\s*=\s*6;/);
  });
});