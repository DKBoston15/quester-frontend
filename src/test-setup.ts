import { vi } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_API_BASE_URL: 'http://localhost:3333',
}));

// Mock import.meta.env
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:3333',
      },
    },
  },
});

// Mock fetch globally if not available
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn();
}

// Mock AbortController
if (!globalThis.AbortController) {
  globalThis.AbortController = class {
    signal = { aborted: false };
    abort() {
      this.signal.aborted = true;
    }
  } as any;
}

// Mock TextDecoder
if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = class {
    decode(input?: BufferSource) {
      return new Uint8Array(input as ArrayBuffer).toString();
    }
  } as any;
}