import { beforeEach } from 'vitest';
import crypto from 'node:crypto';

// Setup crypto randomUUID for environments where it is missing in jsdom
if (typeof global.crypto === 'undefined') {
  Object.defineProperty(global, 'crypto', {
    value: crypto,
    writable: true,
  });
} else if (typeof global.crypto.randomUUID === 'undefined') {
  Object.defineProperty(global.crypto, 'randomUUID', {
    value: () => crypto.randomUUID(),
    writable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
});
