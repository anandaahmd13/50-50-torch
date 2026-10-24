import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import fixture from './fixtures/torch-loud-token-launched.json' with { type: 'json' };
import { DurableScanner } from '../src/chain/scanner.js';
import type { AppConfig } from '../src/config.js';
import { torchRobinhoodManifest } from '../src/integrations/torch-robinhood.js';

const config: AppConfig = {
  integrationId: 'torch-robinhood', chainId: 4663, httpRpcUrls: ['https://example.invalid'], dbPath: ':memory:', pollIntervalMs: 1_000,
  reorgWindow: 24, initialChunkSize: 8, minChunkSize: 2, finalityConfirmations: 15, dryRun: true,
  telegramChatIds: [], telegramAdminUserIds: new Set(), telegramMinIntervalMs: 1_000,
};

const log = { ...fixture, blockNumber: BigInt(fixture.blockNumber) };

function dataWithSplit(creator: bigint, burn: bigint, holders: bigint, liquidity: bigint): `0x${string}` {
  const prefix = fixture.data.slice(0, 2 + 64 * 4);
  const suffix = fixture.data.slice(2 + 64 * 8);
  const word = (value: bigint) => value.toString(16).padStart(64, '0');
  return `${prefix}${word(creator)}${word(burn)}${word(holders)}${word(liquidity)}${suffix}` as `0x${string}`;
}

describe('DurableScanner', () => {
  it('accepts exact eligible split', async () => {
    const onLaunch = vi.fn();
    const recordBlock = vi.fn();
    const scanner = new DurableScanner(
      {} as never, { recordBlock } as never, config, torchRobinhoodManifest,
      { onLaunch, onReorg: vi.fn() }, pino({ enabled: false }),
    );
    await scanner.processLogs([log] as never);
    expect(recordBlock).toHaveBeenCalledWith(96_093_244n, fixture.blockHash);
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['creator', 4_999n, 5_000n, 1n, 0n],
    ['burn', 5_000n, 4_999n, 0n, 1n],
    ['holders', 5_000n, 4_999n, 1n, 0n],
    ['liquidity', 5_000n, 4_999n, 0n, 1n],
  ])('records block but skips nonmatching %s split', async (_name, creator, burn, holders, liquidity) => {
    const onLaunch = vi.fn();
    const recordBlock = vi.fn();
    const scanner = new DurableScanner(
      {} as never, { recordBlock } as never, config, torchRobinhoodManifest,
      { onLaunch, onReorg: vi.fn() }, pino({ enabled: false }),
    );
    await scanner.processLogs([{ ...log, data: dataWithSplit(creator, burn, holders, liquidity) }] as never);
    expect(recordBlock).toHaveBeenCalledTimes(1);
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('refuses Torch-shaped event from unregistered factory', async () => {
    const onLaunch = vi.fn();
    const recordBlock = vi.fn();
    const scanner = new DurableScanner(
      {} as never, { recordBlock } as never, config, torchRobinhoodManifest,
      { onLaunch, onReorg: vi.fn() }, pino({ enabled: false }),
    );
    await scanner.processLogs([{ ...log, address: '0x0000000000000000000000000000000000000001' }] as never);
    expect(recordBlock).not.toHaveBeenCalled();
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('shrinks after RPC limit and continues same range', async () => {
    const getLogs = vi.fn()
      .mockRejectedValueOnce(new Error('query returned more than 10000 results'))
      .mockResolvedValue([]);
    const scanner = new DurableScanner(
      { getLogs } as never,
      { getCursor: () => undefined, setCursor: vi.fn(), getRecentBlocks: () => [], recordBlock: vi.fn(), rollbackFrom: vi.fn() } as never,
      config, torchRobinhoodManifest, { onLaunch: vi.fn(), onReorg: vi.fn() }, pino({ enabled: false }),
    );
    await scanner.scanRange(1n, 8n);
    expect(getLogs).toHaveBeenCalledTimes(3);
    expect(getLogs.mock.calls.some(([request]) => request.fromBlock === 1n && request.toBlock === 4n)).toBe(true);
  });

  it('retains same range when getLogs backend lags head', async () => {
    const getLogs = vi.fn().mockRejectedValue(new Error('block range extends beyond current head block: requested 18, head 10'));
    const scanner = new DurableScanner(
      { getLogs } as never,
      { getCursor: () => undefined, setCursor: vi.fn(), getRecentBlocks: () => [], recordBlock: vi.fn(), rollbackFrom: vi.fn() } as never,
      config, torchRobinhoodManifest, { onLaunch: vi.fn(), onReorg: vi.fn() }, pino({ enabled: false }),
    );
    await expect(scanner.scanRange(11n, 18n)).resolves.toBe(false);
    expect(getLogs).toHaveBeenCalledTimes(1);
  });

  it('does not advance cursor while getLogs backend lags head', async () => {
    const setCursor = vi.fn();
    const scanner = new DurableScanner(
      {
        getBlockNumber: vi.fn().mockResolvedValue(100n),
        getLogs: vi.fn().mockRejectedValue(new Error('block range extends beyond current head block: requested 100, head 99')),
      } as never,
      { getCursor: () => 99n, setCursor, getRecentBlocks: () => [], recordBlock: vi.fn(), rollbackFrom: vi.fn() } as never,
      config, torchRobinhoodManifest, { onLaunch: vi.fn(), onReorg: vi.fn() }, pino({ enabled: false }),
    );
    await scanner.scanOnce();
    expect(setCursor).not.toHaveBeenCalled();
  });
});
