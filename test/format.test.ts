import { describe, expect, it } from 'vitest';
import { formatLaunchAlert, safeTelegramHtml } from '../src/notify/format.js';
import { torchRobinhoodManifest } from '../src/integrations/torch-robinhood.js';
import type { DecodedLaunch } from '../src/chain/types.js';

const launch: DecodedLaunch = {
  eventName: 'TokenLaunched', factory: '0x7891eA889899928aFE637e4Cca8106188427776a', token: '0xCD291FA4d3e2Eb43e4639625092D31ae10E61111',
  creator: '0x5FEa510E94353cf4920172F4cC8833D83a15e56D', quoteAsset: '0x0000000000000000000000000000000000000000',
  poolId: '0xd3e6cd0b9d712c379051d21781019c5c33af2aef7fba409af5a44da383d64deb', buyTaxBps: 200n, lpFee: 3_000n, antiSnipeSeconds: 15n,
  splitBps: { creatorBps: 5_000n, burnBps: 5_000n, holdersBps: 0n, liquidityBps: 0n },
  transactionHash: '0x20562c7a2365968dcb68439f21f9031c8fb1a148d56a0117db0d4bb3ed0c17d9', logIndex: 22,
  blockNumber: 96_093_244n, blockHash: '0x0bc8ee7918f2df199c94a478bb399fde7c1b4c0a227795c9e3cef2a2a460cd52',
};

describe('Telegram HTML metadata escaping', () => {
  it('escapes markup and strips control/bidi characters', () => {
    expect(safeTelegramHtml('<b>& hello‮\u0000')).toBe('&lt;b&gt;&amp; hello');
    expect(safeTelegramHtml(undefined)).toBe('-');
    expect(safeTelegramHtml(' \n\t ')).toBe('-');
  });

  it('renders Torchpad card from factory and on-chain facts', () => {
    const body = formatLaunchAlert(launch, {
      token: { name: 'loudscene', symbol: 'LOUD', decimals: 18, totalSupply: 1_000n, unavailable: [] },
      quote: { address: launch.quoteAsset, name: 'Ether', symbol: 'ETH', decimals: 18, native: true, unavailable: [] },
      creator: {
        nonce: 42n, nativeBalance: 1_250_000_000_000_000_000n, tokenBalance: 1_500_000_000_000_000_000n,
        tokenPercentageBps: 125n, deployCount: 3, unavailable: [],
      },
    }, torchRobinhoodManifest);
    for (const label of ['Token Address', 'Name', 'Symbol', 'Paired', 'Buy Tax', 'Tax Split', 'Twitter', 'Website', 'Creator', 'Creator Nonce', 'Creator Balance', 'Count Deploys', 'Creator Token Percents', 'Creator Token Balance']) {
      expect(body).toContain(`<b>${label}</b>`);
    }
    expect(body).toContain('<b>Paired</b> : Ether (native)');
    expect(body).toContain('<b>Buy Tax</b> : 2.00%');
    expect(body).toContain('<b>Tax Split</b> : Creator 50.00% / Burn 50.00%');
    expect(body).toContain('<b>Twitter</b> : -');
    expect(body).toContain('<b>Website</b> : -');
    expect(body).toContain('<b>Creator Balance</b> : 1.25 ETH');
    expect(body).toContain('https://robinhoodchain.blockscout.com/address/0x5FEa510E94353cf4920172F4cC8833D83a15e56D');
    expect(body).not.toContain('Flywheel');
    expect(body).not.toContain('Holder Rewards');
  });

  it('uses dash when creator snapshot data unavailable', () => {
    const body = formatLaunchAlert(launch, {
      token: { unavailable: [] },
      quote: { address: launch.quoteAsset, unavailable: [] },
      creator: { unavailable: ['creator nonce'] },
    }, torchRobinhoodManifest);
    expect(body).toContain('<b>Creator Nonce</b> : -');
    expect(body).toContain('<b>Creator Balance</b> : -');
    expect(body).toContain('<b>Count Deploys</b> : -');
    expect(body).toContain('<b>Creator Token Percents</b> : -');
    expect(body).toContain('<b>Creator Token Balance</b> : -');
  });
});
