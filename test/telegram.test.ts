import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { Store } from '../src/db/store.js';
import { TelegramNotifier } from '../src/notify/telegram.js';
import type { DecodedLaunch, TokenMetadata } from '../src/chain/types.js';

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

const launch: DecodedLaunch = {
  eventName: 'TokenLaunched', factory: '0x8c6689531003158f7A7fFd02895396A122191ffF', token: '0xa00866F73Aaead7E0a410386C6ea66B979c40bfC',
  creator: '0xcD5F15D0aE0cAB4B7B941C0475A37107bb20F28e', quoteAsset: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C', holderRewardsEnabled: true,
  transactionHash: '0xdc36ea456f1886b3a124856ee80cfbc50dd9e262bd18a7462fe91930114edc1e', logIndex: 73,
  blockNumber: 127_265_327n, blockHash: '0x4b92889b6817b36e3414bdfa64533d1fef9cc7db4e7ab1441c5c2534857c7aed',
};
const token: TokenMetadata = { unavailable: [] };

describe('Telegram retry', () => {
  it('defers a 429 using Telegram retry_after rather than dropping the alert', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'flywheel-telegram-'));
    directories.push(directory);
    const store = new Store(path.join(directory, 'watcher.sqlite'));
    store.recordLaunch(launch, token, '<b>launch</b>', ['123']);
    const retry = vi.spyOn(store, 'retryOutbox');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, description: 'Too Many Requests', parameters: { retry_after: 7 } }), { status: 429 })));
    const notifier = new TelegramNotifier({
      chainId: 4663, httpRpcUrls: ['https://rpc.example'], dbPath: ':memory:', pollIntervalMs: 1_000, reorgWindow: 24,
      initialChunkSize: 100, minChunkSize: 10, finalityConfirmations: 15, dryRun: false, telegramBotToken: 'not-a-real-token',
      telegramChatIds: ['123'], telegramAdminUserIds: new Set(), telegramMinIntervalMs: 100,
    }, pino({ enabled: false }));
    await notifier.drain(store);
    expect(retry).toHaveBeenCalledWith(expect.any(Number), 'Too Many Requests', 7_000);
    expect(store.getDueOutbox()).toHaveLength(0);
    store.close();
  });
});
