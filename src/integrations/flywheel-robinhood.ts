import { keccak256, stringToHex } from 'viem';
import type { Abi, AbiEvent, Hex } from 'viem';
import type { LaunchpadManifest } from './types.js';

export const ROBINHOOD_CHAIN_ID = 4663;

export const flywheelTokenLaunchedEvent = {
  type: 'event',
  name: 'TokenLaunched',
  anonymous: false,
  inputs: [
    { name: 'token', type: 'address', indexed: true },
    { name: 'creator', type: 'address', indexed: true },
    { name: 'quote', type: 'address', indexed: true },
    { name: 'holders', type: 'bool', indexed: false },
  ],
} as const satisfies AbiEvent;

export const flywheelLaunchAbi = [flywheelTokenLaunchedEvent] as const satisfies Abi;

export const erc20MetadataAbi = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const satisfies Abi;

export const flywheelTokenMetadataAbi = [
  ...erc20MetadataAbi,
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'logoURI', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'description', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'website', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'twitter', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'telegram', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const satisfies Abi;

const integration = 'https://flywheel.cash/integrations/20261013/';

/**
 * Review evidence is intentionally part of the manifest. New launchpads must
 * be added as a reviewed manifest; token addresses and website catalogs never
 * become discovery sources.
 */
export const flywheelRobinhoodManifest = {
  id: 'flywheel-robinhood',
  chain: {
    id: ROBINHOOD_CHAIN_ID,
    name: 'Robinhood Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  },
  factories: [
    {
      suite: 'robinhood-mainnet-v2',
      address: '0xF05A26e92E27b8F0385f6895F5507Db26A2F4b8d',
      startBlock: 87_735_162n,
      verification: 'VERIFIED',
      evidence: [
        `${integration}INDEXING.md`,
        `${integration}deployment.json`,
        'https://repo.sourcify.dev/4663/0xF05A26e92E27b8F0385f6895F5507Db26A2F4b8d',
      ],
    },
  ],
  launch: {
    abi: flywheelLaunchAbi,
    event: flywheelTokenLaunchedEvent,
    fieldNames: {
      token: 'token',
      creator: 'creator',
      quoteAsset: 'quote',
      holderRewardsEnabled: 'holders',
    },
  },
  tokenMetadata: {
    abi: flywheelTokenMetadataAbi,
    functions: {
      name: 'name', symbol: 'symbol', decimals: 'decimals', totalSupply: 'totalSupply', creatorBalance: 'balanceOf',
      logoUri: 'logoURI', description: 'description', website: 'website', twitter: 'twitter', telegram: 'telegram',
    },
  },
  quoteMetadata: {
    abi: erc20MetadataAbi,
    functions: { name: 'name', symbol: 'symbol', decimals: 'decimals' },
  },
  creatorDeployCounter: {
    initialChunkSize: 100_000n,
    minimumChunkSize: 100n,
  },
  links: {
    tokenPageLabel: '🌀 Flywheel ↗',
    tokenPage: 'https://flywheel.cash/v2/token/',
    contractPage: 'https://robinhoodchain.blockscout.com/token/',
    creatorPage: 'https://robinhoodchain.blockscout.com/address/',
    transactionPage: 'https://robinhoodchain.blockscout.com/tx/',
    buyLinks: [
      { label: '🛒 Buy on GMGN ↗', urlPrefix: 'https://gmgn.ai/robinhood/token/kX4rUcuP_' },
      { label: '🚀 Buy on Based Bot ↗', urlPrefix: 'https://t.me/based_eth_bot?start=r_odglug69420_b_' },
    ],
  },
  evidence: [
    `${integration}index.html`,
    `${integration}INDEXING.md`,
    `${integration}deployment.json`,
  ],
} as const satisfies LaunchpadManifest;

export const flywheelLaunchTopic = keccak256(stringToHex('TokenLaunched(address,address,address,bool)')) as Hex;
