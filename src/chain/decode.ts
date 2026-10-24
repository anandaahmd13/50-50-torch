import { decodeEventLog, getAddress } from 'viem';
import type { Address, Hex } from 'viem';
import { launchEventTopic } from '../integrations/registry.js';
import type { EventFieldPath, LaunchpadManifest, TaxSplitBps } from '../integrations/types.js';
import type { ChainLog, DecodedLaunch } from './types.js';

type EventArgs = Record<string, unknown>;

function valueAtPath(args: EventArgs, path: EventFieldPath): unknown {
  let value: unknown = args;
  for (const part of path) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function asAddress(value: unknown): Address | undefined {
  return typeof value === 'string' ? getAddress(value) : undefined;
}

function asBigInt(value: unknown): bigint | undefined {
  if (typeof value === 'bigint') return value;
  return typeof value === 'number' && Number.isSafeInteger(value) ? BigInt(value) : undefined;
}

function asHex(value: unknown): Hex | undefined {
  return typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value) ? value as Hex : undefined;
}

function decodeSplit(args: EventArgs, manifest: LaunchpadManifest): TaxSplitBps {
  const mapping = manifest.launch.fieldNames.split;
  const split = {
    creatorBps: asBigInt(valueAtPath(args, mapping.creatorBps)),
    burnBps: asBigInt(valueAtPath(args, mapping.burnBps)),
    holdersBps: asBigInt(valueAtPath(args, mapping.holdersBps)),
    liquidityBps: asBigInt(valueAtPath(args, mapping.liquidityBps)),
  };
  if (Object.values(split).some((value) => value === undefined)) {
    throw new Error('Malformed TokenLaunched: missing tax split field');
  }
  const normalized = split as TaxSplitBps;
  if (Object.values(normalized).some((value) => value < 0n || value > 10_000n)) {
    throw new Error('Malformed TokenLaunched: tax split BPS is out of range');
  }
  if (normalized.creatorBps + normalized.burnBps + normalized.holdersBps + normalized.liquidityBps !== 10_000n) {
    throw new Error('Malformed TokenLaunched: tax split must total 10000 BPS');
  }
  return normalized;
}

/** Decode only reviewed launch event in supplied integration manifest. */
export function decodeLaunchLog(log: ChainLog, manifest: LaunchpadManifest): DecodedLaunch | undefined {
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
  const token = asAddress(valueAtPath(args, fieldNames.token));
  const creator = asAddress(valueAtPath(args, fieldNames.creator));
  const quoteAsset = asAddress(valueAtPath(args, fieldNames.quoteAsset));
  const poolId = asHex(valueAtPath(args, fieldNames.poolId));
  const buyTaxBps = asBigInt(valueAtPath(args, fieldNames.buyTaxBps));
  const lpFee = asBigInt(valueAtPath(args, fieldNames.lpFee));
  const antiSnipeSeconds = asBigInt(valueAtPath(args, fieldNames.antiSnipeSeconds));
  if (!token || !creator || !quoteAsset || !poolId || buyTaxBps === undefined || lpFee === undefined || antiSnipeSeconds === undefined) {
    throw new Error(`Malformed ${decoded.eventName}: missing required launch field`);
  }
  return {
    eventName: decoded.eventName,
    factory: getAddress(log.address),
    token,
    creator,
    quoteAsset,
    poolId,
    buyTaxBps,
    lpFee,
    antiSnipeSeconds,
    splitBps: decodeSplit(args, manifest),
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    blockNumber: log.blockNumber,
    blockHash: log.blockHash,
  };
}

export function isAlertEligible(launch: DecodedLaunch, manifest: LaunchpadManifest): boolean {
  const expected = manifest.launch.eligibleSplit;
  const actual = launch.splitBps;
  return actual.creatorBps === expected.creatorBps
    && actual.burnBps === expected.burnBps
    && actual.holdersBps === expected.holdersBps
    && actual.liquidityBps === expected.liquidityBps;
}
