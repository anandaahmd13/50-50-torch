import type { Address, Hex } from 'viem';
import { flywheelLaunchAbi, flywheelLaunchTopic, flywheelRobinhoodManifest, ROBINHOOD_CHAIN_ID } from '../integrations/flywheel-robinhood.js';
import { assertVerifiedManifest } from '../integrations/registry.js';

/** Compatibility exports for Flywheel-specific callers and fixtures. */
export { flywheelLaunchAbi, ROBINHOOD_CHAIN_ID };
export type { LaunchpadFactory as FlywheelFactory, Verification, VerifiedAddress } from '../integrations/types.js';

export const launchEventNames = ['TokenLaunched'] as const;
export type LaunchEventName = (typeof launchEventNames)[number];
export const flywheelLaunchEvents = [flywheelRobinhoodManifest.launch.event] as const;
export const launchTopics = { TokenLaunched: flywheelLaunchTopic } as const satisfies Record<LaunchEventName, Hex>;
export const flywheelFactories = flywheelRobinhoodManifest.factories;
export const flywheelComponents = {
  hooks: [
    {
      address: '0x992118dE23b4eBE9F527dacbbb7D8D4bBbf8E044',
      verification: 'VERIFIED',
      evidence: ['https://flywheel.cash/integrations/20261013/deployment.json'],
    },
  ],
} as const;
export const factoryAddresses = flywheelFactories.map((factory) => factory.address);
export const launchTopicValues = Object.values(launchTopics);

export function assertVerifiedRegistry(chainId: number): void {
  assertVerifiedManifest(flywheelRobinhoodManifest, chainId);
}

export function isVerifiedFactory(address: Address): boolean {
  return flywheelFactories.some((factory) => factory.address.toLowerCase() === address.toLowerCase());
}

export function isVerifiedHook(address: Address | undefined): boolean {
  return Boolean(address && flywheelComponents.hooks.some((hook) => hook.address.toLowerCase() === address.toLowerCase()));
}
