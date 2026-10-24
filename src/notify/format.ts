import { formatUnits } from 'viem';
import type { DecodedLaunch, LaunchProfile } from '../chain/types.js';
import type { LaunchpadManifest } from '../integrations/types.js';

const CONTROL_OR_BIDI = /[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/gu;

export function safeTelegramHtml(value: string | undefined, maxLength = 120): string {
  const cleaned = (value ?? '').replace(CONTROL_OR_BIDI, '').replace(/\s+/gu, ' ').trim();
  if (!cleaned) return '-';
  const shortened = [...cleaned].slice(0, maxLength).join('');
  return shortened.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
}

export function formatLaunchAlert(
  launch: DecodedLaunch,
  profile: LaunchProfile,
  manifest: LaunchpadManifest,
): string {
  const { token, quote, creator } = profile;
  const pairName = quote.name ?? quote.symbol;
  const quoteLabel = quote.native
    ? `${safeTelegramHtml(pairName)} (native)`
    : `<code>${quote.address}</code> (${safeTelegramHtml(pairName)})`;
  const split = launch.splitBps;
  const facts = [
    `🤖 <b>Token Address</b> : <code>${launch.token}</code>`,
    `<b>Name</b> : ${safeTelegramHtml(token.name)}`,
    `<b>Symbol</b> : ${safeTelegramHtml(token.symbol)}`,
    `<b>Paired</b> : ${quoteLabel}`,
    `<b>Buy Tax</b> : ${formatPercentage(launch.buyTaxBps)}`,
    `<b>Tax Split</b> : Creator ${formatPercentage(split.creatorBps)} / Burn ${formatPercentage(split.burnBps)}`,
    `<b>Twitter</b> : ${safeTelegramHtml(token.twitter)}`,
    `<b>Website</b> : ${safeTelegramHtml(token.website)}`,
    `<b>Creator</b> : <a href="${manifest.links.creatorPage}${launch.creator}">${launch.creator}</a>`,
    `<b>Creator Nonce</b> : ${creator.nonce?.toString() ?? '-'}`,
    `<b>Creator Balance</b> : ${formatTokenAmount(creator.nativeBalance, manifest.chain.nativeCurrency.decimals, manifest.chain.nativeCurrency.symbol)}`,
    `<b>Count Deploys</b> : ${creator.deployCount?.toString() ?? '-'}`,
    `<b>Creator Token Percents</b> : ${formatPercentage(creator.tokenPercentageBps)}`,
    `<b>Creator Token Balance</b> : ${formatTokenAmount(creator.tokenBalance, token.decimals, token.symbol)}`,
  ];
  return facts.join('\n');
}

function formatTokenAmount(value: bigint | undefined, decimals: number | undefined, symbol: string | undefined): string {
  if (value === undefined || decimals === undefined) return '-';
  const formatted = formatUnits(value, decimals);
  const [whole, fraction] = formatted.split('.');
  const compact = fraction ? `${whole ?? '0'}.${fraction.slice(0, 6)}` : whole ?? '0';
  return `${compact}${symbol ? ` ${safeTelegramHtml(symbol, 32)}` : ''}`;
}

function formatPercentage(basisPoints: bigint | undefined): string {
  if (basisPoints === undefined) return '-';
  const whole = basisPoints / 100n;
  const fraction = (basisPoints % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}%`;
}
