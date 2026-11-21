export interface PreKickOverlayProps {
  readonly preKickBeats: number;
  readonly beatsPerWidth?: number;
  readonly height?: number;
  readonly patternId?: string;
}

export function PreKickOverlay({
  preKickBeats,
  beatsPerWidth = 64,
  height = 120,
  patternId = 'prekick-warning',
}: PreKickOverlayProps) {
  if (preKickBeats <= 0) return <svg aria-label="No pre-kick warning" />;

  const width = Math.max(1, preKickBeats / beatsPerWidth * 1000);
  return (
    <svg aria-label="Pre-kick warning" width={width} height={height}>
      <defs>
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#f59e0b" />
          <path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#111" strokeWidth="1" />
        </pattern>
      </defs>
      <rect data-testid="prekick-overlay" x={0} y={0} width={width} height={height} fill={`url(#${patternId})`} />
    </svg>
  );
}
