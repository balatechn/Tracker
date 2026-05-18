# NGI IT Asset Tracker

Domain / SaaS / AMC Renewal Tracker for National Group India.

## Stack
- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Node.js + Express + Prisma
- **Database**: PostgreSQL
- **Deploy**: Docker Compose + Coolify

## Quick Start (Local Dev)

```bash
# 1. Copy env files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Start with Docker Compose
docker compose up --build

# 3. Seed the database (first run only)
docker exec tracker-backend sh -c "npm run db:setup"
```

Visit http://localhost:3000 — login with `admin` / `Admin@123`

## Production (Coolify)

1. Connect this GitHub repo in Coolify (Docker Compose mode)
2. Set environment variables in Coolify:
   - `POSTGRES_PASSWORD` (strong password)
   - `JWT_SECRET` (long random string)
3. Add GitHub Secret `COOLIFY_WEBHOOK_URL` for auto-deploy
4. Push to `main` → auto deploy triggers

## Default Login
- Username: `admin`
- Password: `Admin@123`

**Change the password after first login.**
