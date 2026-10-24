import { describe, expect, it, vi } from 'vitest';
import { profileLaunch } from '../src/chain/enrich.js';
import { torchRobinhoodManifest } from '../src/integrations/torch-robinhood.js';
import type { DecodedLaunch } from '../src/chain/types.js';

const launch: DecodedLaunch = {
  eventName: 'TokenLaunched',
  factory: '0x7891eA889899928aFE637e4Cca8106188427776a',
  token: '0xCD291FA4d3e2Eb43e4639625092D31ae10E61111',
  creator: '0x5FEa510E94353cf4920172F4cC8833D83a15e56D',
  quoteAsset: '0x0000000000000000000000000000000000000000',
  poolId: '0xd3e6cd0b9d712c379051d21781019c5c33af2aef7fba409af5a44da383d64deb',
  buyTaxBps: 200n,
  lpFee: 3_000n,
  antiSnipeSeconds: 15n,
  splitBps: { creatorBps: 5_000n, burnBps: 5_000n, holdersBps: 0n, liquidityBps: 0n },
  transactionHash: '0x20562c7a2365968dcb68439f21f9031c8fb1a148d56a0117db0d4bb3ed0c17d9',
  logIndex: 22,
  blockNumber: 96_093_244n,
  blockHash: '0x0bc8ee7918f2df199c94a478bb399fde7c1b4c0a227795c9e3cef2a2a460cd52',
};

describe('launch creator snapshot', () => {
  it('uses launch block, returns native ETH quote, and includes current launch', async () => {
    const readContract = vi.fn(async (request: { functionName: string; blockNumber: bigint; address: string }) => {
      if (request.functionName === 'balanceOf') return 125n;
      return ({ name: 'loudscene', symbol: 'LOUD', decimals: 18, totalSupply: 1_000n } as Record<string, unknown>)[request.functionName];
    });
    const getLogs = vi.fn().mockResolvedValue([{}, {}]);
    const client = {
      readContract,
      getTransactionCount: vi.fn().mockResolvedValue(9n),
      getBalance: vi.fn().mockResolvedValue(2_500_000_000_000_000_000n),
      getLogs,
    };

    const profile = await profileLaunch(client as never, torchRobinhoodManifest, launch);

    expect(profile.token.name).toBe('loudscene');
    expect(profile.quote).toMatchObject({
      address: launch.quoteAsset, name: 'Ether', symbol: 'ETH', decimals: 18, native: true, unavailable: [],
    });
    expect(profile.creator).toMatchObject({
      nonce: 9n,
      nativeBalance: 2_500_000_000_000_000_000n,
      tokenBalance: 125n,
      tokenPercentageBps: 1_250n,
      deployCount: 218,
    });
    expect(readContract.mock.calls.every(([request]) => request.blockNumber === launch.blockNumber)).toBe(true);
    expect(readContract.mock.calls.every(([request]) => request.address.toLowerCase() !== launch.quoteAsset.toLowerCase())).toBe(true);
    expect(client.getTransactionCount).toHaveBeenCalledWith({ address: launch.creator, blockNumber: launch.blockNumber });
    expect(client.getBalance).toHaveBeenCalledWith({ address: launch.creator, blockNumber: launch.blockNumber });
    expect(getLogs.mock.calls[0]?.[0]).toMatchObject({
      fromBlock: 85_204_474n,
      args: { creator: launch.creator },
    });
    expect(getLogs.mock.calls.at(-1)?.[0]).toMatchObject({
      toBlock: launch.blockNumber,
      args: { creator: launch.creator },
    });
  });

  it('keeps profile usable when creator reads fail', async () => {
    const client = {
      readContract: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
      getTransactionCount: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
      getBalance: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
      getLogs: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
    };

    const profile = await profileLaunch(client as never, torchRobinhoodManifest, launch);

    expect(profile.creator.nonce).toBeUndefined();
    expect(profile.creator.nativeBalance).toBeUndefined();
    expect(profile.creator.tokenBalance).toBeUndefined();
    expect(profile.creator.deployCount).toBeUndefined();
    expect(profile.creator.unavailable).toEqual(expect.arrayContaining([
      'creator nonce', 'creator native balance', 'creator token balance', 'creator deploy count',
    ]));
  });
});
