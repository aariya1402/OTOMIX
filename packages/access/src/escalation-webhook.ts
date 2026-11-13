// OTOMIX §7.1; §6.5

export interface EscalationPayload {
  actor: string;
  scope: string;
  tenant: string;
  timestamp: string;
}

export interface EscalationWebhookConfig {
  url: string;
  maxRetries?: number;
  baseDelayMillis?: number;
  capDelayMillis?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_CONFIG = Object.freeze({
  maxRetries: 3,
  baseDelayMillis: 200,
  capDelayMillis: 5000,
});

function sleepMillis(millis: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, millis);
  });
}

function jitteredBackoff(attempt: number, base: number, cap: number): number {
  const exponential = base * Math.pow(2, attempt);
  const capped = Math.min(exponential, cap);
  return Math.random() * capped;
}

export async function sendEscalationWebhook(
  payload: EscalationPayload,
  config: EscalationWebhookConfig,
): Promise<void> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const maxRetries = config.maxRetries ?? DEFAULT_CONFIG.maxRetries;
  const base = config.baseDelayMillis ?? DEFAULT_CONFIG.baseDelayMillis;
  const cap = config.capDelayMillis ?? DEFAULT_CONFIG.capDelayMillis;

  const body = JSON.stringify({
    text:
      'Escalation: actor=' + payload.actor +
      ' scope=' + payload.scope +
      ' tenant=' + payload.tenant +
      ' at ' + payload.timestamp,
    actor: payload.actor,
    scope: payload.scope,
    tenant: payload.tenant,
    timestamp: payload.timestamp,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response | null = null;

    try {
      response = await fetchImpl(config.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body,
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleepMillis(jitteredBackoff(attempt, base, cap));
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      return;
    }

    if (response.status >= 400 && response.status < 500) {
      throw new Error('Escalation webhook returned client error ' + response.status);
    }

    lastError = new Error('Escalation webhook returned server error ' + response.status);
    if (attempt < maxRetries) {
      await sleepMillis(jitteredBackoff(attempt, base, cap));
      continue;
    }
  }

  throw lastError ?? new Error('Escalation webhook failed');
}