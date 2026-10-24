import type { Abi, AbiEvent, Address } from 'viem';

export type Verification = 'VERIFIED';

export interface VerifiedAddress {
  address: Address;
  verification: Verification;
  evidence: readonly string[];
}

export interface LaunchpadFactory extends VerifiedAddress {
  /** First block at which the reviewed factory runtime code exists. */
  startBlock: bigint;
  suite: string;
}

export interface LaunchFieldMapping {
  token: string;
  creator: string;
  quoteAsset: string;
  holderRewardsEnabled: string;
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
  };
  tokenMetadata: {
    abi: Abi;
    functions: TokenMetadataFunctionMapping;
  };
  quoteMetadata: {
    abi: Abi;
    functions: QuoteMetadataFunctionMapping;
  };
  /** Starting range and limits for the on-chain creator launch counter. */
  creatorDeployCounter: {
    initialChunkSize: bigint;
    minimumChunkSize: bigint;
  };
  links: LaunchpadLinks;
  evidence: readonly string[];
}
