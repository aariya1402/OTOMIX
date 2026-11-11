/**
 * A lock-free Single Producer Single Consumer (SPSC) Ring Buffer.
 * Uses SharedArrayBuffer and Atomics for safe cross-thread communication.
 * 
 * Rule 23: Zero allocation during push/pop. Pre-allocated in constructor.
 * Used as a safety layer for real-time parameter updates between UI and AudioWorklet.
 */
export class SpscRingBuffer {
  private data: Float32Array;
  private control: Int32Array; // [0] = writeIndex, [1] = readIndex
  private capacity: number;

  constructor(capacity: number) {
    if (capacity <= 1) throw new RangeError('Capacity must be > 1');
    this.capacity = capacity;
    
    // Allocate SharedArrayBuffer: (capacity * 4 bytes) + (2 int32 * 4 bytes)
    const sab = new SharedArrayBuffer((capacity * 4) + (2 * 4));
    this.data = new Float32Array(sab, 0, capacity);
    this.control = new Int32Array(sab, capacity * 4, 2);
  }

  /**
   * Pushes a value into the buffer. (Called by Producer/UI Thread)
   * @param value - The float value to push.
   * @returns true if successful, false if the buffer is full.
   */
  public push(value: number): boolean {
    const writeIndex = Atomics.load(this.control, 0);
    const readIndex = Atomics.load(this.control, 1);
    
    const nextWrite = (writeIndex + 1) % this.capacity;
    if (nextWrite === readIndex) {
      return false; // Buffer is full
    }

    this.data[writeIndex] = value;
    Atomics.store(this.control, 0, nextWrite);
    return true;
  }

  /**
   * Pops a value from the buffer. (Called by Consumer/Audio Thread)
   * @returns The float value, or undefined if empty.
   */
  public pop(): number | undefined {
    const writeIndex = Atomics.load(this.control, 0);
    const readIndex = Atomics.load(this.control, 1);

    if (writeIndex === readIndex) {
      return undefined; // Buffer is empty
    }

    const value = this.data[readIndex];
    Atomics.store(this.control, 1, (readIndex + 1) % this.capacity);
    return value;
  }

  /**
   * Checks if the buffer is empty.
   */
  public isEmpty(): boolean {
    return Atomics.load(this.control, 0) === Atomics.load(this.control, 1);
  }
}