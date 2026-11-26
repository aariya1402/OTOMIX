import React, { useId } from 'react';
import { getPreKickTime, type PreKickSegment } from '@otomix/core';

export interface PreKickZone {
  /** Start of the pre-kick segment in waveform seconds. */
  readonly start: number;
  /** End of the pre-kick segment in waveform seconds. */
  readonly end: number;
  /** Inclusive first negative beat index. */
  readonly startBeat: number;
  /** Exclusive ending beat index (zero is the kick downbeat). */
  readonly endBeat: number;
}

export function getPreKickZones(
  segments: readonly PreKickSegment[],
  duration: number,
  T0: number
): PreKickZone[] {
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(T0) ||
    segments.length === 0 ||
    segments.some(
      ({ startBeat, bpmSeed }, index) =>
        !Number.isInteger(startBeat) ||
        startBeat >= 0 ||
        !Number.isFinite(bpmSeed) ||
        bpmSeed <= 0 ||
        (index > 0 && startBeat <= segments[index - 1].startBeat)
    )
  ) {
    return [];
  }

  try {
    return segments.flatMap((segment, index) => {
      const endBeat = segments[index + 1]?.startBeat ?? 0;
      const segmentStart = getPreKickTime(segment.startBeat, segments, T0);
      const segmentEnd =
        endBeat === 0 ? T0 : getPreKickTime(endBeat, segments, T0);
      const start = Math.max(0, segmentStart);
      const end = Math.min(duration, segmentEnd);

      return end > start
        ? [{ start, end, startBeat: segment.startBeat, endBeat }]
        : [];
    });
  } catch {
    return [];
  }
}

export interface PreKickOverlayProps {
  readonly segments: readonly PreKickSegment[];
  /** Duration of the waveform in seconds. */
  readonly duration: number;
  /** Time of the kick downbeat in waveform seconds. */
  readonly T0: number;
}

export function PreKickOverlay({
  segments,
  duration,
  T0,
}: PreKickOverlayProps): React.ReactElement {
  const patternId = `pre-kick-stripes-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const zones = getPreKickZones(segments, duration, T0);

  return (
    <svg
      className="pre-kick-overlay"
      data-testid="pre-kick-overlay"
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
          <rect width="8" height="8" fill="rgba(245, 158, 11, 0.18)" />
          <path d="M-2 2 2-2M0 8 8 0M6 10 10 6" stroke="#f59e0b" strokeWidth="2" />
        </pattern>
      </defs>
      {zones.map((zone) => (
        <rect
          key={`${zone.startBeat}-${zone.endBeat}`}
          data-testid="pre-kick-zone"
          data-start={zone.start}
          data-end={zone.end}
          data-start-beat={zone.startBeat}
          data-end-beat={zone.endBeat}
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
