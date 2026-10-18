import { describe, expect, it } from 'vitest';
import { launchReferralKeyboard } from '../src/notify/referral-links.js';

describe('launch action buttons', () => {
  it('links Flywheel and Robinhood Blockscout only', () => {
    const token = '0x127cdc74e44e3c60422b7e792ebe480c0f873ed5' as const;
    const creator = '0x89c5d00f166e4805946d3f30c596174f6cd2db7f' as const;
    const transactionHash = '0xbaea8bc0632420ef2231d377f660e4f5637634723c8632cbee8871aaf90cfb1a' as const;
    const keyboard = launchReferralKeyboard({ token, creator, transactionHash }).inline_keyboard;
    expect(keyboard).toEqual([
      [
        { text: '🌀 Flywheel ↗', url: 'https://flywheel.cash/v2/token/0x127cdc74e44e3c60422b7e792ebe480c0f873ed5' },
        { text: '🌍 Contract ↗', url: 'https://robinhoodchain.blockscout.com/token/0x127cdc74e44e3c60422b7e792ebe480c0f873ed5' },
      ],
      [{ text: '👤 Creator ↗', url: 'https://robinhoodchain.blockscout.com/address/0x89c5d00f166e4805946d3f30c596174f6cd2db7f' }],
      [{ text: '🧾 Tx ↗', url: 'https://robinhoodchain.blockscout.com/tx/0xbaea8bc0632420ef2231d377f660e4f5637634723c8632cbee8871aaf90cfb1a' }],
    ]);
  });
});
