// OTOMIX 5.8; 2.5 - Mother 1; Add. 3 - GAP-017; GAP-025
// DLQ message shape for otomix.dlq.

export interface DlqMessage {
  job_id: string;
  reason: string;
  trace_id: string;
  attempts: number;
  parked_at: string;
  payload: string;
}

export const DLQ_STREAM = 'otomix.dlq';
export const DLQ_CONSUMER_GROUP = 'dlq-processor';