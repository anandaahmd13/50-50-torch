import { createPublicClient, defineChain, fallback, http, webSocket } from 'viem';
import type { AppConfig } from '../config.js';
import type { LaunchpadManifest } from '../integrations/types.js';

export function createManifestChain(manifest: LaunchpadManifest) {
  return defineChain({
    id: manifest.chain.id,
    name: manifest.chain.name,
    nativeCurrency: manifest.chain.nativeCurrency,
    rpcUrls: { default: { http: [manifest.chain.rpcUrl] } },
  });
}

export function createHttpClient(config: AppConfig, manifest: LaunchpadManifest) {
  return createPublicClient({
    chain: createManifestChain(manifest),
    transport: fallback(config.httpRpcUrls.map((url) => http(url, { retryCount: 2, timeout: 12_000 }))),
  });
}

export type ChainClient = ReturnType<typeof createHttpClient>;

export function createWebSocketClient(config: AppConfig, manifest: LaunchpadManifest) {
  if (!config.wsRpcUrl) return undefined;
  return createPublicClient({
    chain: createManifestChain(manifest),
    transport: webSocket(config.wsRpcUrl, { retryDelay: 1_000, timeout: 12_000 }),
  });
}

export function isLogRangeError(error: unknown): boolean {
  if (isRpcHeadLagError(error)) return false;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /(?:range|limit|too many|query returned more than|max results|response size|exceed)/.test(message);
}

/** A load-balanced RPC can answer getBlockNumber ahead of getLogs backend. */
export function isRpcHeadLagError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /block range extends beyond (?:the )?(?:current |latest )?head(?: block)?/.test(message)
    || /requested \d+, head \d+/.test(message);
}
