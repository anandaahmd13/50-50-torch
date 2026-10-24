import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { Store } from '../src/db/store.js';
import { TelegramNotifier } from '../src/notify/telegram.js';
import type { DecodedLaunch } from '../src/chain/types.js';
import { torchRobinhoodManifest } from '../src/integrations/torch-robinhood.js';

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

const launch: DecodedLaunch = {
  eventName: 'TokenLaunched', factory: '0x7891eA889899928aFE637e4Cca8106188427776a', token: '0xCD291FA4d3e2Eb43e4639625092D31ae10E61111',
  creator: '0x5FEa510E94353cf4920172F4cC8833D83a15e56D', quoteAsset: '0x0000000000000000000000000000000000000000',
  poolId: '0xd3e6cd0b9d712c379051d21781019c5c33af2aef7fba409af5a44da383d64deb', buyTaxBps: 200n, lpFee: 3_000n, antiSnipeSeconds: 15n,
  splitBps: { creatorBps: 5_000n, burnBps: 5_000n, holdersBps: 0n, liquidityBps: 0n },
  transactionHash: '0x20562c7a2365968dcb68439f21f9031c8fb1a148d56a0117db0d4bb3ed0c17d9', logIndex: 22,
  blockNumber: 96_093_244n, blockHash: '0x0bc8ee7918f2df199c94a478bb399fde7c1b4c0a227795c9e3cef2a2a460cd52',
};
const profile = {
  token: { unavailable: [] }, quote: { address: launch.quoteAsset, unavailable: [] }, creator: { unavailable: [] },
};

describe('Telegram retry', () => {
  it('defers 429 using Telegram retry_after rather than dropping alert', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'torchpad-telegram-'));
    directories.push(directory);
    const store = new Store(path.join(directory, 'watcher.sqlite'), 'torch-robinhood');
    store.recordLaunch(launch, profile, '<b>launch</b>', ['123']);
    const retry = vi.spyOn(store, 'retryOutbox');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, description: 'Too Many Requests', parameters: { retry_after: 7 } }), { status: 429 })));
    const notifier = new TelegramNotifier({
      integrationId: 'torch-robinhood', chainId: 4663, httpRpcUrls: ['https://rpc.example'], dbPath: ':memory:', pollIntervalMs: 1_000, reorgWindow: 24,
      initialChunkSize: 100, minChunkSize: 10, finalityConfirmations: 15, dryRun: false, telegramBotToken: 'not-a-real-token',
      telegramChatIds: ['123'], telegramAdminUserIds: new Set(), telegramMinIntervalMs: 100,
    }, pino({ enabled: false }), torchRobinhoodManifest);
    await notifier.drain(store);
    expect(retry).toHaveBeenCalledWith(expect.any(Number), 'Too Many Requests', 7_000);
    expect(store.getDueOutbox()).toHaveLength(0);
    store.close();
  });
});
