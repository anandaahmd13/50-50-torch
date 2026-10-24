import { isAddress, keccak256, stringToHex } from 'viem';
import type { AbiParameter, Hex } from 'viem';

type EventParameter = AbiParameter & { components?: readonly EventParameter[]; indexed?: boolean };
import { torchRobinhoodManifest } from './torch-robinhood.js';
import type { EventFieldPath, LaunchpadManifest } from './types.js';

const manifests = [torchRobinhoodManifest] as const satisfies readonly LaunchpadManifest[];

export function getIntegration(id: string): LaunchpadManifest {
  const manifest = manifests.find((candidate) => candidate.id === id);
  if (!manifest) throw new Error(`Unknown INTEGRATION_ID ${id}. Registered integrations: ${manifests.map((item) => item.id).join(', ')}`);
  return manifest;
}

export function listIntegrations(): readonly LaunchpadManifest[] {
  return manifests;
}

function canonicalAbiType(input: EventParameter): string {
  if (input.type !== 'tuple') return input.type;
  if (!input.components) throw new Error(`Tuple ${input.name || '(unnamed)'} is missing components`);
  return `(${input.components.map((component: EventParameter) => canonicalAbiType(component)).join(',')})`;
}

export function launchEventSignature(manifest: LaunchpadManifest): string {
  return `${manifest.launch.event.name}(${manifest.launch.event.inputs.map((input) => canonicalAbiType(input as EventParameter)).join(',')})`;
}

export function launchEventTopic(manifest: LaunchpadManifest): Hex {
  return keccak256(stringToHex(launchEventSignature(manifest)));
}

function resolveInput(inputs: readonly AbiParameter[], path: EventFieldPath): EventParameter | undefined {
  let candidates = inputs as readonly EventParameter[];
  let match: EventParameter | undefined;
  for (const part of path) {
    match = candidates.find((input) => input.name === part);
    if (!match) return undefined;
    candidates = match.components ?? [];
  }
  return match;
}

function splitTotal(split: LaunchpadManifest['launch']['eligibleSplit']): bigint {
  return split.creatorBps + split.burnBps + split.holdersBps + split.liquidityBps;
}

/** Refuse incomplete/unreviewed integration before any RPC calls occur. */
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
  if (!manifest.nativeQuoteAddresses.every((address) => isAddress(address))) {
    throw new Error(`Integration ${manifest.id} has an invalid native quote address`);
  }

  const { fieldNames } = manifest.launch;
  const expected = [
    ['token', fieldNames.token, 'address'],
    ['creator', fieldNames.creator, 'address'],
    ['quoteAsset', fieldNames.quoteAsset, 'address'],
    ['poolId', fieldNames.poolId, 'bytes32'],
    ['buyTaxBps', fieldNames.buyTaxBps, 'uint256'],
    ['lpFee', fieldNames.lpFee, 'uint24'],
    ['antiSnipeSeconds', fieldNames.antiSnipeSeconds, 'uint256'],
    ['creatorBps', fieldNames.split.creatorBps, 'uint16'],
    ['burnBps', fieldNames.split.burnBps, 'uint16'],
    ['holdersBps', fieldNames.split.holdersBps, 'uint16'],
    ['liquidityBps', fieldNames.split.liquidityBps, 'uint16'],
  ] as const;
  for (const [field, path, type] of expected) {
    if (resolveInput(manifest.launch.event.inputs, path)?.type !== type) {
      throw new Error(`Integration ${manifest.id} has invalid ${field} event mapping`);
    }
  }
  const creatorInput = resolveInput(manifest.launch.event.inputs, fieldNames.creator);
  if (fieldNames.creator.length !== 1 || !creatorInput?.indexed) {
    throw new Error(`Integration ${manifest.id} creator mapping must be a top-level indexed event input`);
  }
  for (const value of Object.values(manifest.launch.eligibleSplit)) {
    if (value < 0n || value > 10_000n) throw new Error(`Integration ${manifest.id} has invalid eligible split BPS`);
  }
  if (splitTotal(manifest.launch.eligibleSplit) !== 10_000n) {
    throw new Error(`Integration ${manifest.id} eligible split must total 10000 BPS`);
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
