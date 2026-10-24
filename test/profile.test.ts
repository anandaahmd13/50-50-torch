import { describe, expect, it, vi } from 'vitest';
import { profileLaunch } from '../src/chain/enrich.js';
import { flywheelRobinhoodManifest } from '../src/integrations/flywheel-robinhood.js';
import type { DecodedLaunch } from '../src/chain/types.js';

const launch: DecodedLaunch = {
  eventName: 'TokenLaunched',
  factory: '0xF05A26e92E27b8F0385f6895F5507Db26A2F4b8d',
  token: '0x127CDc74E44E3c60422b7E792eBE480c0f873ed5',
  creator: '0x89c5D00F166e4805946d3f30C596174f6Cd2DB7f',
  quoteAsset: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C',
  holderRewardsEnabled: true,
  transactionHash: '0xbaea8bc0632420ef2231d377f660e4f5637634723c8632cbee8871aaf90cfb1a',
  logIndex: 10,
  blockNumber: 87_735_164n,
  blockHash: '0x00efd759f1ca6a89a4dd27048ce830cbfae31c591ac4a90b26c47525ead8981a',
};

describe('launch creator snapshot', () => {
  it('uses the launch block and includes the current launch in deploy count', async () => {
    const readContract = vi.fn(async (request: { functionName: string; address: string; blockNumber: bigint }) => {
      if (request.functionName === 'balanceOf') return 125n;
      if (request.address.toLowerCase() === launch.quoteAsset.toLowerCase()) {
        return ({ name: 'Wrapped ETH', symbol: 'WETH', decimals: 18 } as Record<string, unknown>)[request.functionName];
      }
      return ({
        name: 'Boomer', symbol: 'BOOMER', decimals: 18, totalSupply: 1_000n,
        logoURI: 'https://example.test/logo.png', description: 'Test', website: 'https://example.test',
        twitter: 'https://x.example/test', telegram: 'https://t.me/test',
      } as Record<string, unknown>)[request.functionName];
    });
    const getLogs = vi.fn().mockResolvedValue([{}, {}]);
    const client = {
      readContract,
      getTransactionCount: vi.fn().mockResolvedValue(9n),
      getBalance: vi.fn().mockResolvedValue(2_500_000_000_000_000_000n),
      getLogs,
    };

    const profile = await profileLaunch(client as never, flywheelRobinhoodManifest, launch);

    expect(profile.token.name).toBe('Boomer');
    expect(profile.quote.name).toBe('Wrapped ETH');
    expect(profile.creator).toMatchObject({
      nonce: 9n,
      nativeBalance: 2_500_000_000_000_000_000n,
      tokenBalance: 125n,
      tokenPercentageBps: 1_250n,
      deployCount: 2,
    });
    expect(readContract.mock.calls.every(([request]) => request.blockNumber === launch.blockNumber)).toBe(true);
    expect(client.getTransactionCount).toHaveBeenCalledWith({ address: launch.creator, blockNumber: launch.blockNumber });
    expect(client.getBalance).toHaveBeenCalledWith({ address: launch.creator, blockNumber: launch.blockNumber });
    expect(getLogs).toHaveBeenCalledWith(expect.objectContaining({
      fromBlock: 87_735_162n,
      toBlock: launch.blockNumber,
      args: { creator: launch.creator },
    }));
  });

  it('keeps a launch profile usable when all creator reads fail', async () => {
    const client = {
      readContract: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
      getTransactionCount: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
      getBalance: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
      getLogs: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
    };

    const profile = await profileLaunch(client as never, flywheelRobinhoodManifest, launch);

    expect(profile.creator.nonce).toBeUndefined();
    expect(profile.creator.nativeBalance).toBeUndefined();
    expect(profile.creator.tokenBalance).toBeUndefined();
    expect(profile.creator.deployCount).toBeUndefined();
    expect(profile.creator.unavailable).toHaveLength(4);
    expect(profile.creator.unavailable).toEqual(expect.arrayContaining([
      'creator nonce', 'creator native balance', 'creator token balance', 'creator deploy count',
    ]));
  });
});
