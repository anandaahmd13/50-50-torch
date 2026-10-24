import type { DecodedLaunch, LaunchEnrichment, LaunchProfile, QuoteAssetMetadata, TokenMetadata } from './types.js';
import type { ChainClient } from './rpc.js';
import { isLogRangeError } from './rpc.js';
import type { LaunchpadManifest } from '../integrations/types.js';

export const withTimeout = async <T>(name: string, promise: Promise<T>, timeoutMs: number, unavailable: string[]): Promise<T | undefined> => {
  let timer: number | undefined;
  try {
    const value = await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
      }),
    ]);
    if (value === undefined) unavailable.push(name);
    return value;
  } catch {
    unavailable.push(name);
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const asString = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined => typeof value === 'number' ? value : undefined;
const asBigInt = (value: unknown): bigint | undefined => typeof value === 'bigint' ? value : undefined;

function readNoArg(
  client: ChainClient,
  address: DecodedLaunch['token'],
  abi: LaunchpadManifest['tokenMetadata']['abi'],
  functionName: string | undefined,
  blockNumber: bigint,
  timeoutMs: number,
  unavailable: string[],
  label = functionName,
): Promise<unknown | undefined> {
  if (!functionName) return Promise.resolve(undefined);
  return withTimeout(label ?? functionName, client.readContract({
    address,
    abi,
    functionName: functionName as never,
    blockNumber,
  } as never) as Promise<unknown>, timeoutMs, unavailable);
}

function readCreatorTokenBalance(
  client: ChainClient,
  manifest: LaunchpadManifest,
  launch: DecodedLaunch,
): Promise<unknown> {
  return client.readContract({
    address: launch.token,
    abi: manifest.tokenMetadata.abi,
    functionName: manifest.tokenMetadata.functions.creatorBalance as never,
    args: [launch.creator],
    blockNumber: launch.blockNumber,
  } as never) as Promise<unknown>;
}

function isNativeQuote(manifest: LaunchpadManifest, quote: DecodedLaunch['quoteAsset']): boolean {
  return manifest.nativeQuoteAddresses.some((address) => address.toLowerCase() === quote.toLowerCase());
}

/**
 * Metadata is read at launch block. Native quotes derive from manifest, never
 * ERC-20 calls to zero address. Individual failure never suppresses alert.
 */
export async function enrichLaunch(
  client: ChainClient,
  manifest: LaunchpadManifest,
  launch: DecodedLaunch,
  timeoutMs = 5_000,
): Promise<LaunchEnrichment> {
  const tokenUnavailable: string[] = [];
  const tokenFunctions = manifest.tokenMetadata.functions;
  const [name, symbol, decimals, totalSupply, logoUri, description, website, twitter, telegram] = await Promise.all([
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.name, launch.blockNumber, timeoutMs, tokenUnavailable),
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.symbol, launch.blockNumber, timeoutMs, tokenUnavailable),
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.decimals, launch.blockNumber, timeoutMs, tokenUnavailable),
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.totalSupply, launch.blockNumber, timeoutMs, tokenUnavailable),
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.logoUri, launch.blockNumber, timeoutMs, tokenUnavailable),
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.description, launch.blockNumber, timeoutMs, tokenUnavailable),
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.website, launch.blockNumber, timeoutMs, tokenUnavailable),
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.twitter, launch.blockNumber, timeoutMs, tokenUnavailable),
    readNoArg(client, launch.token, manifest.tokenMetadata.abi, tokenFunctions.telegram, launch.blockNumber, timeoutMs, tokenUnavailable),
  ]);

  const token: TokenMetadata = {
    name: asString(name),
    symbol: asString(symbol),
    decimals: asNumber(decimals),
    totalSupply: asBigInt(totalSupply),
    logoUri: asString(logoUri),
    description: asString(description),
    website: asString(website),
    twitter: asString(twitter),
    telegram: asString(telegram),
    unavailable: [...new Set(tokenUnavailable)],
  };
  const quote = isNativeQuote(manifest, launch.quoteAsset)
    ? nativeQuote(manifest, launch)
    : await enrichErc20Quote(client, manifest, launch, timeoutMs);
  return { token, quote };
}

function nativeQuote(manifest: LaunchpadManifest, launch: DecodedLaunch): QuoteAssetMetadata {
  return {
    address: launch.quoteAsset,
    name: manifest.chain.nativeCurrency.name,
    symbol: manifest.chain.nativeCurrency.symbol,
    decimals: manifest.chain.nativeCurrency.decimals,
    native: true,
    unavailable: [],
  };
}

