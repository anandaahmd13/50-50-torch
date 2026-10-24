import { describe, expect, it } from 'vitest';
import { torchRobinhoodManifest } from '../src/integrations/torch-robinhood.js';
import { launchReferralKeyboard } from '../src/notify/referral-links.js';

describe('launch action buttons', () => {
  it('includes contract in Torchpad, GMGN, Based Bot, and explorer links', () => {
    const token = '0xcd291fa4d3e2eb43e4639625092d31ae10e61111' as const;
    const creator = '0x5fea510e94353cf4920172f4cc8833d83a15e56d' as const;
    const transactionHash = '0x20562c7a2365968dcb68439f21f9031c8fb1a148d56a0117db0d4bb3ed0c17d9' as const;
    const keyboard = launchReferralKeyboard(torchRobinhoodManifest, { token, creator, transactionHash }).inline_keyboard;
    expect(keyboard).toEqual([
      [
        { text: '🛒 Buy on GMGN ↗', url: 'https://gmgn.ai/robinhood/token/kX4rUcuP_0xcd291fa4d3e2eb43e4639625092d31ae10e61111' },
        { text: '🚀 Buy on Based Bot ↗', url: 'https://t.me/based_eth_bot?start=r_odglug69420_b_0xcd291fa4d3e2eb43e4639625092d31ae10e61111' },
      ],
      [
        { text: '🔥 Torchpad ↗', url: 'https://app.torchpad.fun/trade/robinhood/0xcd291fa4d3e2eb43e4639625092d31ae10e61111' },
        { text: '🌍 Contract ↗', url: 'https://robinhoodchain.blockscout.com/token/0xcd291fa4d3e2eb43e4639625092d31ae10e61111' },
      ],
      [{ text: '👤 Creator ↗', url: 'https://robinhoodchain.blockscout.com/address/0x5fea510e94353cf4920172f4cc8833d83a15e56d' }],
      [{ text: '🧾 Tx ↗', url: 'https://robinhoodchain.blockscout.com/tx/0x20562c7a2365968dcb68439f21f9031c8fb1a148d56a0117db0d4bb3ed0c17d9' }],
    ]);
  });
});
