import fixture from './fixtures/torch-loud-token-launched.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { decodeLaunchLog, isAlertEligible } from '../src/chain/decode.js';
import { launchEventTopic } from '../src/integrations/registry.js';
import { torchRobinhoodManifest } from '../src/integrations/torch-robinhood.js';
import type { ChainLog } from '../src/chain/types.js';

const log = {
  ...fixture,
  blockNumber: BigInt(fixture.blockNumber),
} as ChainLog;

describe('verified LOUD Torchpad golden fixture', () => {
  it('decodes canonical TorchFactory TokenLaunched event', () => {
    const launch = decodeLaunchLog(log, torchRobinhoodManifest);
    expect(launch).toMatchObject({
      eventName: 'TokenLaunched',
      poolId: '0xd3e6cd0b9d712c379051d21781019c5c33af2aef7fba409af5a44da383d64deb',
      buyTaxBps: 200n,
      lpFee: 3_000n,
      antiSnipeSeconds: 15n,
      splitBps: { creatorBps: 5_000n, burnBps: 5_000n, holdersBps: 0n, liquidityBps: 0n },
      transactionHash: fixture.transactionHash,
      logIndex: 22,
      blockNumber: 96_093_244n,
    });
    expect(launch?.factory.toLowerCase()).toBe('0x7891ea889899928afe637e4cca8106188427776a');
    expect(launch?.token.toLowerCase()).toBe('0xcd291fa4d3e2eb43e4639625092d31ae10e61111');
    expect(launch?.creator.toLowerCase()).toBe('0x5fea510e94353cf4920172f4cc8833d83a15e56d');
    expect(launch?.quoteAsset).toBe('0x0000000000000000000000000000000000000000');
    expect(isAlertEligible(launch!, torchRobinhoodManifest)).toBe(true);
  });

  it('pins reviewed canonical topic0', () => {
    expect(launchEventTopic(torchRobinhoodManifest)).toBe('0xea6baf14ec1f4c08d18114c1eea0e6a2a018eef994f9db19ea8a41526e49d28c');
    expect(fixture.topics[0]).toBe(launchEventTopic(torchRobinhoodManifest));
  });

  it('ignores different topic before ABI decode', () => {
    const launch = decodeLaunchLog({
      ...log,
      topics: [`0x${'00'.repeat(32)}`],
    }, torchRobinhoodManifest);
    expect(launch).toBeUndefined();
  });
});
