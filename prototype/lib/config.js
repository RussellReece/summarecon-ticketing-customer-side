// Local API proxy base.
// In the browser, calling relative "/api" guarantees same-origin ('self') compliance,
// preventing CSP blocks and CORS preflight errors.
export const API_BASE_URL = "/api";
export const HOLD_MINUTES = 10;
export const PAYMENT_PENDING_MINUTES = 15;
export const MAX_TICKETS_PER_ORDER = 4;
export const SEED_VERSION = 1;
