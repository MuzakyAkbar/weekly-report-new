# Weekly Activity Report

Project ini terdiri dari dua bagian terpisah:

```
weekly-activity-report/
├── backend/    ← Node.js + Express + PostgreSQL (port 3001)
└── frontend/   ← Vue 3 + Vite (port 3000)
```

---

## BAGIAN 1 — BACKEND (Ubuntu 14.04 LTS)

> `server.js` sudah ditulis ulang agar kompatibel dengan Node.js 10.x  
> (tidak ada `async/await`, arrow function, destructuring, atau `const/let`)

### 1.1 Install Node.js 10.x

Ubuntu 14.04 tidak punya Node.js versi baru di repo default. Install via NodeSource:

```bash
sudo apt-get update
sudo apt-get install -y curl

curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -

sudo apt-get install -y nodejs

# Verifikasi
node -v    # harus v10.x.x
npm -v
```

> **Node.js 12+ tidak support Ubuntu 14.04.** Gunakan v10.x.

Jika perintah `node` tidak ditemukan setelah install:

```bash
sudo ln -s /usr/bin/nodejs /usr/local/bin/node
```

### 1.2 Upload folder backend ke server

Dari komputer lokal, jalankan:

```bash
scp -r backend/ user@IP_SERVER:/var/www/activity-report/backend
```

Atau jika pakai FTP/SFTP, copy folder `backend/` ke `/var/www/activity-report/backend/`.

### 1.3 Install dependencies

```bash
cd /var/www/activity-report/backend
npm install
```

### 1.4 Buat file konfigurasi environment

```bash
cp .env.example .env
nano .env
```

Isi sesuai konfigurasi database:

```env
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=openbravo
DB_USER=postgres
DB_PASSWORD=isi_password_postgres_anda
```

Simpan dengan `Ctrl+O`, keluar dengan `Ctrl+X`.

### 1.5 Test jalankan manual dulu

```bash
node server.js
```

Jika berhasil:

```
Backend server running on port 3001
```

Buka terminal baru dan test:

```bash
curl http://localhost:3001/health
# Output: {"status":"OK","timestamp":"..."}
```

Kalau sudah OK, stop dengan `Ctrl+C`.

### 1.6 Install PM2

```bash
npm install -g pm2
```

Jika muncul error permission:

```bash
sudo npm install -g pm2
```

### 1.7 Jalankan backend dengan PM2

```bash
cd /var/www/activity-report/backend
pm2 start server.js --name backend-report
```

### 1.8 Cek status

```bash
pm2 status
```

Output yang diharapkan:

```
┌────┬──────────────────┬─────────┬──────┬───────────┬──────────┐
│ id │ name             │ mode    │ ↺    │ status    │ cpu      │
├────┼──────────────────┼─────────┼──────┼───────────┼──────────┤
│ 0  │ backend-report   │ fork    │ 0    │ online    │ 0%       │
└────┴──────────────────┴─────────┴──────┴───────────┴──────────┘
```

### 1.9 Lihat log

```bash
pm2 logs backend-report
```

### 1.10 Agar otomatis jalan setelah server reboot

Ubuntu 14.04 pakai Upstart (bukan systemd), PM2 mendeteksi ini otomatis:

```bash
pm2 startup ubuntu
# PM2 menampilkan satu perintah sudo — copy dan jalankan perintah itu

pm2 save
```

### 1.11 Buka port 3001 di firewall (jika perlu)

```bash
# Cek apakah ufw aktif
sudo ufw status

# Jika aktif, buka port
sudo ufw allow 3001/tcp
sudo ufw reload
```

---

## BAGIAN 2 — FRONTEND (Komputer lokal / server terpisah)

> Frontend dijalankan di komputer yang lebih baru (bukan Ubuntu 14.04),  
> karena Vite membutuhkan Node.js 18+.

### 2.1 Prasyarat

