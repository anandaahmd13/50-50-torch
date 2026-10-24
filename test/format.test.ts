import { describe, expect, it } from 'vitest';
import { formatLaunchAlert, safeTelegramHtml } from '../src/notify/format.js';
import { flywheelRobinhoodManifest } from '../src/integrations/flywheel-robinhood.js';

describe('Telegram HTML metadata escaping', () => {
  it('escapes markup and strips control/bidi characters', () => {
    expect(safeTelegramHtml('<b>& hello\u202E\u0000')).toBe('&lt;b&gt;&amp; hello');
    expect(safeTelegramHtml(undefined)).toBe('-');
    expect(safeTelegramHtml(' \n\t ')).toBe('-');
  });

  it('renders a Flywheel card from factory and on-chain token facts', () => {
    const body = formatLaunchAlert({
      eventName: 'TokenLaunched', factory: '0xF05A26e92E27b8F0385f6895F5507Db26A2F4b8d', token: '0x127CDc74E44E3c60422b7E792eBE480c0f873ed5',
      creator: '0x89c5D00F166e4805946d3f30C596174f6Cd2DB7f', quoteAsset: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C',
      holderRewardsEnabled: true, transactionHash: '0xbaea8bc0632420ef2231d377f660e4f5637634723c8632cbee8871aaf90cfb1a', logIndex: 10,
      blockNumber: 91_295_058n, blockHash: '0x00efd759f1ca6a89a4dd27048ce830cbfae31c591ac4a90b26c47525ead8981a',
    }, {
      token: {
        name: 'Boomer', symbol: 'BOOMER', decimals: 18, totalSupply: 69_368_404_191_766_874_813_967_685_608n,
        twitter: 'https://x.example', website: 'https://example.com', telegram: 'https://t.me/example', description: 'About', unavailable: [],
      },
      quote: { address: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C', name: 'Wrapped SPY', symbol: 'SPY', decimals: 18, unavailable: [] },
      creator: {
        nonce: 42n,
        nativeBalance: 1_250_000_000_000_000_000n,
        tokenBalance: 1_500_000_000_000_000_000n,
        tokenPercentageBps: 125n,
        deployCount: 3,
        unavailable: [],
      },
    }, flywheelRobinhoodManifest);
    for (const label of ['Token Address', 'Name', 'Symbol', 'Paired', 'Holder Rewards', 'Twitter', 'Creator', 'Creator Nonce', 'Creator Balance', 'Count Deploys', 'Creator Token Percents', 'Creator Token Balance']) {
      expect(body).toContain(`<b>${label}</b>`);
    }
    expect(body).toContain('🤖 <b>Token Address</b> : <code>0x127CDc74E44E3c60422b7E792eBE480c0f873ed5</code>');
    expect(body).toContain('<b>Paired</b> : <code>0x117cc2133c37B721F49dE2A7a74833232B3B4C0C</code> (Wrapped SPY)');
    expect(body).toContain('<b>Holder Rewards</b> : On');
    expect(body).toContain('<b>Creator Nonce</b> : 42');
    expect(body).toContain('<b>Creator Balance</b> : 1.25 ETH');
    expect(body).toContain('<b>Count Deploys</b> : 3');
    expect(body).toContain('<b>Creator Token Percents</b> : 1.25%');
    expect(body).toContain('<b>Creator Token Balance</b> : 1.5 BOOMER');
    expect(body).toContain('https://robinhoodchain.blockscout.com/address/0x89c5D00F166e4805946d3f30C596174f6Cd2DB7f');
    expect(body).not.toContain('BNB');
    expect(body).not.toContain('Dev Buy');
    expect(body).not.toContain('Runitup');
  });

  it('uses a dash when creator snapshot data is unavailable', () => {
    const body = formatLaunchAlert({
      eventName: 'TokenLaunched', factory: '0xF05A26e92E27b8F0385f6895F5507Db26A2F4b8d', token: '0x127CDc74E44E3c60422b7E792eBE480c0f873ed5',
      creator: '0x89c5D00F166e4805946d3f30C596174f6Cd2DB7f', quoteAsset: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C',
      holderRewardsEnabled: false, transactionHash: '0xbaea8bc0632420ef2231d377f660e4f5637634723c8632cbee8871aaf90cfb1a', logIndex: 10,
      blockNumber: 91_295_058n, blockHash: '0x00efd759f1ca6a89a4dd27048ce830cbfae31c591ac4a90b26c47525ead8981a',
    }, {
      token: { unavailable: [] },
      quote: { address: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C', unavailable: [] },
      creator: { unavailable: ['creator nonce'] },
    }, flywheelRobinhoodManifest);
    expect(body).toContain('<b>Holder Rewards</b> : Off');
    expect(body).toContain('<b>Creator Nonce</b> : -');
    expect(body).toContain('<b>Creator Balance</b> : -');
    expect(body).toContain('<b>Count Deploys</b> : -');
    expect(body).toContain('<b>Creator Token Percents</b> : -');
    expect(body).toContain('<b>Creator Token Balance</b> : -');
  });
});
