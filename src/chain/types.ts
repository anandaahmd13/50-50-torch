import type { Address, Hex } from 'viem';
import type { TaxSplitBps } from '../integrations/types.js';

export interface ChainLog {
  address: Address;
  topics: readonly Hex[];
  data: Hex;
  blockNumber: bigint | null;
  blockHash: Hex | null;
  transactionHash: Hex | null;
  logIndex: number | null;
  removed?: boolean;
}

export interface DecodedLaunch {
  eventName: string;
  factory: Address;
  token: Address;
  creator: Address;
  quoteAsset: Address;
  poolId: Hex;
  buyTaxBps: bigint;
  lpFee: bigint;
  antiSnipeSeconds: bigint;
  splitBps: TaxSplitBps;
  transactionHash: Hex;
  logIndex: number;
  blockNumber: bigint;
  blockHash: Hex;
}

export interface TokenMetadata {
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: bigint;
  logoUri?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  unavailable: readonly string[];
}

export interface QuoteAssetMetadata {
  address: Address;
  name?: string;
  symbol?: string;
  decimals?: number;
  native?: boolean;
  unavailable: readonly string[];
}

export interface LaunchEnrichment {
  token: TokenMetadata;
  quote: QuoteAssetMetadata;
}

/** Immutable values observed at launch block, not later latest block. */
export interface CreatorSnapshot {
  nonce?: bigint;
  nativeBalance?: bigint;
  tokenBalance?: bigint;
  tokenPercentageBps?: bigint;
  deployCount?: number;
  unavailable: readonly string[];
}

export interface LaunchProfile extends LaunchEnrichment {
  creator: CreatorSnapshot;
}
