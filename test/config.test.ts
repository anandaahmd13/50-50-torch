import { describe, expect, it } from 'vitest';
import { flywheelRobinhoodManifest } from '../src/integrations/flywheel-robinhood.js';
import { assertVerifiedManifest, getIntegration } from '../src/integrations/registry.js';
import { loadConfig } from '../src/config.js';

describe('startup guardrails', () => {
  it('rejects a manifest selected for the wrong chain', () => {
    expect(() => assertVerifiedManifest(flywheelRobinhoodManifest, 56)).toThrow(/chainId 4663/);
  });

  it('rejects an unknown integration, missing ABI event, and invalid event mapping', () => {
    expect(() => getIntegration('unknown')).toThrow(/Unknown INTEGRATION_ID/);
    expect(() => assertVerifiedManifest({
      ...flywheelRobinhoodManifest,
      launch: { ...flywheelRobinhoodManifest.launch, abi: [] },
    }, 4663)).toThrow(/absent from its ABI/);
    expect(() => assertVerifiedManifest({
      ...flywheelRobinhoodManifest,
      launch: {
        ...flywheelRobinhoodManifest.launch,
        fieldNames: { ...flywheelRobinhoodManifest.launch.fieldNames, token: 'notAnEventField' },
      },
    }, 4663)).toThrow(/invalid token event mapping/);
  });

  it('requires Telegram credentials outside dry-run', () => {
    expect(() => loadConfig({ HTTP_RPC_URLS: 'https://rpc.example', DRY_RUN: 'false' })).toThrow(/TELEGRAM_BOT_TOKEN/);
  });
});
