// Side-effect-free error types, importable by transport-neutral modules
// (tools/*) without pulling in client.ts's .env bootstrap or env singleton.

/**
 * The deferred "no API key" configuration error. A distinct class so a caller
 * can tell it apart from a per-request failure — e.g. the batch resolver fails
 * fast on it instead of recording the same error against every concert.
 */
export class SetlistConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SetlistConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
