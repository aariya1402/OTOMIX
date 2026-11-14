// OTOMIX 3.7; 3.11 - Mother 2.7; 3.6
// Generates linearRampToValueAtTime automation for both tracks.

export interface AudioParamAutomation {
  target: number;
  startTime: number;
  endTime: number;
  curve: 'linear' | 'exponential';
}

export interface GlideAutomationResult {
  outTrack: AudioParamAutomation[];
  inTrack: AudioParamAutomation[];
}

export function generateGlideAutomation(
  startTime: number,
  windowSeconds: number,
  outRateStart: number,
  outRateEnd: number,
  inRateStart: number,
  inRateEnd: number,
): GlideAutomationResult {
  const endTime = startTime + windowSeconds;
  
  return {
    outTrack: [
      { target: outRateEnd, startTime, endTime, curve: 'linear' }
    ],
    inTrack: [
      { target: inRateEnd, startTime, endTime, curve: 'linear' }
    ],
  };
}