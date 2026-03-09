# Weekly Activity Report

Project ini terdiri dari dua bagian terpisah:

```
weekly-activity-report/
├── backend/    ← Node.js + Express + PostgreSQL (port 3001)
└── frontend/   ← Vue 3 + Vite (port 3000)
```

---

## Prasyarat

Pastikan sudah terinstall di server:

- **Node.js** v10 atau lebih baru → [nodejs.org](https://nodejs.org)
- **npm** (ikut bersama Node.js)
- **PM2** (process manager, install di langkah berikutnya)
- **PostgreSQL** yang sudah berjalan dan database `openbravo` sudah ada

---

## 1. Setup Backend

### 1.1 Masuk ke folder backend dan install dependencies

```bash
cd backend
npm install
```

### 1.2 Buat file konfigurasi environment

```bash
cp .env.example .env
nano .env
```

Isi file `.env` sesuai kondisi server:

```env
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=openbravo
DB_USER=postgres
DB_PASSWORD=isi_password_postgres_anda
```

### 1.3 Test jalankan manual dulu

```bash
node server.js
```

Jika berhasil, output akan muncul:

```
Backend server running on port 3001
```

Cek di terminal lain:

```bash
curl http://localhost:3001/health
# Output: {"status":"OK","timestamp":"..."}
```

Kalau sudah OK, stop dengan `Ctrl+C`, lanjut ke langkah PM2.

### 1.4 Install PM2 secara global

```bash
npm install -g pm2
```

### 1.5 Jalankan backend dengan PM2

```bash
# Jalankan dari dalam folder backend/
pm2 start server.js --name backend-report
```

### 1.6 Cek status

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

### 1.7 Lihat log backend

```bash
pm2 logs backend-report
```

### 1.8 Agar backend otomatis jalan setelah server reboot

```bash
pm2 startup
# PM2 akan menampilkan satu perintah — copy dan jalankan perintah tersebut

pm2 save
```

---

## 2. Setup Frontend

### 2.1 Masuk ke folder frontend dan install dependencies

```bash
cd frontend
npm install
```

### 2.2 Buat file konfigurasi environment

```bash
cp .env.example .env
nano .env
```

Isi file `.env`:

```env
# URL backend — biarkan default jika backend di server yang sama
VITE_BACKEND_URL=http://localhost:3001

# URL Openbravo — sesuaikan jika alamat berubah
VITE_OPENBRAVO_URL=http://36.93.9.238:8080
```

---

## 3. Jalankan Frontend

### Opsi A — Mode Development (untuk testing)

```bash
cd frontend
npm run dev
```

Buka browser ke: `http://localhost:3000/activity-report/`

> Pada mode ini, request ke `/api/query/*` otomatis diteruskan ke backend `localhost:3001` melalui proxy Vite. Pastikan backend sudah berjalan lebih dulu.

---

### Opsi B — Mode Production (untuk server)

#### 3.1 Build frontend

```bash
cd frontend
npm run build
```

Hasil build ada di folder `frontend/dist/`.

#### 3.2 Jalankan hasil build dengan PM2

```bash
# Install serve jika belum ada
npm install -g serve

# Jalankan dari folder frontend/
pm2 start "serve -s dist -l 3000" --name frontend-report
```

#### 3.3 Cek semua proses PM2

```bash
pm2 status
```

Harusnya muncul dua proses:

```
┌────┬──────────────────┬─────────┬──────┬───────────┬──────────┐
│ id │ name             │ mode    │ ↺    │ status    │ cpu      │
├────┼──────────────────┼─────────┼──────┼───────────┼──────────┤
│ 0  │ backend-report   │ fork    │ 0    │ online    │ 0%       │
│ 1  │ frontend-report  │ fork    │ 0    │ online    │ 0%       │
└────┴──────────────────┴─────────┴──────┴───────────┴──────────┘
```

Buka browser ke: `http://IP_SERVER:3000/activity-report/`

> **Catatan Production:** Saat menggunakan `serve`, proxy Vite tidak aktif. Agar `/api/query/*` bisa diteruskan ke backend, gunakan Nginx sebagai reverse proxy (lihat bagian bawah).

---

## 4. Perintah PM2 yang Sering Dipakai

```bash
pm2 status                        # Lihat semua proses
pm2 logs                          # Lihat semua log
pm2 logs backend-report           # Log backend saja
pm2 logs frontend-report          # Log frontend saja
pm2 restart backend-report        # Restart backend
pm2 restart frontend-report       # Restart frontend
pm2 restart all                   # Restart semua
pm2 stop backend-report           # Stop backend
pm2 stop all                      # Stop semua
pm2 delete backend-report         # Hapus dari PM2
pm2 monit                         # Monitor realtime CPU & memory
```

---

## 5. Konfigurasi Nginx (Opsional — untuk Production dengan domain)

Jika ingin menggunakan Nginx sebagai reverse proxy agar frontend dan backend bisa diakses dari satu port (80):

```bash
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/activity-report
```

Isi konfigurasi:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Ganti dengan domain atau IP server Anda

    # Frontend static files hasil build
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

Aktifkan dan restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/activity-report /etc/nginx/sites-enabled/
sudo nginx -t        # Test konfigurasi, pastikan tidak ada error
sudo service nginx restart
```

Setelah Nginx aktif, frontend tidak perlu dijalankan via PM2 `serve` lagi — cukup copy hasil `dist/` ke `/var/www/activity-report/frontend/dist/`, dan hanya backend yang perlu berjalan lewat PM2.

---

## Ringkasan Port

| Service | Port | Keterangan |
|---------|------|------------|
| Backend (Node.js) | `3001` | Selalu berjalan via PM2 |
| Frontend dev server | `3000` | Hanya untuk development |
| Frontend production | `80` | Via Nginx (opsional) |
| Openbravo | `8080` | Server terpisah (36.93.9.238) |
| PostgreSQL | `5432` | Database lokal |