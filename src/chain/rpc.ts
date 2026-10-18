import { createPublicClient, defineChain, fallback, http, webSocket } from 'viem';
import type { AppConfig } from '../config.js';

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Robinhood Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
});

export function createHttpClient(config: AppConfig) {
  return createPublicClient({
    chain: robinhoodChain,
    transport: fallback(config.httpRpcUrls.map((url) => http(url, { retryCount: 2, timeout: 12_000 }))),
  });
}

export type FlywheelClient = ReturnType<typeof createHttpClient>;

export function createWebSocketClient(config: AppConfig) {
  if (!config.wsRpcUrl) return undefined;
  return createPublicClient({
    chain: robinhoodChain,
    transport: webSocket(config.wsRpcUrl, { retryDelay: 1_000, timeout: 12_000 }),
  });
}

export function isLogRangeError(error: unknown): boolean {
  if (isRpcHeadLagError(error)) return false;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /(?:range|limit|too many|query returned more than|max results|response size|exceed)/.test(message);
}

/** A load-balanced RPC can answer getBlockNumber ahead of its getLogs backend. */
export function isRpcHeadLagError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /block range extends beyond (?:the )?(?:current |latest )?head(?: block)?/.test(message)
    || /requested \d+, head \d+/.test(message);
}
