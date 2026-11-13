export const CSP_DEFAULTS = Object.freeze({
  scriptSrc: ["'self'"],
  workerSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  defaultSrc: ["'self'"],
} as const);