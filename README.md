# StableRoute

Custom-named USD bank for domestic ACH and Wire transfers, settled to USDC on Base.

A three-panel financial service:

- **Public site** — landing, pricing, contact, login, signup
- **Customer panel** — manage profiles, transactions, and settings
- **Admin panel** — review profiles, change transaction status, manage customers

Each transaction status change (`PENDING` → `COMPLETED` / `REFUNDED`) and profile status change (`PENDING` → `APPROVED`) triggers an automatic email to the customer.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn-style components + Radix UI
- PostgreSQL + Prisma
- NextAuth.js v5 (credentials)
- Resend (transactional email)
- Zod + React Hook Form

## Getting started

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env
# Edit .env: set DATABASE_URL, AUTH_SECRET, RESEND_API_KEY

# 3. Set up the database
npm run db:push
npm run db:seed

# 4. Run the dev server
npm run dev
```

Open <http://localhost:3000>.

### Seeded credentials

After `npm run db:seed`:

| Role     | Email                       | Password    |
| -------- | --------------------------- | ----------- |
| Admin    | `admin@stableroute.io`      | `Admin12345!` (overridable via `ADMIN_PASSWORD`) |
| Customer | `demo@stableroute.io`       | `Demo12345!` |

The demo customer has an approved profile and three sample transactions (one of each status) so you can see all UI states immediately.

## Required environment variables

| Variable           | What it does                                                                 |
| ------------------ | ---------------------------------------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string                                                 |
| `AUTH_SECRET`      | NextAuth signing key — generate with `openssl rand -base64 32`               |
| `RESEND_API_KEY`   | API key from <https://resend.com>. If missing, emails are logged but not sent. |
| `EMAIL_FROM`       | Verified sender (e.g. `StableRoute <no-reply@yourdomain.com>`)               |
| `ADMIN_EMAIL`      | Admin email seeded on first run                                              |
| `ADMIN_PASSWORD`   | Admin password seeded on first run                                           |
| `NEXTAUTH_URL`     | Public URL of the app                                                        |
| `NEXT_PUBLIC_APP_URL` | Public URL referenced in email templates                                  |

## Routes

| Path                       | Audience  |
| -------------------------- | --------- |
| `/`                        | Public    |
| `/pricing`, `/contact`     | Public    |
| `/login`, `/signup`        | Public    |
| `/dashboard/*`             | Customer  |
| `/admin/*`                 | Admin     |

Middleware enforces role-based access on `/admin/*` and `/dashboard/*`.

## Email notifications

| Trigger                                          | Recipient | Subject                         |
| ------------------------------------------------ | --------- | ------------------------------- |
| New signup                                       | Customer  | "Welcome to StableRoute"        |
| Admin sets profile to `APPROVED` / `PENDING`     | Customer  | "Your profile has been …"       |
| Admin sets transaction to `COMPLETED` / `REFUNDED` / `PENDING` | Customer | "Your transfer has been …" |

Every send is logged in the `Notification` table — visible to admins via direct DB inspection (or via Prisma Studio: `npm run db:studio`).

## Useful commands

```bash
npm run dev        # Start dev server
npm run build      # Production build (runs prisma generate)
npm run lint       # Lint
npm run db:push    # Sync Prisma schema to DB (no migrations)
npm run db:migrate # Create + apply a migration
npm run db:seed    # Seed admin + demo customer
npm run db:studio  # Prisma Studio
```

## Data model

```
User
  └─ CustomerProfile (n)       # firstName, lastName, senderName, withdrawalAddress (USDC Base), status
      └─ Transaction (n)       # amountCents, type (ACH|WIRE), status (PENDING|COMPLETED|REFUNDED)
  └─ Notification (n)          # email log
```

A customer can hold multiple profiles. Editing a profile's `withdrawalAddress` automatically resets its status to `PENDING` so admins re-verify the new destination.

## Next steps

- KYC/KYB document collection on profile submission
- Bank partner integration (Increase / Column / Modern Treasury) for real ACH/Wire ingestion
- Webhook receivers for inbound transfer events
- USDC settlement worker (Base mainnet)
- 2FA (TOTP) on customer + admin login
- Audit log for admin actions
- Debit card issuance (planned for v2)
