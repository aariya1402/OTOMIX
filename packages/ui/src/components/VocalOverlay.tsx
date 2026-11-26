import React, { useId } from 'react';

export const VOCAL_OVERLAY_THRESHOLD = 0.65;

export interface VocalOverlayFrame {
  /** Frame timestamp in seconds. */
  readonly t: number;
  /** Vocal probability for this frame. */
  readonly p: number;
  /** Binarized vocal-map value from the Feature Registry. */
  readonly v: 0 | 1;
}

export interface VocalZone {
  readonly start: number;
  readonly end: number;
}

export function getVocalZones(frames: readonly VocalOverlayFrame[], duration: number): VocalZone[] {
  if (!Number.isFinite(duration) || duration <= 0 || frames.length === 0) return [];
  if (
    frames.some(
      ({ t, p, v }) =>
        !Number.isFinite(t) ||
        !Number.isFinite(p) ||
        t < 0 ||
        p < 0 ||
        p > 1 ||
        (v !== 0 && v !== 1)
    )
  ) {
    return [];
  }

  const orderedFrames = [...frames].sort((a, b) => a.t - b.t);
  const zones: VocalZone[] = [];

  orderedFrames.forEach((frame, index) => {
    const start = Math.min(frame.t, duration);
    const end = Math.min(orderedFrames[index + 1]?.t ?? duration, duration);
    if (frame.v <= VOCAL_OVERLAY_THRESHOLD || end <= start) return;

    const previous = zones[zones.length - 1];
    if (previous && previous.end === start) {
      zones[zones.length - 1] = { start: previous.start, end };
    } else {
      zones.push({ start, end });
    }
  });

  return zones;
}

export interface VocalOverlayProps {
  readonly frames: readonly VocalOverlayFrame[];
  /** Duration of the waveform in seconds. */
  readonly duration: number;
}

export function VocalOverlay({ frames, duration }: VocalOverlayProps): React.ReactElement {
  const patternId = `vocal-stripes-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const zones = getVocalZones(frames, duration);

  return (
    <svg
      className="vocal-overlay"
      data-testid="vocal-overlay"
      aria-hidden="true"
      viewBox={`0 0 ${duration > 0 ? duration : 1} 1`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="rgba(220, 38, 38, 0.18)" />
          <path d="M-2 2 2-2M0 8 8 0M6 10 10 6" stroke="#dc2626" strokeWidth="2" />
        </pattern>
      </defs>
      {zones.map((zone) => (
        <rect
          key={`${zone.start}-${zone.end}`}
          data-testid="vocal-zone"
          data-start={zone.start}
          data-end={zone.end}
          x={zone.start}
          y="0"
          width={zone.end - zone.start}
          height="1"
          fill={`url(#${patternId})`}
        />
      ))}
    </svg>
  );
}
