# BentClick

Private client galleries and portfolio for a professional photographer.
Next.js 16 (App Router) · TypeScript · Tailwind 4 · Prisma 7 / PostgreSQL · Better Auth · Cloudflare R2 · Resend.

Architecture, route tree, R2 strategy, authorisation rules and lifecycles: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.
Production setup (Prisma Postgres, Vercel, Cloudflare DNS + R2): **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## Local setup

```bash
cp .env.example .env          # then fill BETTER_AUTH_SECRET, GALLERY_TOKEN_SECRET, CRON_SECRET
docker compose up -d          # PostgreSQL on 127.0.0.1:55462
npm install                   # also runs prisma generate
npm run db:migrate            # apply migrations
npm run dev                   # http://localhost:3000 (use `-- -p 3100` if 3000 is taken)
```

With `ALLOW_SIGNUP=true`, the login page offers "Set up your studio" to create the photographer account.
Set it back to `false` afterwards — this is a single-photographer product.

R2 and Resend variables are optional until Phases 3 and 9; the dashboard renders without them.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run vercel-build` | Vercel build: `prisma generate` → `prisma migrate deploy` → `next build` |
| `npm run typecheck` · `lint` · `test` | tsc · ESLint · Vitest |
| `npm run db:migrate` · `db:deploy` · `db:studio` | Prisma |

## Layout

```
prisma/              schema + migrations
src/app/             routes (public, auth, dashboard/(shell|editor), api)
src/actions/         server actions — thin: validate → authorise → service
src/services/        business rules (*.service.ts) and data access (*.repository.ts)
src/lib/             infra: auth, db, r2, security, validation (Zod contracts), utils
src/components/      ui primitives, admin, (gallery, photos — upcoming)
src/types/           serialisable DTOs shared by server and client components
```
