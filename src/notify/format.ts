import { formatUnits } from 'viem';
import type { DecodedLaunch, LaunchEnrichment } from '../chain/types.js';

const CONTROL_OR_BIDI = /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;
const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com';

export function safeTelegramHtml(value: string | undefined, maxLength = 120): string {
  const cleaned = (value ?? '').replace(CONTROL_OR_BIDI, '').replace(/\s+/gu, ' ').trim();
  if (!cleaned) return '-';
  const shortened = [...cleaned].slice(0, maxLength).join('');
  return shortened.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
}

export function formatLaunchAlert(
  launch: DecodedLaunch,
  enrichment: LaunchEnrichment,
): string {
  const { token, quote } = enrichment;
  const quoteLabel = quote.symbol
    ? `${safeTelegramHtml(quote.symbol)} <code>${quote.address}</code>`
    : `<code>${quote.address}</code>`;
  const supply = formatTokenAmount(token.totalSupply, token.decimals, token.symbol);
  const facts = [
    '<b>Flywheel launch</b>',
    `<b>Token Address</b> : <code>${launch.token}</code>`,
    `<b>Name</b> : ${safeTelegramHtml(token.name)}`,
    `<b>Symbol</b> : ${safeTelegramHtml(token.symbol)}`,
    `<b>Quote Asset</b> : ${quoteLabel}`,
    `<b>Holder Rewards</b> : ${launch.holderRewardsEnabled ? 'enabled' : 'disabled'}`,
    `<b>Total Supply</b> : ${supply}`,
    `<b>Twitter</b> : ${safeTelegramHtml(token.twitter)}`,
    `<b>Website</b> : ${safeTelegramHtml(token.website)}`,
    `<b>Telegram</b> : ${safeTelegramHtml(token.telegram)}`,
    `<b>About</b> : ${safeTelegramHtml(token.description, 500)}`,
    `<b>Creator</b> : <a href="${BLOCKSCOUT}/address/${launch.creator}">${launch.creator}</a>`,
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
