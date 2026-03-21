# KOL Hub — Creator Recruitment App

App tuyển dụng KOC/KOL cho e-commerce brand. Creator đăng ký nhận sample, admin quản lý và track GMV.

## Tech Stack
- **Frontend**: Next.js 14 + React
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon / Supabase / Railway)
- **Deploy**: Vercel

## Cấu trúc

```
pages/
  index.js              ← Landing page + form đăng ký (3 bước)
  admin/
    index.js            ← Admin login
    dashboard.js        ← Full admin dashboard
  api/
    creators/index.js   ← GET list + POST create
    creators/[id].js    ← PATCH status/GMV/promo
    campaigns/index.js  ← GET + POST campaigns
    campaigns/[id].js   ← PATCH campaign/creator status
lib/
  db.js                 ← PostgreSQL pool
styles/
  globals.css           ← Global styles
```

## Setup local

```bash
npm install
cp .env.local.example .env.local
# Điền DATABASE_URL và NEXT_PUBLIC_ADMIN_PASSWORD
npm run dev
# Mở http://localhost:3000
```

## Database (chạy trong Neon SQL Editor)

Copy SQL từ file `database.sql` và chạy trong Neon SQL Editor.

## Deploy Vercel

1. Push code lên GitHub
2. Import repo trên vercel.com
3. Thêm env vars: `DATABASE_URL` + `NEXT_PUBLIC_ADMIN_PASSWORD`
4. Deploy

## URLs

| URL | Mô tả |
|-----|-------|
| `/` | Landing page + form đăng ký creator |
| `/admin` | Admin login |
| `/admin/dashboard` | Dashboard quản lý |

## Features

- 🎯 Multi-step form đăng ký creator (3 bước, ít friction)
- ⚡ Auto-calculate engagement score
- 🏷️ Auto-tag High Potential creator
- 📊 Admin dashboard: đơn đăng ký, chiến dịch, tracking GMV
- 🎪 Campaign wizard 4 bước
- 📱 Mobile-first design
