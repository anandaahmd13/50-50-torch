# Deploy ke VPS (Docker)

Service ini tidak membuka HTTP port; ia membutuhkan koneksi keluar ke RPC Robinhood Chain dan Telegram.

## Siapkan server dan konfigurasi

```sh
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo ufw allow OpenSSH
sudo ufw enable

sudo mkdir -p /srv/flywheel-rh
sudo chown "$USER":"$USER" /srv/flywheel-rh
git clone https://github.com/anandaahmd13/rh_fw.git /srv/flywheel-rh
cd /srv/flywheel-rh
mkdir -p data
cp .env.example .env
chmod 600 .env
```

Edit `.env` dan gunakan nilai minimum berikut:

```dotenv
CHAIN_ID=4663
HTTP_RPC_URLS=https://RPC_ROBINHOOD_BERBAYAR_1,https://RPC_ROBINHOOD_BERBAYAR_2
WS_RPC_URL=wss://WSS_ROBINHOOD_BERBAYAR
DB_PATH=./data/flywheel-robinhood.sqlite
DRY_RUN=true
TELEGRAM_BOT_TOKEN=ISI_TOKEN_BOT
TELEGRAM_CHAT_IDS=ISI_CHAT_ID
TELEGRAM_ADMIN_USER_IDS=ISI_NUMERIC_TELEGRAM_USER_ID
```

Jangan memasukkan `.env` ke Git atau membagikan token bot. Gunakan database baru; jangan arahkan `DB_PATH` ke database Runitup/BSC lama. Endpoint publik cocok untuk uji coba, bukan produksi.

## Jalankan dan observasi

```sh
docker compose up -d --build
docker compose logs -f flywheel-rh
```

Biarkan `DRY_RUN=true` selama beberapa jam atau satu hari dan periksa RPC error, lag, serta pesan duplikat. Setelah observasi bersih, ubah `DRY_RUN=false`, lalu jalankan `docker compose up -d` untuk membuat ulang container.

## Update dan operasi

```sh
cd /srv/flywheel-rh
git pull --ff-only origin main
docker compose up -d --build

docker compose logs -f flywheel-rh
docker compose restart flywheel-rh
docker compose ps
tar -czf flywheel-rh-backup-$(date +%F).tgz data
```

Gunakan `/status`, `/pause`, `/resume`, dan `/last` dari akun Telegram dengan ID yang terdapat di `TELEGRAM_ADMIN_USER_IDS`.
