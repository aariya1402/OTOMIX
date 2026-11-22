import type { ServerResponse } from 'node:http';

export function sendInvalidArgument(res: ServerResponse, message: string): void {
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'INVALID_ARGUMENT', message }));
}
