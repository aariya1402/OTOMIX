export class AllocatingProcessor {
  public process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0][0];
    const input = inputs[0][0];
    
    if (output && input) {
      output.set(input);
    }

    // DELIBERATE ALLOCATION (should be caught by the audit)
    const leak = new Float32Array(128);
    if (leak[0] === 1.0) {
      return false; // Just to use the variable and prevent tree-shaking
    }

    return true;
  }
}