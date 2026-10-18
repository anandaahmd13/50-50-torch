import type { Address, Hex } from 'viem';

const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com';
const FLYWHEEL = 'https://flywheel.cash/v2';
// Operator-supplied referral destinations. These only open external services;
// the watcher never connects to a wallet or creates a transaction.
const GMGN_TOKEN_REFERRAL = 'https://gmgn.ai/robinhood/token/kX4rUcuP_';
const BASED_BOT_TOKEN_REFERRAL = 'https://t.me/based_eth_bot?start=r_odglug69420_b_';

export interface LaunchLinks {
  token: Address;
  creator?: Address;
  transactionHash: Hex;
}

/** Links only; this watcher never constructs, signs, or submits a trade. */
export function launchReferralKeyboard({ token, creator, transactionHash }: LaunchLinks) {
  const contract = token.toLowerCase();
  return {
    inline_keyboard: [
      [
        { text: '🛒 Buy on GMGN ↗', url: `${GMGN_TOKEN_REFERRAL}${contract}` },
        { text: '🚀 Buy on Based Bot ↗', url: `${BASED_BOT_TOKEN_REFERRAL}${contract}` },
      ],
      [
        { text: '🌀 Flywheel ↗', url: `${FLYWHEEL}/token/${contract}` },
        { text: '🌍 Contract ↗', url: `${BLOCKSCOUT}/token/${contract}` },
      ],
      ...(creator ? [[{ text: '👤 Creator ↗', url: `${BLOCKSCOUT}/address/${creator}` }]] : []),
      [{ text: '🧾 Tx ↗', url: `${BLOCKSCOUT}/tx/${transactionHash}` }],
    ],
  } as const;
}
