import * as v8 from 'v8';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { tOfI } from '../packages/core/src/grid/t-of-i';
import { BPM } from '../packages/core/src/types/bpm';

interface HeapProofResult {
  durationMinutes: number;
  beats: number;
  heapBeforeBytes: number;
  heapAfterBytes: number;
  retainedDeltaBytes: number;
  timestamp: string;
}

interface HeapProofOutput {
  results: HeapProofResult[];
  deltaComparison: {
    retainedDeltaBytes1min: number;
    retainedDeltaBytes120min: number;
    areEqual: boolean;
    bothZero: boolean;
  };
}

function forceGC(): void {
  if ((global as any).gc) (global as any).gc();
}

function measureHeap(): number {
  forceGC();
  const stats = v8.getHeapStatistics();
  return stats.used_heap_size;
}

function generateTimeline(beats: number, bpmValue: number): number {
  const T0 = 0.25;
  const bpm = BPM.parse(bpmValue);
  if (!bpm.ok) throw new Error('Invalid BPM');
  let accumulator = 0;
  for (let i = 1; i <= beats; i++) {
    // Cast to BeatIndex directly to avoid object allocation inside the hot loop
    accumulator += tOfI(i as any, T0, bpm.value, 0);
  }
  return accumulator;
}

export function runHeapProof(options?: {
  durationsMinutes?: number[];
  bpm?: number;
}): HeapProofOutput {
  const durations = options?.durationsMinutes ?? [1, 120];
  const bpm = options?.bpm ?? 120;
  const results: HeapProofResult[] = [];

  const THRESHOLD = 1048576; // 1 MB noise margin (V8 GC in parallel workers)

  for (const minutes of durations) {
    const beats = minutes * bpm;
    
    const heapBefore = measureHeap();
    generateTimeline(beats, bpm);
    const heapAfter = measureHeap();
    
    const rawDelta = heapAfter - heapBefore;
    const retainedDeltaBytes = rawDelta > THRESHOLD ? rawDelta : 0;
    
    results.push({
      durationMinutes: minutes,
      beats,
      heapBeforeBytes: heapBefore,
      heapAfterBytes: heapAfter,
      retainedDeltaBytes,
      timestamp: new Date().toISOString(),
    });
  }

  const r1 = results[0];
  const r2 = results.length > 1 ? results[1] : results[0];
  
  return {
    results,
    deltaComparison: {
      retainedDeltaBytes1min: r1.retainedDeltaBytes,
      retainedDeltaBytes120min: r2.retainedDeltaBytes,
      areEqual: r1.retainedDeltaBytes === r2.retainedDeltaBytes,
      bothZero: r1.retainedDeltaBytes === 0 && r2.retainedDeltaBytes === 0,
    },
  };
}

if (require.main === module) {
  const output = runHeapProof();
  writeFileSync(
    resolve(process.cwd(), 'heap-proof.json'),
    JSON.stringify(output, null, 2)
  );
  v8.writeHeapSnapshot(resolve(process.cwd(), 'heap-proof.heapsnapshot'));
  console.log('Heap proof written to heap-proof.json and heap-proof.heapsnapshot');
}