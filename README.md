# Kojosropa 🇬🇭

A production-ready web storefront for **Kojosropa** — a curated
shirt shop from Accra, picking one-of-one pieces from the bales.
Built with Next.js (App Router), React, TypeScript, Tailwind CSS v4 and
PostgreSQL via Prisma.

## What's inside

- **The rack** — a browsable catalog of curated shirts with category, style,
  size and price filters, plus search and sort.
- **Product pages** — story, condition, era, fabric specs and honest fit notes
  for every piece, with a size picker and add-to-bag.
- **Shopping bag** — a slide-out drawer with quantity controls, a free-delivery
  progress meter, and persistence (prices in GHS).
- **Checkout** — a contact → delivery → Mobile Money (Moolre) flow that
  creates a real order server-side. Prices and stock are recomputed from the
  database — the client can't change what it pays.
- **Confirmation** — an order receipt fetched from the database by order number.
- **Admin dashboard** (secret URL path) — password-protected (env var) session auth;
  add, edit, delete, and hide/show pieces with a live SVG preview. Images are
  compressed on upload before they hit the database.
- **PostgreSQL** — products and orders live in Prisma models, with migrations
  and a seed script for the starter catalog.
- **Procedural artwork** — every shirt renders as an SVG illustration (stripes,
  tie-dye, graphic prints, plaid, garment-dye, raglan).

## Prerequisites

- Node.js 20+
- PostgreSQL (the migration targets PostgreSQL)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then fill in DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET, etc.

# 3. Create the database, apply migrations and generate the client
npx prisma migrate dev

# 4. Seed the starter catalog (optional, safe to re-run)
npx prisma db seed

# 5. Run it
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin dashboard lives
at [http://localhost:3000/admin](http://localhost:3000/admin) and signs in with
the `ADMIN_PASSWORD` from your `.env`.

## Environment variables

| Variable                    | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `DATABASE_URL`              | PostgreSQL connection string                        |
| `ADMIN_PASSWORD`            | Admin dashboard password                            |
| `SESSION_SECRET`            | Signs the admin session cookie (min 32 chars)       |
| `NEXT_PUBLIC_ADMIN_PATH`    | Secret URL path for the admin dashboard            |
| `NEXT_PUBLIC_SITE_URL`      | Canonical URL for SEO / sitemap / robots            |
| `NEXT_PUBLIC_INSTAGRAM_HANDLE`   | Instagram handle shown in the footer            |
| `NEXT_PUBLIC_FACEBOOK_HANDLE`    | Facebook page shown in the footer               |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`    | WhatsApp number shown in the footer             |
| `NEXT_PUBLIC_TIKTOK_HANDLE`      | TikTok handle shown in the footer               |
| `NEXT_PUBLIC_SNAPCHAT_HANDLE`    | Snapchat username shown in the footer           |
| `RESEND_API_KEY`             | Resend API key for transactional email           |
| `RESEND_FROM`                | Sender address for emails (default: orders@kojosropa.com) |
| `ADMIN_NOTIFY_EMAIL`         | Where new-order notifications are sent            |

## Scripts

| Command                     | What it does                      |
| --------------------------- | --------------------------------- |
| `npm run dev`               | Start the dev server              |
| `npm run build`             | Production build                  |
| `npm run start`             | Serve the build                   |
| `npm run lint`              | Lint with ESLint                  |
| `npx prisma migrate dev`    | Apply migrations + regenerate client |
| `npx prisma db seed`        | Seed the starter catalog        |
| `npx prisma studio`         | Browse the database in a browser  |

## Deploying

The app runs on any Node.js host. On Vercel: set the environment variables
above in the project settings, connect your PostgreSQL database, and deploy.
Server Actions run against `DATABASE_URL` with Prisma's `pg` adapter — no
serverless-specific shims are needed.

> Note: the in-memory rate limiter and admin session cookie work best on a
> single instance. For multi-instance deployments consider a shared store.

## Security notes

- Admin auth uses a signed, HttpOnly, SameSite=Lax session cookie (JWT via
  `jose`); the password comes from `ADMIN_PASSWORD` (or a hash stored via the
  dashboard's Change-password option). To recover a forgotten dashboard
  password, delete the `adminPasswordHash` row in the `SiteSetting` table —
  login falls back to `ADMIN_PASSWORD`.
- Login is rate-limited; order creation is rate-limited.
- Server Actions are CSRF-checked by Next.js; security headers are set in
  `next.config.ts`.
- Product prices and totals are recomputed from the database on every order —
  the client-provided values are ignored.
