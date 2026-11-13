// OTOMIX §7.1; §7.11; §9.4; §9.10

export const KNOWN_SCOPES = [
  // §7.11: Audio DSP Admin
  'dsp:*',
  'audio:tuning',
  'mastering:*',
  // §7.11: Content & Licensing Admin
  'catalog:*',
  // §7.11: System Admin
  'sys:*',
  'users:*',
  'billing:*',
  // §7.11: End User
  'user:read',
  'local:process',
  // §9.10 [IMPL-PROPOSED]
  'publisher:manage',
  'store:purchase',
] as const;

export type KnownScope = typeof KNOWN_SCOPES[number];

export interface RouteScopeEntry {
  method: string;
  path: string;
  scopes: KnownScope[];
}

export const ROUTE_SCOPES: RouteScopeEntry[] = [
  // §9.10
  { method: 'POST',  path: '/api/v1/ingest/local',              scopes: ['local:process'] },
  { method: 'GET',   path: '/api/v1/catalog/features',          scopes: ['user:read'] },
  { method: 'POST',  path: '/api/v1/sets',                      scopes: ['local:process'] },
  { method: 'GET',   path: '/api/v1/sets',                      scopes: ['local:process'] },
  { method: 'POST',  path: '/api/v1/exports/xml',               scopes: ['local:process'] },
  { method: 'POST',  path: '/api/v1/publisher/sets',            scopes: ['publisher:manage'] },
  { method: 'GET',   path: '/api/v1/publisher/sets',            scopes: ['publisher:manage'] },
  { method: 'PATCH', path: '/api/v1/publisher/sets',            scopes: ['publisher:manage'] },
  { method: 'POST',  path: '/api/v1/publisher/landing-pages',   scopes: ['publisher:manage'] },
  { method: 'PATCH', path: '/api/v1/publisher/landing-pages',   scopes: ['publisher:manage'] },
  { method: 'POST',  path: '/api/v1/store/purchases',           scopes: ['store:purchase'] },
  { method: 'GET',   path: '/api/v1/store/downloads/{id}',      scopes: ['store:purchase'] },
  { method: 'PATCH', path: '/api/v1/dsp/parameters',            scopes: ['dsp:*', 'audio:tuning'] },
  { method: 'POST',  path: '/api/v1/takedowns',                 scopes: ['catalog:*'] },
  // §9.4
  { method: 'POST',  path: '/api/v1/analysis',                  scopes: ['local:process'] },
  { method: 'POST',  path: '/api/v1/mixplan',                   scopes: ['local:process'] },
];