import { describe, expect, it } from 'vitest';
import { torchRobinhoodManifest } from '../src/integrations/torch-robinhood.js';
import { assertVerifiedManifest, getIntegration } from '../src/integrations/registry.js';
import { loadConfig } from '../src/config.js';

describe('startup guardrails', () => {
  it('rejects manifest selected for wrong chain', () => {
    expect(() => assertVerifiedManifest(torchRobinhoodManifest, 56)).toThrow(/chainId 4663/);
  });

  it('rejects unknown integration, absent ABI event, invalid event mappings, and invalid split policy', () => {
    expect(() => getIntegration('flywheel-robinhood')).toThrow(/Unknown INTEGRATION_ID/);
    expect(() => assertVerifiedManifest({
      ...torchRobinhoodManifest,
      launch: { ...torchRobinhoodManifest.launch, abi: [] },
    }, 4663)).toThrow(/absent from its ABI/);
    expect(() => assertVerifiedManifest({
      ...torchRobinhoodManifest,
      launch: {
        ...torchRobinhoodManifest.launch,
        fieldNames: { ...torchRobinhoodManifest.launch.fieldNames, token: ['notAnEventField'] },
      },
    }, 4663)).toThrow(/invalid token event mapping/);
    expect(() => assertVerifiedManifest({
      ...torchRobinhoodManifest,
      launch: {
        ...torchRobinhoodManifest.launch,
        eligibleSplit: { ...torchRobinhoodManifest.launch.eligibleSplit, burnBps: 4_999n },
      },
    }, 4663)).toThrow(/must total 10000 BPS/);
  });

  it('defaults to Torchpad and requires Telegram credentials outside dry-run', () => {
    expect(loadConfig({ HTTP_RPC_URLS: 'https://rpc.example' }).integrationId).toBe('torch-robinhood');
    expect(() => loadConfig({ HTTP_RPC_URLS: 'https://rpc.example', DRY_RUN: 'false' })).toThrow(/TELEGRAM_BOT_TOKEN/);
  });
});
