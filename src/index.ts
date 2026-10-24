import 'dotenv/config';
import pino from 'pino';
import { loadConfig, redactConfig } from './config.js';
import { profileLaunch } from './chain/enrich.js';
import { DurableScanner } from './chain/scanner.js';
import { createHttpClient, createWebSocketClient } from './chain/rpc.js';
import type { ChainLog, DecodedLaunch } from './chain/types.js';
import { Store } from './db/store.js';
import { assertVerifiedManifest, getIntegration } from './integrations/registry.js';
import { formatLaunchAlert } from './notify/format.js';
import { startAdminCommands, TelegramNotifier } from './notify/telegram.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const config = loadConfig();
const manifest = getIntegration(config.integrationId);
assertVerifiedManifest(manifest, config.chainId);
const client = createHttpClient(config, manifest);
const websocketClient = createWebSocketClient(config, manifest);
const store = new Store(config.dbPath);
const notifier = new TelegramNotifier(config, logger, manifest);

async function recordLaunch(launch: DecodedLaunch): Promise<void> {
  const profile = await profileLaunch(client, manifest, launch);
  const body = formatLaunchAlert(launch, profile, manifest);
  const created = store.recordLaunch(launch, profile, body, config.telegramChatIds);
  if (created) {
    logger.info({ token: launch.token, event: launch.eventName, tx: launch.transactionHash, block: launch.blockNumber.toString() }, 'canonical Flywheel launch recorded');
    await notifier.drain(store);
  }
}

const scanner = new DurableScanner(client, store, config, manifest, {
  onLaunch: recordLaunch,
  onReorg: async () => notifier.reconcileReorgAlerts(store),
}, logger);

async function main(): Promise<void> {
  const actualChain = await client.getChainId();
  if (actualChain !== config.chainId) throw new Error(`RPC chainId ${actualChain} does not match configured chainId ${config.chainId}`);
  logger.info({ config: redactConfig(config), integration: manifest.id }, 'starting launch watcher');

  await scanner.scanOnce();
  const interval = setInterval(() => {
    void scanner.scanOnce().catch((error) => logger.error({ err: error }, 'HTTP scanner iteration failed'));
  }, config.pollIntervalMs);
  const stopCommands = startAdminCommands(notifier, config, store, logger);

  const unwatch = websocketClient
    ? (websocketClient as unknown as { watchEvent(options: { address: readonly `0x${string}`[]; events: unknown; onLogs(logs: readonly ChainLog[]): void; onError(error: Error): void }): () => void }).watchEvent({
      address: manifest.factories.map((factory) => factory.address),
      events: [manifest.launch.event],
      onLogs: (logs) => {
        void scanner.processLogs(logs).catch((error) => logger.error({ err: error }, 'websocket launch processing failed'));
      },
      onError: (error) => logger.warn({ err: error }, 'websocket subscription error; HTTP recovery remains active'),
    })
    : undefined;
  if (websocketClient) logger.info('websocket low-latency subscription enabled');
  else logger.warn('WS_RPC_URL missing; HTTP polling is the only ingestion path');

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'shutting down');
    clearInterval(interval);
    unwatch?.();
    stopCommands();
    store.close();
    process.exit(0);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

void main().catch((error) => {
  logger.fatal({ err: error }, 'startup failed');
  store.close();
  process.exitCode = 1;
});
