import { isAddress, keccak256, stringToHex } from 'viem';
import type { Hex } from 'viem';
import { flywheelRobinhoodManifest } from './flywheel-robinhood.js';
import type { LaunchpadManifest } from './types.js';

const manifests = [flywheelRobinhoodManifest] as const satisfies readonly LaunchpadManifest[];

export function getIntegration(id: string): LaunchpadManifest {
  const manifest = manifests.find((candidate) => candidate.id === id);
  if (!manifest) throw new Error(`Unknown INTEGRATION_ID ${id}. Registered integrations: ${manifests.map((item) => item.id).join(', ')}`);
  return manifest;
}

export function listIntegrations(): readonly LaunchpadManifest[] {
  return manifests;
}

export function launchEventSignature(manifest: LaunchpadManifest): string {
  return `${manifest.launch.event.name}(${manifest.launch.event.inputs.map((input) => input.type).join(',')})`;
}

export function launchEventTopic(manifest: LaunchpadManifest): Hex {
  return keccak256(stringToHex(launchEventSignature(manifest)));
}

/** Refuse an incomplete or unreviewed integration before any RPC calls occur. */
export function assertVerifiedManifest(manifest: LaunchpadManifest, chainId: number): void {
  if (manifest.chain.id !== chainId) {
    throw new Error(`Integration ${manifest.id} is chainId ${manifest.chain.id}, got ${chainId}`);
  }
  if (!manifest.id || !manifest.evidence.length || !manifest.factories.length) {
    throw new Error(`Integration ${manifest.id || '(unnamed)'} is missing identity, evidence, or factories`);
  }
  if (manifest.launch.event.type !== 'event' || manifest.launch.event.anonymous || !manifest.launch.event.name) {
    throw new Error(`Integration ${manifest.id} has an invalid launch event`);
  }
  if (!manifest.launch.abi.some((entry) => entry.type === 'event' && entry.name === manifest.launch.event.name)) {
    throw new Error(`Integration ${manifest.id} launch event is absent from its ABI`);
  }
  if (manifest.creatorDeployCounter.minimumChunkSize < 1n || manifest.creatorDeployCounter.initialChunkSize < manifest.creatorDeployCounter.minimumChunkSize) {
    throw new Error(`Integration ${manifest.id} has invalid creator deployment scan limits`);
  }
  for (const factory of manifest.factories) {
    if (factory.verification !== 'VERIFIED' || factory.startBlock < 1n || !isAddress(factory.address) || !factory.evidence.length) {
      throw new Error(`Integration ${manifest.id} contains an unverified or invalid factory`);
    }
  }

  const inputs = new Map(manifest.launch.event.inputs.map((input) => [input.name, input]));
  const expected = {
    token: 'address',
    creator: 'address',
    quoteAsset: 'address',
    holderRewardsEnabled: 'bool',
  } as const;
  for (const [field, type] of Object.entries(expected)) {
    const name = manifest.launch.fieldNames[field as keyof typeof expected];
    if (inputs.get(name)?.type !== type) throw new Error(`Integration ${manifest.id} has invalid ${field} event mapping`);
  }
  for (const [field, name] of Object.entries(manifest.tokenMetadata.functions)) {
    if (field === 'creatorBalance') continue;
    if (name && !hasNoArgFunction(manifest.tokenMetadata.abi, name)) {
      throw new Error(`Integration ${manifest.id} has invalid token metadata function ${field}`);
    }
  }
  for (const [field, name] of Object.entries(manifest.quoteMetadata.functions)) {
    if (!hasNoArgFunction(manifest.quoteMetadata.abi, name)) {
      throw new Error(`Integration ${manifest.id} has invalid quote metadata function ${field}`);
    }
  }
  if (!hasBalanceFunction(manifest.tokenMetadata.abi, manifest.tokenMetadata.functions.creatorBalance)) {
    throw new Error(`Integration ${manifest.id} has invalid creator token balance function`);
  }
  if (!/^0x[0-9a-f]{64}$/i.test(launchEventTopic(manifest))) {
    throw new Error(`Integration ${manifest.id} launch event has an invalid topic`);
  }
}

function hasNoArgFunction(abi: LaunchpadManifest['launch']['abi'], name: string): boolean {
  return abi.some((entry) => entry.type === 'function' && entry.name === name && entry.inputs.length === 0);
}

function hasBalanceFunction(abi: LaunchpadManifest['launch']['abi'], name: string): boolean {
  return abi.some((entry) => entry.type === 'function'
    && entry.name === name
    && entry.inputs.length === 1
    && entry.inputs[0]?.type === 'address');
}
