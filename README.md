# Flywheel V2 Robinhood launch watcher

Read-only Node.js/TypeScript service that detects verified Flywheel V2 factory launches on Robinhood Chain, stores them idempotently, and sends Telegram alerts. It contains no wallet, private key, transaction signing, buy/sell signal, or trade execution.

Discovery is factory-based. The registry in [`src/contracts/flywheel.ts`](src/contracts/flywheel.ts) accepts only StandardLaunchFactory `0xF05A…4b8d` on chain ID `4663`, starting at block `87735162`, and only its `TokenLaunched(token, creator, quote, holders)` event. Token addresses, web catalogs, and social posts are never discovery sources.

The BOOMER sample token `0x127cdc74e44e3c60422b7e792ebe480c0f873ed5` is pinned as a golden on-chain event fixture from block `91295058`, transaction `0xbaea…fb1a`.

## Quick start

```sh
npm install
cp .env.example .env
# Edit .env; keep DRY_RUN=true for the observation period.
npm test
npm run build
npm start
```

`HTTP_RPC_URLS` accepts comma-separated endpoints for viem fallback. The default public Robinhood RPC is convenient for testing; production should use independent, archive-capable HTTP endpoints and a reliable WebSocket endpoint.

Use a **new** SQLite database for Flywheel. Do not reuse a BSC/Runitup database: its cursor and stored block hashes are from another chain. With an empty database, only the mutable reorg window is scanned. For a controlled historical backfill, stop the service and set `BOOTSTRAP_BLOCK` no earlier than `87735162` before starting it in a test Telegram chat.

## Operational model

- HTTP `getLogs` filtered to the reviewed factory and event is authoritative for recovery and backfill; ranges shrink after provider-limit errors.
- WSS provides lower-latency detection when configured and shares the same SQLite idempotency path.
- Event, token facts, and notification outbox rows commit atomically; uniqueness is `(transaction hash, log index)`.
- The latest reorg window is replayed. A changed block hash cancels pending notifications and remediates delivered alerts.
- Token name, symbol, decimals, supply, quote symbol, and social metadata are read directly from the token and quote contracts. The Flywheel web API is not used for discovery or enrichment.
- Alerts link to Flywheel V2, Robinhood Blockscout, and the operator-configured GMGN and Based Bot referral destinations. The watcher never creates an order or represents a token as safe.

## Production checklist

1. Keep `DRY_RUN=true` for several hours/day and inspect RPC errors, lag, duplicate rate, and registry results.
2. Use a test `TELEGRAM_CHAT_IDS`, then set `DRY_RUN=false`; restrict `TELEGRAM_ADMIN_USER_IDS` to numeric IDs you control.
3. Persist and back up `DB_PATH`; do not share `.env` or its bot token.
4. Run under systemd or PM2 with restart-on-failure. SQLite outbox delivery makes restarts safe.
5. Before adding a factory, review its ABI, source verification, deployment block, and evidence. Never auto-allowlist a discovered address.

## Registry evidence

- [Flywheel native V4 integration](https://flywheel.cash/integrations/20261013/index.html)
- [Discovery and accounting specification](https://flywheel.cash/integrations/20261013/INDEXING.md)
- [Deployment record](https://flywheel.cash/integrations/20261013/deployment.json)
- [Factory Sourcify record](https://repo.sourcify.dev/4663/0xF05A26e92E27b8F0385f6895F5507Db26A2F4b8d)
