export interface VocalOverlayProps {
  readonly vocalMap: readonly number[];
  readonly patternId?: string;
  readonly width?: number;
  readonly height?: number;
}

export function getVocalRegions(vocalMap: readonly number[], threshold = 0.65): Array<{ start: number; end: number }> {
  const regions: Array<{ start: number; end: number }> = [];
  let start: number | null = null;
  for (let index = 0; index < vocalMap.length; index++) {
    const value = vocalMap[index] ?? 0;
    if (value > threshold && start === null) start = index;
    if (value <= threshold && start !== null) {
      regions.push({ start, end: index });
      start = null;
    }
  }
  if (start !== null) regions.push({ start, end: vocalMap.length });
  return regions;
}

export function VocalOverlay({
  vocalMap,
  patternId = 'vocal-stripes',
  width = 1000,
  height = 120,
}: VocalOverlayProps) {
  const regions = getVocalRegions(vocalMap);
  if (regions.length === 0) return <svg aria-label="No vocal zones" width={width} height={height} />;
  const scale = vocalMap.length > 0 ? width / vocalMap.length : 1;
  return (
    <svg aria-label="Vocal zones" width={width} height={height}>
      <defs>
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#ef4444" />
          <path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#fff" strokeWidth="1" />
        </pattern>
      </defs>
      {regions.map((region, index) => (
        <rect
          key={`${region.start}-${region.end}`}
          data-testid={`vocal-zone-${index}`}
          x={region.start * scale}
          y={0}
          width={(region.end - region.start) * scale}
          height={height}
          fill={`url(#${patternId})`}
        />
      ))}
    </svg>
  );
}
