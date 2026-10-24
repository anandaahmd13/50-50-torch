# Deploy ke VPS (Docker)

Service tidak membuka HTTP port. Ia membutuhkan koneksi keluar ke RPC Robinhood Chain dan Telegram.

## Siapkan server dan konfigurasi

```sh
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo ufw allow OpenSSH
sudo ufw enable

sudo mkdir -p /srv/torchpad-rh
sudo chown "$USER":"$USER" /srv/torchpad-rh
git clone https://github.com/anandaahmd13/scaff.git /srv/torchpad-rh
cd /srv/torchpad-rh
mkdir -p data
cp .env.example .env
chmod 600 .env
```

Edit `.env`:

```dotenv
INTEGRATION_ID=torch-robinhood
CHAIN_ID=4663
HTTP_RPC_URLS=https://RPC_ROBINHOOD_BERBAYAR_1,https://RPC_ROBINHOOD_BERBAYAR_2
WS_RPC_URL=wss://WSS_ROBINHOOD_BERBAYAR
DB_PATH=./data/torchpad-robinhood.sqlite
DRY_RUN=true
TELEGRAM_BOT_TOKEN=ISI_TOKEN_BOT
TELEGRAM_CHAT_IDS=ISI_CHAT_ID
TELEGRAM_ADMIN_USER_IDS=ISI_NUMERIC_TELEGRAM_USER_ID
```

Gunakan database baru. Service menolak database Flywheel/legacy agar cursor atau pending alert lama tidak terkirim sebagai Torchpad. Endpoint publik cocok untuk uji coba, bukan produksi.

Watcher hanya mengirim token dari TorchFactory resmi dengan event split tepat: Creator `50%`, Burn `50%`, Holders `0%`, Liquidity `0%`. Filter memakai event on-chain, bukan UI Torchpad.

## Jalankan dan observasi

```sh
docker compose up -d --build
docker compose logs -f torchpad-rh
```

Biarkan `DRY_RUN=true` beberapa jam atau satu hari. Periksa RPC error, lag, skipped split log, dan pesan duplikat. Setelah observasi bersih, ubah `DRY_RUN=false`, lalu jalankan `docker compose up -d`.

## Update dan operasi

```sh
cd /srv/torchpad-rh
git pull --ff-only origin main
docker compose up -d --build

docker compose logs -f torchpad-rh
docker compose restart torchpad-rh
docker compose ps
tar -czf torchpad-rh-backup-$(date +%F).tgz data
```

Gunakan `/status`, `/pause`, `/resume`, dan `/last` dari akun Telegram dengan ID di `TELEGRAM_ADMIN_USER_IDS`.
