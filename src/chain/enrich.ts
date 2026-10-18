import type { DecodedLaunch, LaunchEnrichment, QuoteAssetMetadata, TokenMetadata } from './types.js';
import type { FlywheelClient } from './rpc.js';

const erc20Abi = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

const flywheelTokenAbi = [
  ...erc20Abi,
  { type: 'function', name: 'logoURI', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'description', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'website', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'twitter', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'telegram', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;

const withTimeout = async <T>(name: string, promise: Promise<T>, timeoutMs: number, unavailable: string[]): Promise<T | undefined> => {
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

/**
 * Metadata is read directly from the newly launched token and its quote token.
 * Individual parallel reads avoid assuming a Multicall deployment on Robinhood
 * Chain. The website indexer is not used for discovery or enrichment.
 */
export async function enrichLaunch(
  client: FlywheelClient,
  launch: DecodedLaunch,
  timeoutMs = 5_000,
): Promise<LaunchEnrichment> {
  const tokenUnavailable: string[] = [];
  const quoteUnavailable: string[] = [];
  const [name, symbol, decimals, totalSupply, logoUri, description, website, twitter, telegram, quoteName, quoteSymbol, quoteDecimals] = await Promise.all([
    withTimeout('name()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'name' }), timeoutMs, tokenUnavailable),
    withTimeout('symbol()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'symbol' }), timeoutMs, tokenUnavailable),
    withTimeout('decimals()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'decimals' }), timeoutMs, tokenUnavailable),
    withTimeout('totalSupply()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'totalSupply' }), timeoutMs, tokenUnavailable),
    withTimeout('logoURI()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'logoURI' }), timeoutMs, tokenUnavailable),
    withTimeout('description()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'description' }), timeoutMs, tokenUnavailable),
    withTimeout('website()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'website' }), timeoutMs, tokenUnavailable),
    withTimeout('twitter()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'twitter' }), timeoutMs, tokenUnavailable),
    withTimeout('telegram()', client.readContract({ address: launch.token, abi: flywheelTokenAbi, functionName: 'telegram' }), timeoutMs, tokenUnavailable),
    withTimeout('quote name()', client.readContract({ address: launch.quoteAsset, abi: erc20Abi, functionName: 'name' }), timeoutMs, quoteUnavailable),
    withTimeout('quote symbol()', client.readContract({ address: launch.quoteAsset, abi: erc20Abi, functionName: 'symbol' }), timeoutMs, quoteUnavailable),
    withTimeout('quote decimals()', client.readContract({ address: launch.quoteAsset, abi: erc20Abi, functionName: 'decimals' }), timeoutMs, quoteUnavailable),
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
  const quote: QuoteAssetMetadata = {
    address: launch.quoteAsset,
    name: asString(quoteName),
    symbol: asString(quoteSymbol),
    decimals: asNumber(quoteDecimals),
    unavailable: [...new Set(quoteUnavailable)],
  };
  return { token, quote };
}
