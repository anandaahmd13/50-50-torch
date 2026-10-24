import type { Abi, AbiEvent } from 'viem';
import { zeroAddress } from 'viem';
import type { LaunchpadManifest } from './types.js';

export const ROBINHOOD_CHAIN_ID = 4663;

export const torchTokenLaunchedEvent = {
  type: 'event',
  name: 'TokenLaunched',
  anonymous: false,
  inputs: [
    { name: 'token', type: 'address', indexed: true },
    { name: 'creator', type: 'address', indexed: true },
    { name: 'poolId', type: 'bytes32', indexed: false },
    { name: 'buyTaxBps', type: 'uint256', indexed: false },
    { name: 'lpFee', type: 'uint24', indexed: false },
    { name: 'antiSnipeSeconds', type: 'uint256', indexed: false },
    {
      name: 'split',
      type: 'tuple',
      indexed: false,
      components: [
        { name: 'creatorBps', type: 'uint16' },
        { name: 'burnBps', type: 'uint16' },
        { name: 'holdersBps', type: 'uint16' },
        { name: 'liquidityBps', type: 'uint16' },
      ],
    },
    { name: 'contractURI', type: 'string', indexed: false },
    { name: 'quote', type: 'address', indexed: false },
  ],
} as const satisfies AbiEvent;

export const torchLaunchAbi = [torchTokenLaunchedEvent] as const satisfies Abi;

export const erc20MetadataAbi = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const satisfies Abi;

export const torchTokenMetadataAbi = [
  ...erc20MetadataAbi,
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const satisfies Abi;

const factory = '0x7891eA889899928aFE637e4Cca8106188427776a';
const factorySource = 'https://robinhoodchain.blockscout.com/address/0x7891eA889899928aFE637e4Cca8106188427776a?tab=contract';
const factoryDeployment = 'https://robinhoodchain.blockscout.com/tx/0x94ed6872334462ba95ff71adb3471868dd5a777ae743f41cc0fa40df3dcead36';

/**
 * Reviewed canonical Torchpad factory on Robinhood Chain. Discovery always
 * starts from this factory event; site catalogs and token metadata are not
 * discovery sources.
 */
export const torchRobinhoodManifest = {
  id: 'torch-robinhood',
  chain: {
    id: ROBINHOOD_CHAIN_ID,
    name: 'Robinhood Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  },
  factories: [
    {
      suite: 'torchpad-robinhood-mainnet',
      address: factory,
      startBlock: 85_204_474n,
      verification: 'VERIFIED',
      evidence: [
        'https://docs.torchpad.fun/protocol/contract-addresses',
        factorySource,
        factoryDeployment,
      ],
    },
  ],
  launch: {
    abi: torchLaunchAbi,
    event: torchTokenLaunchedEvent,
    fieldNames: {
      token: ['token'],
      creator: ['creator'],
      quoteAsset: ['quote'],
      poolId: ['poolId'],
      buyTaxBps: ['buyTaxBps'],
      lpFee: ['lpFee'],
      antiSnipeSeconds: ['antiSnipeSeconds'],
      split: {
        creatorBps: ['split', 'creatorBps'],
        burnBps: ['split', 'burnBps'],
        holdersBps: ['split', 'holdersBps'],
        liquidityBps: ['split', 'liquidityBps'],
      },
    },
    eligibleSplit: {
      creatorBps: 5_000n,
      burnBps: 5_000n,
      holdersBps: 0n,
      liquidityBps: 0n,
    },
  },
  nativeQuoteAddresses: [zeroAddress],
  tokenMetadata: {
    abi: torchTokenMetadataAbi,
    functions: {
      name: 'name', symbol: 'symbol', decimals: 'decimals', totalSupply: 'totalSupply', creatorBalance: 'balanceOf',
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
    tokenPageLabel: '🔥 Torchpad ↗',
    tokenPage: 'https://app.torchpad.fun/trade/robinhood/',
    contractPage: 'https://robinhoodchain.blockscout.com/token/',
    creatorPage: 'https://robinhoodchain.blockscout.com/address/',
    transactionPage: 'https://robinhoodchain.blockscout.com/tx/',
    buyLinks: [
      { label: '🛒 Buy on GMGN ↗', urlPrefix: 'https://gmgn.ai/robinhood/token/kX4rUcuP_' },
      { label: '🚀 Buy on Based Bot ↗', urlPrefix: 'https://t.me/based_eth_bot?start=r_odglug69420_b_' },
    ],
  },
  evidence: [
    'https://docs.torchpad.fun/protocol/contract-addresses',
    factorySource,
    factoryDeployment,
    'https://robinhoodchain.blockscout.com/tx/0x20562c7a2365968dcb68439f21f9031c8fb1a148d56a0117db0d4bb3ed0c17d9',
  ],
} as const satisfies LaunchpadManifest;
