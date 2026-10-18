import { decodeEventLog, getAddress } from 'viem';
import type { Address, Hex } from 'viem';
import {
  flywheelLaunchAbi,
  launchEventNames,
  launchTopicValues,
} from '../contracts/flywheel.js';
import type { ChainLog, DecodedLaunch } from './types.js';

type EventArgs = Record<string, unknown>;

function asAddress(value: unknown): Address | undefined {
  return typeof value === 'string' ? getAddress(value) : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** Decode only Flywheel V2 StandardLaunchFactory.TokenLaunched logs. */
export function decodeLaunchLog(log: ChainLog): DecodedLaunch | undefined {
  const topic0 = log.topics[0]?.toLowerCase();
  if (!topic0 || !launchTopicValues.some((topic) => topic.toLowerCase() === topic0)) return undefined;
  if (log.blockNumber === null || log.blockHash === null || log.transactionHash === null || log.logIndex === null) {
    throw new Error('Cannot persist an unresolved log without block, transaction hash, and log index');
  }

  const decoded = decodeEventLog({
    abi: flywheelLaunchAbi,
    data: log.data,
    topics: log.topics as [Hex, ...Hex[]],
    strict: true,
  });
  if (!launchEventNames.includes(decoded.eventName as (typeof launchEventNames)[number])) return undefined;

  const args = decoded.args as EventArgs;
  const token = asAddress(args.token);
  const creator = asAddress(args.creator);
  const quoteAsset = asAddress(args.quote);
  const holderRewardsEnabled = asBoolean(args.holders);
  if (!token || !creator || !quoteAsset || holderRewardsEnabled === undefined) {
    throw new Error(`Malformed ${decoded.eventName}: missing required launch field`);
  }
  return {
    eventName: decoded.eventName as DecodedLaunch['eventName'],
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
