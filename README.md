# Torchpad Robinhood launch watcher

Read-only Node.js/TypeScript service. Detects verified Torchpad factory launches on Robinhood Chain, filters exact creator/burn split, stores qualifying launches idempotently, then sends Telegram alerts. It has no wallet, private key, transaction signing, buy/sell signal, or trade execution.

Discovery uses only canonical factory event logs. Active manifest [`torch-robinhood`](src/integrations/torch-robinhood.ts) accepts only TorchFactory `0x7891eA889899928aFE637e4Cca8106188427776a` on chain ID `4663`, from block `85204474`, with event:

```text
TokenLaunched(address,address,bytes32,uint256,uint24,uint256,(uint16,uint16,uint16,uint16),string,address)
```

A notification requires exact event split:

```text
Creator:   5000 BPS (50%)
Burn:      5000 BPS (50%)
Holders:      0 BPS
Liquidity:    0 BPS
```

`buyTaxBps` is shown but does not filter. Token addresses, web catalogs, metadata, social posts, address suffixes, and cumulative burn figures are never discovery/filter sources. LOUD `0xcd291fa4d3e2eb43e4639625092d31ae10e61111` from block `96093244` is golden on-chain fixture.

## Quick start

```sh
npm install
cp .env.example .env
# Edit .env; keep DRY_RUN=true for observation.
npm test
npm run build
npm start
```

`HTTP_RPC_URLS` accepts comma-separated endpoints for viem fallback. Default public Robinhood RPC is useful for testing; production needs independent archive-capable HTTP endpoints and reliable WebSocket endpoint.

Use new SQLite database for Torchpad. Existing Flywheel/other database fails startup: cursor, stored blocks, and pending outbox must never cross deployments. Empty database scans only mutable reorg window. For controlled historical backfill, stop service and set `BOOTSTRAP_BLOCK` no earlier than `85204474` before starting in test Telegram chat.

## Operational model

- HTTP `getLogs` on reviewed factory/event is authority for recovery/backfill; range shrinks after provider limits.
- WSS lowers detection latency and shares SQLite idempotency path.
- Every decoded launch records its canonical block hash. Nonmatching split launches advance scan/reorg state but never profile token, write event/outbox, or alert.
- Qualifying event, token facts, and notification outbox rows commit atomically. Uniqueness: `(transaction hash, log index)`.
- Mutable reorg window is replayed. Changed block hash cancels pending notifications and remediates delivered alerts.
- Name, symbol, decimals, supply, and creator balances read at launch block. Zero-address native quote is represented locally as native ETH; no ERC-20 calls target zero address.
- Creator deploy count queries reviewed TorchFactory `TokenLaunched` events through current launch using indexed creator topic.
- Alerts link Torchpad, Robinhood Blockscout, GMGN, and Based Bot. Watcher does not create orders or claim token safety.

## Production checklist

1. Keep `DRY_RUN=true` for several hours/day. Inspect RPC errors, lag, skipped split logs, and duplicate rate.
2. Use test `TELEGRAM_CHAT_IDS`; set `DRY_RUN=false` only after clean observation. Restrict `TELEGRAM_ADMIN_USER_IDS` to numeric IDs you control.
3. Persist and back up `DB_PATH`; do not share `.env` or bot token.
4. Run systemd, Docker, or PM2 with restart-on-failure. SQLite outbox makes restarts safe.
5. Review ABI/source/deployment block before changing factory. Never auto-allowlist discovered address.

## Registry evidence

- [Torchpad contract addresses](https://docs.torchpad.fun/protocol/contract-addresses)
- [TorchFactory verified source](https://robinhoodchain.blockscout.com/address/0x7891eA889899928aFE637e4Cca8106188427776a?tab=contract)
- [TorchFactory deployment](https://robinhoodchain.blockscout.com/tx/0x94ed6872334462ba95ff71adb3471868dd5a777ae743f41cc0fa40df3dcead36)
- [LOUD canonical launch](https://robinhoodchain.blockscout.com/tx/0x20562c7a2365968dcb68439f21f9031c8fb1a148d56a0117db0d4bb3ed0c17d9)
