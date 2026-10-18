import { describe, expect, it } from 'vitest';
import { formatLaunchAlert, safeTelegramHtml } from '../src/notify/format.js';

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
      quote: { address: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C', symbol: 'SPY', decimals: 18, unavailable: [] },
    });
    for (const label of ['Token Address', 'Name', 'Symbol', 'Quote Asset', 'Holder Rewards', 'Total Supply', 'Twitter', 'Website', 'Telegram', 'About', 'Creator']) {
      expect(body).toContain(`<b>${label}</b>`);
    }
    expect(body).toContain('<b>Token Address</b> : <code>0x127CDc74E44E3c60422b7E792eBE480c0f873ed5</code>');
    expect(body).toContain('<b>Quote Asset</b> : SPY <code>0x117cc2133c37B721F49dE2A7a74833232B3B4C0C</code>');
    expect(body).toContain('<b>Holder Rewards</b> : enabled');
    expect(body).toContain('<b>Total Supply</b> : 69368404191.766874 BOOMER');
    expect(body).toContain('https://robinhoodchain.blockscout.com/address/0x89c5D00F166e4805946d3f30C596174f6Cd2DB7f');
    expect(body).not.toContain('BNB');
    expect(body).not.toContain('Dev Buy');
    expect(body).not.toContain('Runitup');
  });
});
