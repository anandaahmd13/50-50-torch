import fixture from './fixtures/flywheel-boomer-token-launched.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { decodeLaunchLog } from '../src/chain/decode.js';
import { launchTopics } from '../src/contracts/flywheel.js';
import type { ChainLog } from '../src/chain/types.js';

describe('verified BOOMER golden fixture', () => {
  it('decodes the Flywheel V2 TokenLaunched event', () => {
    const launch = decodeLaunchLog({
      ...fixture,
      blockNumber: BigInt(fixture.blockNumber),
    } as ChainLog);
    expect(launch).toMatchObject({
      eventName: 'TokenLaunched',
      holderRewardsEnabled: true,
      transactionHash: fixture.transactionHash,
      logIndex: 10,
      blockNumber: 91_295_058n,
    });
    expect(launch?.factory.toLowerCase()).toBe('0xf05a26e92e27b8f0385f6895f5507db26a2f4b8d');
    expect(launch?.token.toLowerCase()).toBe('0x127cdc74e44e3c60422b7e792ebe480c0f873ed5');
    expect(launch?.creator.toLowerCase()).toBe('0x89c5d00f166e4805946d3f30c596174f6cd2db7f');
    expect(launch?.quoteAsset.toLowerCase()).toBe('0x117cc2133c37b721f49de2a7a74833232b3b4c0c');
  });

  it('pins the reviewed topic0 instead of inferring from a token address', () => {
    expect(fixture.topics[0]).toBe(launchTopics.TokenLaunched);
  });

  it('ignores a different topic before attempting an ABI decode', () => {
    const launch = decodeLaunchLog({
      ...fixture,
      topics: ['0x' + '00'.repeat(32)],
      blockNumber: BigInt(fixture.blockNumber),
    } as ChainLog);
    expect(launch).toBeUndefined();
  });
});
