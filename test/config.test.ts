import { describe, expect, it } from 'vitest';
import { assertVerifiedRegistry } from '../src/contracts/flywheel.js';
import { loadConfig } from '../src/config.js';

describe('startup guardrails', () => {
  it('rejects a non-Robinhood registry chain', () => {
    expect(() => assertVerifiedRegistry(56)).toThrow(/Robinhood Chain-only/);
  });

  it('requires Telegram credentials outside dry-run', () => {
    expect(() => loadConfig({ HTTP_RPC_URLS: 'https://rpc.example', DRY_RUN: 'false' })).toThrow(/TELEGRAM_BOT_TOKEN/);
  });
});
