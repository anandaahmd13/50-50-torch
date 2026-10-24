import type { Address, Hex } from 'viem';
import type { LaunchpadManifest } from '../integrations/types.js';

export interface LaunchLinks {
  token: Address;
  creator?: Address;
  transactionHash: Hex;
}

/** Links only; this watcher never constructs, signs, or submits a trade. */
export function launchReferralKeyboard(
  manifest: LaunchpadManifest,
  { token, creator, transactionHash }: LaunchLinks,
) {
  const contract = token.toLowerCase();
  return {
    inline_keyboard: [
      manifest.links.buyLinks.map((link) => ({ text: link.label, url: `${link.urlPrefix}${contract}` })),
      [
        { text: manifest.links.tokenPageLabel, url: `${manifest.links.tokenPage}${contract}` },
        { text: '🌍 Contract ↗', url: `${manifest.links.contractPage}${contract}` },
      ],
      ...(creator ? [[{ text: '👤 Creator ↗', url: `${manifest.links.creatorPage}${creator.toLowerCase()}` }]] : []),
      [{ text: '🧾 Tx ↗', url: `${manifest.links.transactionPage}${transactionHash}` }],
    ],
  } as const;
}