- Node.js 18+ ([nodejs.org](https://nodejs.org))
- npm

### 2.2 Install dependencies

```bash
cd frontend
npm install
```

### 2.3 Buat file environment

```bash
cp .env.example .env
nano .env
```

Isi:

```env
# Arahkan ke IP server Ubuntu 14.04 tempat backend berjalan
VITE_BACKEND_URL=http://IP_SERVER_UBUNTU:3001

# URL Openbravo
VITE_OPENBRAVO_URL=http://36.93.9.238:8080
```

---

## BAGIAN 3 — Jalankan Frontend

### Opsi A — Development (testing lokal)

```bash
cd frontend
npm run dev
```

Buka: `http://localhost:3000/activity-report/`

> Request ke `/api/query/*` diteruskan ke backend via proxy Vite secara otomatis.

### Opsi B — Production (deploy ke server)

#### 3.1 Build

```bash
cd frontend
npm run build
# Hasil di folder frontend/dist/
```

#### 3.2 Upload dist ke server

```bash
scp -r dist/ user@IP_SERVER:/var/www/activity-report/frontend/dist
```

#### 3.3 Install dan jalankan dengan PM2 + serve

```bash
# Di server (bisa Ubuntu 14.04 jika Node.js ≥10 sudah terinstall)
npm install -g serve

cd /var/www/activity-report/frontend
pm2 start "serve -s dist -l 3000" --name frontend-report

pm2 save
```

#### 3.4 Cek semua proses PM2

```bash
pm2 status
```

```
┌────┬──────────────────┬─────────┬──────┬───────────┬──────────┐
│ id │ name             │ mode    │ ↺    │ status    │ cpu      │
├────┼──────────────────┼─────────┼──────┼───────────┼──────────┤
│ 0  │ backend-report   │ fork    │ 0    │ online    │ 0%       │
│ 1  │ frontend-report  │ fork    │ 0    │ online    │ 0%       │
└────┴──────────────────┴─────────┴──────┴───────────┴──────────┘
```

Buka: `http://IP_SERVER:3000/activity-report/`

---

## BAGIAN 4 — Nginx sebagai Reverse Proxy (Direkomendasikan untuk Production)

Dengan Nginx, semua traffic cukup lewat port 80 — tidak perlu expose port 3000 dan 3001 ke publik.

```bash
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/activity-report
```

Isi konfigurasi:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Ganti dengan domain atau IP server

    # Serve frontend static files
    root /var/www/activity-report/frontend/dist;
    index index.html;

    location /activity-report/ {
        try_files $uri $uri/ /activity-report/index.html;
    }

    # Proxy ke backend Node.js
    location /api/query/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy ke Openbravo
    location /api/openbravo/ {
        rewrite ^/api/openbravo/(.*) /openbravo/$1 break;
        proxy_pass http://36.93.9.238:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/activity-report /etc/nginx/sites-enabled/
sudo nginx -t                  # Pastikan tidak ada error
sudo service nginx restart
```

Setelah Nginx aktif, `frontend-report` di PM2 tidak diperlukan lagi — Nginx langsung serve folder `dist/`. Hanya `backend-report` yang tetap harus berjalan di PM2.

---

## Perintah PM2 yang Sering Dipakai

```bash
pm2 status                        # Lihat semua proses
pm2 logs                          # Lihat semua log
pm2 logs backend-report           # Log backend saja
pm2 restart backend-report        # Restart backend
pm2 restart all                   # Restart semua
pm2 stop backend-report           # Stop backend
pm2 delete backend-report         # Hapus dari PM2
pm2 monit                         # Monitor realtime CPU & memory
```

---

## Ringkasan Port

| Service | Port | Server |
|---------|------|--------|
| Backend (Node.js) | `3001` | Ubuntu 14.04, via PM2 |
| Frontend dev server | `3000` | Komputer lokal / server baru |
| Frontend production | `80` | Via Nginx |
| Openbravo | `8080` | `36.93.9.238` |
| PostgreSQL | `5432` | Ubuntu 14.04 (lokal) |

---

## Perubahan Kompatibilitas pada server.js

`server.js` di folder `backend/` sudah ditulis ulang agar bisa berjalan di Node.js 10.x:

| Sebelum (ES6+) | Sesudah (ES5 compatible) |
|---|---|
| `const` / `let` | `var` |
| Arrow function `() =>` | `function()` |
| `async/await` | Callback style |
| Destructuring `{ a, b }` | Akses manual `req.body.a` |
| Template literal `` ` ` `` | String array `.join()` |
| `pool.max: 20` | Dikurangi ke `10` |
| `connectionTimeoutMillis: 2000` | Dinaikkan ke `5000` |
| Tidak ada error handler pool | `pool.on('error', ...)` ditambahkan |
| Tidak ada graceful shutdown | `SIGTERM` / `SIGINT` handler ditambahkan |