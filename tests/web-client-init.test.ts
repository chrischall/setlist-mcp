import { describe, it, expect, vi } from 'vitest';

// In a runtime without `import.meta.url` (a sandboxed/Workers host),
// `fileURLToPath(undefined)` throws at module init. client.ts guards its .env
// bootstrap against that; web-client.ts must too, or the attendance tools'
// static import takes the whole server down with it.
vi.mock('url', async (importOriginal) => {
  const real = await importOriginal<typeof import('url')>();
  return {
    ...real,
    fileURLToPath: () => {
      throw new TypeError('The "path" argument must be of type string or an instance of URL. Received undefined');
    },
  };
});

describe('web-client module init', () => {
  it('loads even when fileURLToPath throws (no import.meta.url)', async () => {
    const mod = await import('../src/web-client.js');
    expect(mod.webClient).toBeDefined();
  });
});
