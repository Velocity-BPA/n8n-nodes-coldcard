/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

// Global test setup for n8n-nodes-coldcard

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console.warn to prevent license notice spam in tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]): void => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('Velocity BPA Licensing Notice')) {
    return; // Suppress license notices in tests
  }
  originalWarn.apply(console, args);
};

// Global beforeAll hook
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
});

// Global afterAll hook
afterAll(() => {
  // Cleanup
});

// Export for TypeScript
export {};
