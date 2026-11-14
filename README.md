# Tinge — In-house wall art

Art-only storefront for **Framed ACP**, **Canvas**, **Sunboard**, and **Neon**. One listing = one artwork designed for one material; customers pick **size** only. Fulfillment is **in-house**.

## Stack

- **Frontend:** React + Vite + TypeScript (`frontend/`) — [http://localhost:3000](http://localhost:3000)
- **Backend:** Express + Supabase + Razorpay (`backend/`) — [http://localhost:3001](http://localhost:3001)

## Quick start

```bash
npm run install:all
```

1. Use the **shared** Supabase project (same DB as the real-estate app).
2. In SQL Editor, run (creates `tinge_*` tables only — does not touch other apps’ tables):
   - `backend/db-migrations/000_art_bootstrap.sql`
   - `backend/db-migrations/001_seed_art_demo.sql` (optional demo products)
3. Copy URL + **publishable** + **secret** API keys into `backend/.env`
   (see `backend/.env.example`). Prefer `sb_publishable_…` / `sb_secret_…`
   over legacy anon/service_role JWTs
   ([migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).
   Set `CORS_ORIGIN` and `FRONTEND_URL` to `http://localhost:3000`.
4. Set `frontend/.env` with `VITE_API_BASE_URL=http://localhost:3001/api` (or `/api` with Vite proxy).

```bash
npm run dev
```

## Product model

| Field | Meaning |
|--------|---------|
| `tinge_products.material` | `framed_acp` \| `canvas` \| `sunboard` \| `neon` (fixed per listing) |
| `tinge_products.variants` | `{ sizes, size_prices }` — customer chooses size |

Apparel, Printrove/Qikink, and customer material switching are **out of scope** for v1.

## Admin

`/admin` — create art listings (material + sizes), manage orders (status + tracking), returns, CMS.

## Docs

- Schema / migrations: [backend/db-migrations/README.md](backend/db-migrations/README.md)
- Older apparel migrations: `backend/db-migrations/archive/`
