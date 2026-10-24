import type { Abi, AbiEvent, Address } from 'viem';

export type Verification = 'VERIFIED';

export interface VerifiedAddress {
  address: Address;
  verification: Verification;
  evidence: readonly string[];
}

export interface LaunchpadFactory extends VerifiedAddress {
  /** First block at which reviewed factory runtime code exists. */
  startBlock: bigint;
  suite: string;
}

export type EventFieldPath = readonly [string, ...string[]];

export interface TaxSplitBps {
  creatorBps: bigint;
  burnBps: bigint;
  holdersBps: bigint;
  liquidityBps: bigint;
}

export interface LaunchFieldMapping {
  token: EventFieldPath;
  creator: EventFieldPath;
  quoteAsset: EventFieldPath;
  poolId: EventFieldPath;
  buyTaxBps: EventFieldPath;
  lpFee: EventFieldPath;
  antiSnipeSeconds: EventFieldPath;
  split: {
    creatorBps: EventFieldPath;
    burnBps: EventFieldPath;
    holdersBps: EventFieldPath;
    liquidityBps: EventFieldPath;
  };
}

export interface TokenMetadataFunctionMapping {
  name: string;
  symbol: string;
  decimals: string;
  totalSupply: string;
  logoUri?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  creatorBalance: string;
}

export interface QuoteMetadataFunctionMapping {
  name: string;
  symbol: string;
  decimals: string;
}

export interface LaunchpadLinks {
  tokenPageLabel: string;
  tokenPage: string;
  contractPage: string;
  creatorPage: string;
  transactionPage: string;
  buyLinks: readonly { label: string; urlPrefix: string }[];
}

export interface LaunchpadManifest {
  id: string;
  chain: {
    id: number;
    name: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrl: string;
  };
  factories: readonly LaunchpadFactory[];
  launch: {
    abi: Abi;
    event: AbiEvent;
    fieldNames: LaunchFieldMapping;
    eligibleSplit: TaxSplitBps;
  };
  /** Addresses emitted as quote assets that represent chain native currency. */
  nativeQuoteAddresses: readonly Address[];
  tokenMetadata: {
    abi: Abi;
    functions: TokenMetadataFunctionMapping;
  };
  quoteMetadata: {
    abi: Abi;
    functions: QuoteMetadataFunctionMapping;
  };
  /** Starting range and limits for on-chain creator launch counter. */
  creatorDeployCounter: {
    initialChunkSize: bigint;
    minimumChunkSize: bigint;
  };
  links: LaunchpadLinks;
  evidence: readonly string[];
}
