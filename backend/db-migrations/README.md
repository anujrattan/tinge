# Database Migrations (Tinge art-only, shared Supabase)

All Tinge objects are prefixed with **`tinge_`** so they coexist with other apps (e.g. real estate) in the same project.

We use underscores (`tinge_products`), not hyphens — PostgREST/Supabase embeds break on hyphenated table names.

## Tables

| Table | Purpose |
|--------|---------|
| `tinge_categories` | Merchandising categories |
| `tinge_collections` | Collections |
| `tinge_products` | Artwork listings (`material` + size prices) |
| `tinge_users` | Checkout / commerce users |
| `tinge_user_profiles` | Auth-linked roles (`user` / `admin`) |
| `tinge_user_addresses` | Saved addresses |
| `tinge_orders` / `tinge_order_items` | Orders |
| `tinge_addresses` | Per-order shipping snapshots |
| `tinge_payments` | Razorpay / payment rows |
| `tinge_order_sequences` | Order number sequences |
| `tinge_order_status_history` | Status audit |
| `tinge_wishlists` | Wishlists |
| `tinge_product_ratings` | Ratings |
| `tinge_newsletter_subscribers` | Newsletter |
| `tinge_blog_posts` / `tinge_faq_items` | CMS |
| `tinge_return_requests` / `tinge_return_status_history` | Returns |

RPCs / triggers: `tinge_get_next_order_sequence`, `tinge_handle_new_user`, `tinge_on_auth_user_created`, etc. — they do **not** replace other apps’ auth triggers.

## Shared Auth (`auth.users`)

One Auth project for multiple apps. Membership is **not** “email domain”; it is:

1. **`auth.users.raw_app_meta_data.apps`** — e.g. `["tinge"]` or `["tinge","realty"]` (set only via service role / Tinge API)
2. **`tinge_user_profiles`** — row present ⇒ this Auth user is a Tinge user

`tinge_handle_new_user` only inserts a profile when `apps` contains `"tinge"`. Real-estate signups are ignored.

OTP (email / phone) is handled by Supabase Auth; Tinge tags membership after `verifyOtp`.

## Apply (shared project)

1. Open **SQL Editor** on the shared Supabase project.
2. Run in order:
   - [`000_art_bootstrap.sql`](./000_art_bootstrap.sql)
   - [`001_seed_art_demo.sql`](./001_seed_art_demo.sql) (optional)
   - [`002_shared_auth_tinge_membership.sql`](./002_shared_auth_tinge_membership.sql) (if `000` was already applied before membership gating)
3. Use **publishable + secret** API keys in `backend/.env`.
4. For **email OTP**: Auth → Email templates → Magic Link include `{{ .Token }}`.
5. For **phone OTP**: Auth → Providers → Phone + SMS provider (Twilio, etc.).

Code table map: [`backend/src/config/tables.ts`](../src/config/tables.ts).

## Archive

Older unprefixed / apparel migrations: [`archive/`](./archive/). Do not apply those on the shared DB.
