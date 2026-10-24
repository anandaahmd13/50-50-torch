import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { Store } from '../src/db/store.js';
import type { DecodedLaunch, LaunchProfile } from '../src/chain/types.js';

const paths: string[] = [];
const temporaryStore = (): Store => {
  const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'torchpad-store-')), 'watcher.sqlite');
  paths.push(path.dirname(filename));
  return new Store(filename, 'torch-robinhood');
};

afterEach(() => paths.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

const launch: DecodedLaunch = {
  eventName: 'TokenLaunched', factory: '0x7891eA889899928aFE637e4Cca8106188427776a', token: '0xCD291FA4d3e2Eb43e4639625092D31ae10E61111',
  creator: '0x5FEa510E94353cf4920172F4cC8833D83a15e56D', quoteAsset: '0x0000000000000000000000000000000000000000',
  poolId: '0xd3e6cd0b9d712c379051d21781019c5c33af2aef7fba409af5a44da383d64deb', buyTaxBps: 200n, lpFee: 3_000n, antiSnipeSeconds: 15n,
  splitBps: { creatorBps: 5_000n, burnBps: 5_000n, holdersBps: 0n, liquidityBps: 0n },
  transactionHash: '0x20562c7a2365968dcb68439f21f9031c8fb1a148d56a0117db0d4bb3ed0c17d9',
  logIndex: 22, blockNumber: 96_093_244n, blockHash: '0x0bc8ee7918f2df199c94a478bb399fde7c1b4c0a227795c9e3cef2a2a460cd52',
};
const profile: LaunchProfile = {
  token: { name: 'loudscene', symbol: 'LOUD', decimals: 18, totalSupply: 1n, unavailable: [] },
  quote: { address: launch.quoteAsset, name: 'Ether', symbol: 'ETH', decimals: 18, native: true, unavailable: [] },
  creator: { unavailable: [] },
};

describe('SQLite durable outbox', () => {
  it('is idempotent across replay and leaves one notification', () => {
    const store = temporaryStore();
    expect(store.recordLaunch(launch, profile, '<b>launch</b>', ['1'])).toBe(true);
    expect(store.recordLaunch(launch, profile, '<b>launch</b>', ['1'])).toBe(false);
    expect(store.getDueOutbox()).toMatchObject([{
      token: launch.token.toLowerCase(), creator: launch.creator.toLowerCase(), txHash: launch.transactionHash,
    }]);
    store.close();
  });

  it('recovers committed unsent outbox row after restart', () => {
    const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'torchpad-restart-')), 'watcher.sqlite');
    paths.push(path.dirname(filename));
    const first = new Store(filename, 'torch-robinhood');
    first.recordLaunch(launch, profile, '<b>launch</b>', ['1']);
    first.close();
    const restarted = new Store(filename, 'torch-robinhood');
    expect(restarted.getDueOutbox()).toHaveLength(1);
    restarted.close();
  });

  it('rejects legacy or foreign integration database', () => {
    const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'torchpad-identity-')), 'watcher.sqlite');
    paths.push(path.dirname(filename));
    const first = new Store(filename, 'torch-robinhood');
    first.close();
    expect(() => new Store(filename, 'another-integration')).toThrow(/belongs to integration torch-robinhood/);

    const legacyFilename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'torchpad-legacy-')), 'watcher.sqlite');
    paths.push(path.dirname(legacyFilename));
    const database = new Database(legacyFilename);
    database.exec(`
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE blocks (number INTEGER PRIMARY KEY, hash TEXT NOT NULL);
      CREATE TABLE events (
        tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL, factory TEXT NOT NULL,
        event_name TEXT NOT NULL, token TEXT NOT NULL, creator TEXT, block_number INTEGER NOT NULL,
        block_hash TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL, detected_at INTEGER NOT NULL,
        PRIMARY KEY (tx_hash, log_index)
      );
      INSERT INTO events VALUES ('0x01', 0, '0x01', 'TokenLaunched', '0x01', NULL, 1, '0x01', '{}', 'CANONICAL', 1);
    `);
    database.close();
    expect(() => new Store(legacyFilename, 'torch-robinhood')).toThrow(/legacy state/);
  });

  it('cancels unsent messages and schedules remediation on reorg', () => {
    const store = temporaryStore();
    store.recordLaunch(launch, profile, '<b>launch</b>', ['1', '2']);
    const [first] = store.getDueOutbox();
    store.markSent(first!.id, 42);
    const sent = store.rollbackFrom(launch.blockNumber);
    expect(sent).toHaveLength(1);
    expect(store.getDueOutbox()).toHaveLength(0);
    expect(store.getReorgNotices()).toHaveLength(1);
    expect(store.getCursor()).toBe(launch.blockNumber - 1n);
    store.close();
  });
});
