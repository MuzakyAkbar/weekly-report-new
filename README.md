# Weekly Activity Report — Separated Project

Project ini terdiri dari dua bagian terpisah:

```
weekly-activity-report/
├── frontend/   ← Vue 3 + Vite
└── backend/    ← Node.js + Express + PostgreSQL
```

---

## Backend (Node.js)

### Install & Jalankan

```bash
cd backend
npm install
cp .env.example .env
# Edit .env sesuai konfigurasi database Anda
nano .env

node server.js
# Server berjalan di http://localhost:3001
```

### Endpoints

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/health` | Health check |
| POST | `/api/query/progress` | Data progress per item |
| POST | `/api/query/total` | Total keseluruhan progress |

---

## Frontend (Vue 3)

### Install & Jalankan (Development)

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env jika backend berjalan di alamat berbeda

npm run dev
# Buka http://localhost:3000/activity-report/
```

### Build Production

```bash
cd frontend
npm run build
# Output di folder dist/
```

---

## Catatan Penting

- **Development**: Frontend menggunakan proxy Vite, jadi request ke `/api/query/*` otomatis diteruskan ke backend (`localhost:3001`). Pastikan backend sudah berjalan sebelum frontend.
- **Production**: Deploy `dist/` frontend ke web server (Nginx/Apache), dan backend ke server Node.js. Pastikan reverse proxy dikonfigurasi agar `/api/query/*` diteruskan ke port backend.
- File `api.js` sudah diperbaiki — tidak lagi hardcode `http://localhost:3001`, sekarang menggunakan path relatif `/api/query/...`.

---

## Konfigurasi Nginx (Production, jika dibutuhkan)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    root /var/www/activity-report/dist;
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
    }

    # Proxy ke Openbravo
    location /api/openbravo/ {
        rewrite ^/api/openbravo/(.*) /openbravo/$1 break;
        proxy_pass http://36.93.9.238:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```
