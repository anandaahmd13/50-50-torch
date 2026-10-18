import { keccak256, stringToHex } from 'viem';
import type { Address, Hex } from 'viem';

export const ROBINHOOD_CHAIN_ID = 4663;

/**
 * Source-of-truth registry. Launches are discovered only from this reviewed
 * Flywheel V2 factory, never from a token address or the website catalog.
 */
export const flywheelLaunchAbi = [
  {
    type: 'event',
    name: 'TokenLaunched',
    anonymous: false,
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'quote', type: 'address', indexed: true },
      { name: 'holders', type: 'bool', indexed: false },
    ],
  },
] as const;

export const launchEventNames = ['TokenLaunched'] as const;
export type LaunchEventName = (typeof launchEventNames)[number];
export const flywheelLaunchEvents = flywheelLaunchAbi;

const eventTopic = (signature: string) => keccak256(stringToHex(signature));

export const launchTopics = {
  TokenLaunched: eventTopic('TokenLaunched(address,address,address,bool)'),
} as const satisfies Record<LaunchEventName, Hex>;

export type Verification = 'VERIFIED';

export interface VerifiedAddress {
  address: Address;
  verification: Verification;
  evidence: readonly string[];
}

export interface FlywheelFactory extends VerifiedAddress {
  suite: string;
  /** First Robinhood Chain block where factory runtime bytecode is present. */
  startBlock: bigint;
}

const integration = 'https://flywheel.cash/integrations/20261013/';

/**
 * Evidence review, 2026-10-18:
 * - Flywheel's integration bundle documents the factory ABI, deployment
 *   transaction, and discovery start block.
 * - The same bundle links to Sourcify's exact verification record.
 */
export const flywheelFactories = [
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
] as const satisfies readonly FlywheelFactory[];

export const flywheelComponents = {
  hooks: [
    {
      address: '0x992118dE23b4eBE9F527dacbbb7D8D4bBbf8E044',
      verification: 'VERIFIED',
      evidence: [`${integration}deployment.json`],
    },
  ],
} as const satisfies { hooks: readonly VerifiedAddress[] };

export const factoryAddresses = flywheelFactories.map((factory) => factory.address);
export const launchTopicValues = Object.values(launchTopics);

export function assertVerifiedRegistry(chainId: number): void {
  if (chainId !== ROBINHOOD_CHAIN_ID) {
    throw new Error(`Flywheel registry is Robinhood Chain-only (chainId ${ROBINHOOD_CHAIN_ID}), got ${chainId}`);
  }
  if (!flywheelFactories.length || !launchTopicValues.length) {
    throw new Error('Refusing to start: Flywheel factory/event registry is empty');
  }
  for (const factory of flywheelFactories) {
    if (factory.verification !== 'VERIFIED' || factory.startBlock < 1n) {
      throw new Error(`Refusing to start: factory ${factory.address} is not VERIFIED with a start block`);
    }
  }
  for (const [name, topic] of Object.entries(launchTopics)) {
    if (!/^0x[0-9a-f]{64}$/i.test(topic)) {
      throw new Error(`Refusing to start: ${name} does not have a valid topic0`);
    }
  }
}

export function isVerifiedFactory(address: Address): boolean {
  return flywheelFactories.some((factory) => factory.address.toLowerCase() === address.toLowerCase());
}

export function isVerifiedHook(address: Address | undefined): boolean {
  return Boolean(
    address && flywheelComponents.hooks.some((hook) => hook.address.toLowerCase() === address.toLowerCase()),
  );
}
