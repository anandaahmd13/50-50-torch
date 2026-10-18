import type { Address, Hex } from 'viem';
import type { LaunchEventName } from '../contracts/flywheel.js';

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
  eventName: LaunchEventName;
  factory: Address;
  token: Address;
  creator: Address;
  quoteAsset: Address;
  holderRewardsEnabled: boolean;
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
  unavailable: readonly string[];
}

export interface LaunchEnrichment {
  token: TokenMetadata;
  quote: QuoteAssetMetadata;
}
