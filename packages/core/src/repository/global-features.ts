export interface GlobalFeatureRecord {
  readonly contentSha256: string;
  readonly raw_analysis_data: Record<string, unknown>;
  readonly analysisVersion: string;
}
