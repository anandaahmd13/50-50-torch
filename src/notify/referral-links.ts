import type { Address, Hex } from 'viem';

const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com';
const FLYWHEEL = 'https://flywheel.cash/v2';

export interface LaunchLinks {
  token: Address;
  creator?: Address;
  transactionHash: Hex;
}

/** Observational links only; this watcher never constructs or signs a trade. */
export function launchReferralKeyboard({ token, creator, transactionHash }: LaunchLinks) {
  const contract = token.toLowerCase();
  return {
    inline_keyboard: [
      [
        { text: '🌀 Flywheel ↗', url: `${FLYWHEEL}/token/${contract}` },
        { text: '🌍 Contract ↗', url: `${BLOCKSCOUT}/token/${contract}` },
      ],
      ...(creator ? [[{ text: '👤 Creator ↗', url: `${BLOCKSCOUT}/address/${creator}` }]] : []),
      [{ text: '🧾 Tx ↗', url: `${BLOCKSCOUT}/tx/${transactionHash}` }],
    ],
  } as const;
}
