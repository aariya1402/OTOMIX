import { describe, it, expect } from 'vitest';
import { MockDspDriver } from '../src/dsp/mock-driver';
import type { AudioParamAutomation } from '../src/dsp/port';
import type { DspEngineConfig } from '../src/config/transition-config';
import type { TransitionPlan } from '../src/transition/types';

describe('MockDspDriver', () => {
  const mockConfig: DspEngineConfig = {
    adminConfig: { chopGrid: 16, crossfadeBeats: 0.015625, rateMin: 0.98, rateMax: 1.02, swingThreshold: 0.05 },
    userConfig: { entryBeat: 0, exitBeat: 64, transitionWindowBars: 16, bpmTolerance: 0.1, targetEnergy: 0.7, profileId: 'default' },
    transitionProfile: {
      id: 'default',
      name: 'Default Profile',
      windowBars: 16,
      bpmCurve: 'cosine',
      eqProfile: {
        low: { frequency: 100, gainDb: 0, q: 0.7 },
        mid: { frequency: 1000, gainDb: 0, q: 0.7 },
        high: { frequency: 10000, gainDb: 0, q: 0.7 }
      },
      effects: []
    }
  };

  const mockPlan: TransitionPlan = {
    rung: 'RUNG_STANDARD_CROSSFADE', reason: 'test', tInSeconds: 0, tOutSeconds: 10,
    inBeatIndex: 0, outBeatIndex: 64, alignToSeconds: 0, mappedBpm: 120
  };

  const mockAutomations: AudioParamAutomation[] = [
    { paramId: 'gain', targetValue: 0.8, time: 10, curve: 'linear' },
    { paramId: 'rate', targetValue: 1.0, time: 20, curve: 'exponential' }
  ];

  it('initializes with a DspEngineConfig', () => {
    const driver = new MockDspDriver();
    driver.initialize(mockConfig);
    expect(driver.isStarted()).toBe(false);
  });

  it('start() and stop() toggle state', () => {
    const driver = new MockDspDriver();
    driver.start();
    expect(driver.isStarted()).toBe(true);
    driver.stop();
    expect(driver.isStarted()).toBe(false);
  });

  it('scheduleTransition records the TransitionPlan and automations', () => {
    const driver = new MockDspDriver();
    driver.scheduleTransition(mockPlan, mockAutomations);
    
    expect(driver.getScheduledTransitions()).toHaveLength(1);
    expect(driver.getScheduledTransitions()[0].plan).toBe(mockPlan);
    expect(driver.getPendingAutomations()).toHaveLength(2);
    expect(driver.getPendingAutomations()[0].paramId).toBe('gain');
  });

  it('flush() commits pending automations to the log', () => {
    const driver = new MockDspDriver();
    driver.scheduleTransition(mockPlan, mockAutomations);
    driver.flush();
    
    expect(driver.getPendingAutomations()).toHaveLength(0);
    expect(driver.getAutomationLog()).toHaveLength(2);
    expect(driver.getAutomationLog()[1].paramId).toBe('rate');
  });

  it('process() passes buffer through sample-for-sample', () => {
    const driver = new MockDspDriver();
    const input = [new Float32Array([0.1, 0.2, 0.3])];
    const output = [new Float32Array(3).fill(0)];
    
    driver.process([input], [output], 0);
    
    expect(output[0][0]).toBeCloseTo(0.1, 5);
    expect(output[0][1]).toBeCloseTo(0.2, 5);
    expect(output[0][2]).toBeCloseTo(0.3, 5);
  });

  it('bypass=true skips transition logic (passthrough)', () => {
    const driver = new MockDspDriver();
    driver.bypass = true;
    driver.scheduleTransition(mockPlan, mockAutomations);
    
    const input = [new Float32Array([0.5, 0.5])];
    const output = [new Float32Array(2).fill(0)];
    
    driver.process([input], [output], 32); // Inside transition window
    
    // Still passes through because of bypass flag
    expect(output[0][0]).toBe(0.5);
  });

  it('never touches a real AudioContext (headless-safe)', () => {
    // Just verifying that the module executes without throwing ReferenceError
    expect(typeof AudioContext).toBe('undefined');
    const driver = new MockDspDriver();
    expect(driver).toBeDefined();
  });
});