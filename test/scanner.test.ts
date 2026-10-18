import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import fixture from './fixtures/flywheel-boomer-token-launched.json' with { type: 'json' };
import { DurableScanner } from '../src/chain/scanner.js';
import type { AppConfig } from '../src/config.js';

const config: AppConfig = {
  chainId: 4663, httpRpcUrls: ['https://example.invalid'], dbPath: ':memory:', pollIntervalMs: 1_000,
  reorgWindow: 24, initialChunkSize: 8, minChunkSize: 2, finalityConfirmations: 15, dryRun: true,
  telegramChatIds: [], telegramAdminUserIds: new Set(), telegramMinIntervalMs: 1_000,
};

describe('adaptive getLogs', () => {
  it('refuses a valid Flywheel-shaped event from an unregistered factory', async () => {
    const onLaunch = vi.fn();
    const recordBlock = vi.fn();
    const scanner = new DurableScanner(
      {} as never,
      { recordBlock } as never,
      config,
      { onLaunch, onReorg: vi.fn() },
      pino({ enabled: false }),
    );
    await scanner.processLogs([{
      ...fixture,
      address: '0x0000000000000000000000000000000000000001',
      blockNumber: BigInt(fixture.blockNumber),
    }] as never);
    expect(recordBlock).not.toHaveBeenCalled();
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('shrinks after an RPC limit response and continues the same range', async () => {
    const getLogs = vi.fn()
      .mockRejectedValueOnce(new Error('query returned more than 10000 results'))
      .mockResolvedValue([]);
    const scanner = new DurableScanner(
      { getLogs } as never,
      { getCursor: () => undefined, setCursor: vi.fn(), getRecentBlocks: () => [], recordBlock: vi.fn(), rollbackFrom: vi.fn() } as never,
      config,
      { onLaunch: vi.fn(), onReorg: vi.fn() },
      pino({ enabled: false }),
    );
    await scanner.scanRange(1n, 8n);
    expect(getLogs).toHaveBeenCalledTimes(3); // one factory/event request, then one for each reduced range
    expect(getLogs.mock.calls.some(([request]) => request.fromBlock === 1n && request.toBlock === 4n)).toBe(true);
  });

  it('retains the same range when the getLogs backend is behind the reported head', async () => {
    const getLogs = vi.fn().mockRejectedValue(new Error('block range extends beyond current head block: requested 18, head 10'));
    const scanner = new DurableScanner(
      { getLogs } as never,
      { getCursor: () => undefined, setCursor: vi.fn(), getRecentBlocks: () => [], recordBlock: vi.fn(), rollbackFrom: vi.fn() } as never,
      config,
      { onLaunch: vi.fn(), onReorg: vi.fn() },
      pino({ enabled: false }),
    );
    await expect(scanner.scanRange(11n, 18n)).resolves.toBe(false);
    // The factory/event request retains the original range; no smaller
    // range is attempted and the caller will retry on the next poll.
    expect(getLogs).toHaveBeenCalledTimes(1);
    expect(getLogs.mock.calls.every(([request]) => request.fromBlock === 11n && request.toBlock === 18n)).toBe(true);
  });

  it('does not advance the cursor while waiting for a lagging getLogs backend', async () => {
    const setCursor = vi.fn();
    const scanner = new DurableScanner(
      {
        getBlockNumber: vi.fn().mockResolvedValue(100n),
        getLogs: vi.fn().mockRejectedValue(new Error('block range extends beyond current head block: requested 100, head 99')),
      } as never,
      { getCursor: () => 99n, setCursor, getRecentBlocks: () => [], recordBlock: vi.fn(), rollbackFrom: vi.fn() } as never,
      config,
      { onLaunch: vi.fn(), onReorg: vi.fn() },
      pino({ enabled: false }),
    );
    await scanner.scanOnce();
    expect(setCursor).not.toHaveBeenCalled();
  });
});