async function enrichErc20Quote(
  client: ChainClient,
  manifest: LaunchpadManifest,
  launch: DecodedLaunch,
  timeoutMs: number,
): Promise<QuoteAssetMetadata> {
  const unavailable: string[] = [];
  const functions = manifest.quoteMetadata.functions;
  const [name, symbol, decimals] = await Promise.all([
    readNoArg(client, launch.quoteAsset, manifest.quoteMetadata.abi, functions.name, launch.blockNumber, timeoutMs, unavailable, 'quote name'),
    readNoArg(client, launch.quoteAsset, manifest.quoteMetadata.abi, functions.symbol, launch.blockNumber, timeoutMs, unavailable, 'quote symbol'),
    readNoArg(client, launch.quoteAsset, manifest.quoteMetadata.abi, functions.decimals, launch.blockNumber, timeoutMs, unavailable, 'quote decimals'),
  ]);
  return {
    address: launch.quoteAsset,
    name: asString(name),
    symbol: asString(symbol),
    decimals: asNumber(decimals),
    unavailable: [...new Set(unavailable)],
  };
}

/** Read creator facts at exact post-transaction state of launch block. */
export async function profileLaunch(
  client: ChainClient,
  manifest: LaunchpadManifest,
  launch: DecodedLaunch,
  timeoutMs = 5_000,
): Promise<LaunchProfile> {
  const unavailable: string[] = [];
  const [enrichment, nonce, nativeBalance, tokenBalance, deployCount] = await Promise.all([
    enrichLaunch(client, manifest, launch, timeoutMs),
    withTimeout('creator nonce', client.getTransactionCount({ address: launch.creator, blockNumber: launch.blockNumber }), timeoutMs, unavailable),
    withTimeout('creator native balance', client.getBalance({ address: launch.creator, blockNumber: launch.blockNumber }), timeoutMs, unavailable),
    withTimeout('creator token balance', readCreatorTokenBalance(client, manifest, launch), timeoutMs, unavailable),
    withTimeout('creator deploy count', countCreatorLaunches(client, manifest, launch), timeoutMs, unavailable),
  ]);
  const creatorTokenBalance = asBigInt(tokenBalance);
  const supply = enrichment.token.totalSupply;
  return {
    ...enrichment,
    creator: {
      nonce: asBigInt(nonce),
      nativeBalance: asBigInt(nativeBalance),
      tokenBalance: creatorTokenBalance,
      tokenPercentageBps: creatorTokenBalance !== undefined && supply !== undefined && supply > 0n
        ? (creatorTokenBalance * 10_000n + supply / 2n) / supply
        : undefined,
      deployCount: typeof deployCount === 'number' ? deployCount : undefined,
      unavailable: [...new Set(unavailable)],
    },
  };
}

async function countCreatorLaunches(
  client: ChainClient,
  manifest: LaunchpadManifest,
  launch: DecodedLaunch,
): Promise<number> {
  let total = 0;
  for (const factory of manifest.factories) {
    let fromBlock = factory.startBlock;
    let chunkSize = manifest.creatorDeployCounter.initialChunkSize;
    while (fromBlock <= launch.blockNumber) {
      const toBlock = fromBlock + chunkSize - 1n > launch.blockNumber
        ? launch.blockNumber
        : fromBlock + chunkSize - 1n;
      try {
        const logs = await client.getLogs({
          address: factory.address,
          event: manifest.launch.event as never,
          args: { [manifest.launch.fieldNames.creator[0]]: launch.creator } as never,
          fromBlock,
          toBlock,
        }) as unknown as readonly unknown[];
        total += logs.length;
        fromBlock = toBlock + 1n;
        if (chunkSize < manifest.creatorDeployCounter.initialChunkSize) {
          chunkSize = chunkSize * 2n > manifest.creatorDeployCounter.initialChunkSize
            ? manifest.creatorDeployCounter.initialChunkSize
            : chunkSize * 2n;
        }
      } catch (error) {
        if (isLogRangeError(error) && chunkSize > manifest.creatorDeployCounter.minimumChunkSize) {
          chunkSize = chunkSize / 2n < manifest.creatorDeployCounter.minimumChunkSize
            ? manifest.creatorDeployCounter.minimumChunkSize
            : chunkSize / 2n;
          continue;
        }
        throw error;
      }
    }
  }
  return total;
}
