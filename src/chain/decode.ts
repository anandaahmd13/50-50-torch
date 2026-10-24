import { decodeEventLog, getAddress } from 'viem';
import type { Address, Hex } from 'viem';
import { flywheelRobinhoodManifest } from '../integrations/flywheel-robinhood.js';
import { launchEventTopic } from '../integrations/registry.js';
import type { LaunchpadManifest } from '../integrations/types.js';
import type { ChainLog, DecodedLaunch } from './types.js';

type EventArgs = Record<string, unknown>;

function asAddress(value: unknown): Address | undefined {
  return typeof value === 'string' ? getAddress(value) : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** Decode only the reviewed launch event in the active integration manifest. */
export function decodeLaunchLog(
  log: ChainLog,
  manifest: LaunchpadManifest = flywheelRobinhoodManifest,
): DecodedLaunch | undefined {
  const topic0 = log.topics[0]?.toLowerCase();
  if (!topic0 || launchEventTopic(manifest).toLowerCase() !== topic0) return undefined;
  if (log.blockNumber === null || log.blockHash === null || log.transactionHash === null || log.logIndex === null) {
    throw new Error('Cannot persist an unresolved log without block, transaction hash, and log index');
  }

  const decoded = decodeEventLog({
    abi: manifest.launch.abi,
    data: log.data,
    topics: log.topics as [Hex, ...Hex[]],
    strict: true,
  });
  if (decoded.eventName !== manifest.launch.event.name) return undefined;

  const args = decoded.args as unknown as EventArgs;
  const { fieldNames } = manifest.launch;
  const token = asAddress(args[fieldNames.token]);
  const creator = asAddress(args[fieldNames.creator]);
  const quoteAsset = asAddress(args[fieldNames.quoteAsset]);
  const holderRewardsEnabled = asBoolean(args[fieldNames.holderRewardsEnabled]);
  if (!token || !creator || !quoteAsset || holderRewardsEnabled === undefined) {
    throw new Error(`Malformed ${decoded.eventName}: missing required launch field`);
  }
  return {
    eventName: decoded.eventName,
    factory: getAddress(log.address),
    token,
    creator,
    quoteAsset,
    holderRewardsEnabled,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    blockNumber: log.blockNumber,
    blockHash: log.blockHash,
  };
}
