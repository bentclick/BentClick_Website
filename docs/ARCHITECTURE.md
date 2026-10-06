# BentClick — Architecture

Premium client-gallery and portfolio platform for a professional photographer.
Workflow: **create collection → upload → organise → customise → preview → publish → share → client views → favourites / downloads.**

This document is the source of truth for structure and rules. Phases are listed in §11.

---

## 1. Application architecture

```
                         ┌────────────────────────────────────────┐
  Photographer / Client  │  Next.js 16 (App Router) on Vercel      │
  browser ─────────────▶ │  RSC pages · Server Actions · Route     │──▶ PostgreSQL (Prisma 7 + pg adapter)
        │                │  Handlers · proxy.ts (auth gate)        │      metadata only, never bytes
        │                └───────────────┬────────────────────────┘
        │  presigned PUT (originals)     │ signs URLs (S3 API, no bytes)
        └──────────────────────────────▶ ▼
                                   Cloudflare R2 (PRIVATE bucket)
                                         ▲
                                         │ GET original / PUT derivatives & ZIPs
                               ┌─────────┴─────────┐
                               │ Media worker (Node│  sharp (thumb/preview/watermark)
                               │ + sharp + zip)    │  streaming ZIP → R2 multipart
                               └───────────────────┘
                               DB-backed job queue (FOR UPDATE SKIP LOCKED)

  Resend ◀── email service (gallery delivery, webhooks update EmailLog)
```

**Hard rules**

- Photo bytes **never** pass through Vercel. Uploads: browser → R2 via presigned PUT. Downloads: browser ← R2 via short-lived presigned GET.
- Heavy work (derivatives, ZIP archives) runs in the **media worker**, not in a request. The worker is a plain Node process (`src/worker/`) that can run on any container host; it claims jobs from Postgres with `SELECT … FOR UPDATE SKIP LOCKED`, so no extra queue vendor is required. Vercel Cron pings `/api/cron/*` for housekeeping (expiry sweep, abandoned-upload cleanup, ZIP expiry).
- All authorisation is server-side. The UI only hides what the server already forbids.

### Layering (per `modular-code-generation`)

| Layer | Location | Owns |
|---|---|---|
| Data model / migrations | `prisma/` | Schema, migrations, seed |
| Contracts | `src/lib/validation/` | Zod schemas → inferred TS types. Shared by forms and actions. |
| Repositories | `src/services/**/…repository.ts` | Every Prisma query. Always scoped by `userId` or by a validated client session. |
| Services | `src/services/**/…service.ts` | Business rules (publish checks, expiry, counters, quota). No HTTP, no React. |
| Policies | `src/lib/security/` | Ownership checks, gallery access evaluation, rate limiting, hashing, tokens. |
| Transport | `src/actions/` (Server Actions), `src/app/**/route.ts` | Thin: parse with Zod → authorise → call service → map result. |
| Infra clients | `src/lib/{db,r2,email,images,auth}/` | Prisma client, S3 client, Resend, sharp helpers, Better Auth. |
| UI | `src/components/{ui,admin,gallery,photos}/` | Presentational + small client islands. No queries, no rules. |
| Pages | `src/app/**/page.tsx` | Layout + orchestration only. |

---

## 2. Prisma schema

See [`prisma/schema.prisma`](../prisma/schema.prisma). Highlights:

- **Collection** is the deliverable; **Gallery** is a named set inside it (Highlights, Ceremony…). **Photo** belongs to both (`collectionId` denormalised for fast queries; `userId` denormalised for storage aggregation and ownership).
- `Collection.slug` is a 12-char base62 random token (≈71 bits), unique. `linkEnabled` disables it without deleting.
- `Collection.accessVersion` is bumped on password change / link regeneration — every `ClientSession` carrying an older version is instantly invalid.
- Cached counters (`photoCount`, `totalBytes`, `Gallery.photoCount`) are updated in the same transaction as the photo mutation.
- Storage usage = `SUM(Photo.fileSize) + SUM(PortfolioImage.fileSize)` for the user — computed, never stored.
- `RateLimitBucket` gives fixed-window rate limiting on serverless without Redis (swap for Upstash later if needed).

---

## 3. Route tree

```
src/app/
├── (public)/                      public photographer website (editorial)
│   ├── page.tsx                   /
│   ├── portfolio/page.tsx         /portfolio
│   ├── portfolio/[albumSlug]/     /portfolio/:album
│   ├── about/page.tsx             /about
│   └── contact/page.tsx           /contact
├── (auth)/
│   └── login/page.tsx             /login
├── dashboard/                     photographer admin (proxy.ts + layout guard)
│   ├── layout.tsx                 sidebar shell
│   ├── page.tsx                   overview → recent collections, activity
│   ├── collections/
│   │   ├── page.tsx               list (grid/list, search, filters)
│   │   ├── new/page.tsx           create form
│   │   └── [collectionId]/
│   │       ├── layout.tsx         editor top bar + left rail
│   │       ├── page.tsx           photos (default gallery)
│   │       ├── galleries/[galleryId]/page.tsx
│   │       ├── design/page.tsx
│   │       ├── privacy/page.tsx
│   │       ├── download/page.tsx
│   │       └── activity/page.tsx
│   ├── clients/page.tsx (+ [clientId]/page.tsx)
│   ├── portfolio/page.tsx
│   ├── downloads/page.tsx
│   └── settings/[section]/page.tsx  profile|brand|defaults|watermarks|downloads|email|storage|security
├── g/[publicSlug]/                client gallery (no admin chrome, immersive)
│   ├── page.tsx                   hero + gallery
│   ├── access/page.tsx            password / PIN
│   ├── favorites/page.tsx
│   └── expired (rendered state, not a route)
└── api/
    ├── auth/[...all]/route.ts     Better Auth
    ├── uploads/presign/route.ts   batch presign (admin)
    ├── uploads/complete/route.ts  confirm upload (admin)
    ├── g/[publicSlug]/download/route.ts   → 302 to signed URL
    ├── g/[publicSlug]/archive/route.ts    create/poll DownloadJob
    ├── webhooks/resend/route.ts
    └── cron/{expire,cleanup}/route.ts     CRON_SECRET-protected
```

---

## 4. Reusable components

| Folder | Components |
|---|---|
| `components/ui` | Button, Input, Label, Textarea, Select, Checkbox, Switch, DropdownMenu, Dialog, Sheet, Tooltip, Progress, Badge, Separator, Skeleton, Toaster, EmptyState |
| `components/admin` | AppSidebar, SidebarNav, StorageMeter, UserMenu, MobileNav, PageHeader, CollectionCard, CollectionRow, CollectionStatusBadge, CollectionActionsMenu, CollectionFilters, ViewToggle, SearchField, CollectionForm (+ sections), EditorTopBar, EditorRail, GalleryList, PublishDialog, ShareDialog, EmailClientDialog |
| `components/photos` | PhotoGrid (virtualised), PhotoTile, PhotoSelectionBar, UploadDropzone, UploadPanel, UploadRow, SortMenu, GridSizeControl |
| `components/gallery` | GalleryHero, GalleryHeader, MasonryLayout, EditorialLayout, GridLayout, ProgressiveImage, Lightbox, FavoriteButton, DownloadMenu, ShareMenu, Slideshow, AccessForm, ExpiredScreen, IdentityDialog |

Hooks: `useUploadQueue`, `useSelection`, `useLightboxKeys`, `useSwipe`, `useInfinitePhotos`, `useCopyToClipboard`.

---

## 5. Cloudflare R2 strategy

**Bucket:** one private bucket, no public access, no r2.dev domain. CORS allows `PUT`/`GET` from the app origin only.

**Key layout** (`src/lib/r2/keys.ts` is the only place keys are built):

```
photographers/{userId}/collections/{collectionId}/originals/{photoId}.{ext}
photographers/{userId}/collections/{collectionId}/previews/{photoId}.webp
photographers/{userId}/collections/{collectionId}/thumbnails/{photoId}.webp
photographers/{userId}/archives/{downloadJobId}.zip
photographers/{userId}/brand/{logo|favicon|watermark-{id}}.{ext}
photographers/{userId}/portfolio/{albumId}/{originals|previews|thumbnails}/{imageId}.{ext}
```

> Deviation from the brief: keys are partitioned by **collection**, not gallery. Galleries are sets that photos move between; keying by gallery would force object copies on every "move to gallery".

**Derivatives** (worker, sharp, sRGB, EXIF orientation applied, metadata stripped):

| Variant | Size (long edge) | Format | Watermark |
|---|---|---|---|
| thumbnail | 600 px | WebP q72 | no (too small to be useful stolen) |
| preview | 2048 px | WebP q82 | yes, when collection has one |
| original | unchanged | as uploaded | **never** modified |

Changing a collection's watermark re-queues preview regeneration only.

**URL issuance**

- Upload: presigned `PUT`, 15 min, `Content-Type` and `Content-Length` bound into the signature.
- Gallery images: presigned `GET` for thumbnails/previews with expiry **rounded up to the next 6-hour window**, so the same URL is reused across page loads and browser-cacheable. Planned upgrade: a Cloudflare Worker on `media.<domain>` validating HMAC tokens with edge caching.
- Downloads: presigned `GET` for originals/ZIPs, **10 min**, `response-content-disposition=attachment; filename="…"`.
- Permanent object URLs are never exposed or stored.

---

## 6. Authorisation rules

### Photographer (Better Auth, email + password; session cookie, httpOnly, SameSite=Lax)

1. `proxy.ts` redirects unauthenticated `/dashboard/**` requests to `/login` (cheap cookie check).
2. **Every** server action / route handler calls `requireUser()` (full session validation) — the proxy is not trusted alone.
3. Every resource id from the browser is resolved through a repository method scoped by `userId` (`findOwnedCollection(userId, id)`); not found ⇒ 404, never 403 (no existence leak).
4. Photo / gallery ids in bulk operations are re-queried with `WHERE id IN (…) AND userId = ?`; mismatched counts abort the operation.
5. Server Actions get Next's built-in Origin check (CSRF). Route handlers that mutate check `Origin` against `NEXT_PUBLIC_APP_URL`.
6. Sign-up is disabled unless `ALLOW_SIGNUP=true` (single-photographer product).

### Client (no account)

`evaluateGalleryAccess(slug, cookieToken)` in `src/lib/security/gallery-access.ts` returns one of
`NOT_FOUND | DISABLED | EXPIRED | NEEDS_PASSWORD | GRANTED(session)`:

| Check | Fails as |
|---|---|
| slug exists, `linkEnabled`, status `PUBLISHED` | NOT_FOUND / DISABLED |
| `expiresAt` null or in the future | EXPIRED (and lazily flips status) |
| `passwordHash` null **or** session `passwordOk` with matching `accessVersion` | NEEDS_PASSWORD |

- Client session token: 32 random bytes in an httpOnly, Secure, SameSite=Lax cookie scoped to `/g/{slug}`; DB stores SHA-256 only.
- Password/PIN: argon2id; attempts rate-limited per (IP-hash, collection): 5 / 15 min.
- Feature gates re-checked per action: `allowFavorites`, `allowIndividualDownload`, `allowFullDownload`, `allowSharing`.
- Photo ids sent by clients must belong to the session's collection and be `READY`.

### Rate limits

| Action | Limit |
|---|---|
| Login | Better Auth built-in |
| Gallery password | 5 / 15 min / IP+collection |
| Download URL issue | 120 / 10 min / session |
| Archive job create | 3 / hour / session |
| Presign batch | 30 / min / user, ≤ 200 files per batch |

---

## 7. Upload lifecycle

```
 Browser                         Next.js                           R2            Worker
 ──────                          ───────                           ──            ──────
 pick/drop files
 validate type/size locally
 POST /api/uploads/presign  ──▶  requireUser, own collection+gallery
   [{name,type,size}] ≤200        check MIME allowlist, size ≤ 200 MB (RAW ≤ 150 MB)
                                  check quota (used + batch ≤ quota)
                                  create Photo rows status=PENDING_UPLOAD
 ◀── [{photoId, url, headers}]    sign PUT (15 min, type+length bound)
 PUT bytes (4 concurrent,  ─────────────────────────────────────▶ store original
   XHR progress, retry ×3
   with backoff)
 POST /api/uploads/complete ──▶  HEAD object: exists, size matches, type matches
   {photoIds[]}                   tx: status=UPLOADED, counters += size
                                  enqueue derivative job ───────────────────────────▶ claim (SKIP LOCKED)
                                                                                     GET original, sniff magic bytes
                                                                                     sharp → thumb, preview(+wm)
                                                                                     PUT derivatives, read w/h/EXIF
                                                                                     status=READY | FAILED
 poll / revalidate grid  ◀──────────────────────────────────────────────────────────
```

- **Implemented (Phase 3):** `POST /api/uploads/presign` → browser `PUT` (4 parallel, XHR progress, 2 automatic retries) → `POST /api/uploads/complete` (HEAD-verified) → `POST /api/photos/:id/process`.
- **Derivatives run in a Vercel function, one photo per call** (`maxDuration` 60 s, `sharp`), fanned out 3 at a time by the browser right after upload. Bytes flow R2 → function → R2 only; the browser→server upload path never carries photo bytes. Photos left `UPLOADED` by a closed tab are resumed the next time the gallery opens. A queue worker remains the scale-up path for very large batches.
- Client queue states: `queued → uploading → confirming → processing → done | failed` (`src/lib/uploads/upload-queue.ts`); retry re-requests a fresh presigned URL for the same `photoId` (`/api/uploads/resign`).
- Content that isn't a real JPEG/PNG/WebP (checked by `sharp`, not the declared MIME) is deleted along with its row.
- Local development uses `adobe/s3mock` (docker compose `storage`, `R2_ENDPOINT`) as the S3-compatible stand-in.
- Magic-byte sniffing in the worker rejects files whose content does not match the declared MIME (→ `FAILED`, object deleted).
- Cron `cleanup`: `PENDING_UPLOAD` older than 24 h → delete row (+ object if present).
- RAW files (`.cr3`, `.nef`, `.arw`, `.dng`) are stored as originals only; no derivatives, hidden from client galleries unless explicitly enabled.

---

## 8. Gallery expiration lifecycle

```
 DRAFT ──publish──▶ PUBLISHED ──(now > expiresAt)──▶ EXPIRED
   ▲                   │  ▲                             │
   └──unpublish────────┘  └──extend / reactivate────────┘
                       │                                │
                       └────────archive────────▶ ARCHIVED ──restore──▶ DRAFT
                                                    │
                                          delete permanently (typed confirmation):
                                          rows + R2 objects removed by worker
```

- **Publish preconditions** (`collection.service.publish`): ≥ 1 `READY` photo, cover photo set (auto-selects first READY photo if missing — UI asks to confirm), expiry not in the past.
- **Expiry detection is double**: (a) at access time `evaluateGalleryAccess` treats `expiresAt < now` as EXPIRED and flips status in the background; (b) hourly cron sweeps `PUBLISHED AND expiresAt < now` → `EXPIRED` + `ActivityLog(COLLECTION_EXPIRED)`.
- Expired galleries render the custom screen "This gallery is no longer available." — no photo URLs are issued.
- Originals are **never** deleted on expiry. Only "Delete permanently" removes bytes.
- Extending sets a new `expiresAt` and returns status to `PUBLISHED` (logs `EXPIRATION_CHANGED`).
- ZIP archives expire after 72 h; cron deletes the object and clears `zipStorageKey`.

---

## 9. Database relationships

```
User 1─1 PhotographerProfile
User 1─* Session, Account                       (Better Auth)
User 1─* Client 1─* Collection
User 1─* Collection 1─* Gallery 1─* Photo
              │  └─ coverPhoto ─▶ Photo (1─1, SetNull)
              │  └─ watermark  ─▶ Watermark (*─1, SetNull)
              ├─* ClientSession 1─* Favorite *─1 Photo
              ├─* Download  (→ Photo?, → ClientSession?, → DownloadJob?)
              ├─* DownloadJob (→ Gallery?, → ClientSession?)
              ├─* EmailLog (→ Client?)
              └─* ActivityLog (→ ClientSession?)
User 1─* Watermark
User 1─* PortfolioAlbum 1─* PortfolioImage       (independent from client photos)
```

Deletion semantics: deleting a Collection cascades to galleries, photos, sessions, favourites, jobs and activity; R2 objects are deleted by the worker *before* the row delete commits (job `PURGE_COLLECTION`).

---

## 9a. Admin-editable content (product requirement)

Everything a visitor sees on the public site and on gallery presentation must be editable by the photographer from ADM mode — texts, colours, photos, and adding/removing/reordering sections — without code changes. Copy written in components is only a **default seed**.

Implemented (Phase 11) as a single `SiteContent` JSON document validated by `siteContentSchema` (per-field defaults, so older documents keep parsing), edited at `/dashboard/site`. The table below is the longer-term section model:

| Model | Holds |
|---|---|
| `SiteSettings` (1 per studio) | brand name, tagline, accent + font pair, social/contact channels, SEO title/description, favicon/logo keys |
| `SitePage` | `home`, `about`, `contact`, `portfolio`, `client-area`; title, slug, published flag |
| `SiteSection` | `pageId`, `type` (`hero`, `text`, `featured-work`, `gallery-grid`, `cta`, `contact`, …), `sortOrder`, `isVisible`, `props Json` validated by a Zod schema per `type` |
| `Collection` presentation fields | cover text lines, CTA label, overlay strength, layout, visible client features (already partly in schema) |

Rendering: each page loads its ordered visible sections and maps `type → component`; components receive typed props only. Editing: when a signed-in photographer visits a public page with `?editar`, an edit layer enables inline text editing, image pickers (from portfolio/R2), section add/remove/reorder and a theme panel; every save is a server action that re-validates the section's Zod schema and revalidates the page. The client-gallery prototype (`Modo ADM`) demonstrates the intended interaction.

---

## 10. BentClick identity & design system

**Brand.** BC monogram (B over C, interlocking, lower-right offset) outlined from Cormorant Garamond 500 into pure SVG paths — `src/components/brand/monogram-paths.ts` (regenerate, never hand-edit; SIL OFL font). It paints with `currentColor`, so white-over-photo and black-on-light versions come for free and it works as favicon (`src/app/icon.svg`) and future watermark.

| Lockup (`<Logo variant>`) | Use |
|---|---|
| `mark` | favicon, collapsed sidebar, watermark |
| `stacked` — BC / BENTCLICK | mobile menu |
| `full` — BC / BENTCLICK / FOTOGRAFIA | login panel, footer |
| `horizontal` — BC │ BENTCLICK | site header, admin sidebar |

Wordmark: Cormorant caps, letter-spacing 0.42em. Secondary line: Inter caps, 0.6em.

| Token | Value | Use |
|---|---|---|
| `--foreground` / `--gallery-dark` | `#111111` | text, dark galleries, lightbox |
| `--accent` / `--accent-hover` | `#A27B5C` / `#8B674C` | **sparingly**: primary CTA, active nav, selected filters |
| `--accent-soft` | `#F2EBE4` | active nav / selected filter fill |
| `--taupe` | `#D9D0C6` | secondary-button borders, switch track, placeholders |
| `--background` | `#F8F7F4` | canvas |
| `--surface` | `#FFFFFF` | panels, cards |
| `--muted-foreground` | `#77736D` | secondary text |
| `--border` | `#E8E5DF` | 1 px hairlines |
| `--overlay` | `rgba(0,0,0,.35)` | photo scrims (hero uses a directional gradient) |

Typography: **Cormorant Garamond** for logo, hero, gallery titles, client names, section headings; **Inter** for buttons, menus, filters, forms, dates, metadata. Radii: inputs/buttons 4–6 px, cards 6–8 px. No shadows beyond menus/dialogs, no glass, gradients only over photography. Transitions 150–250 ms (image fades longer). UI language: **pt-BR** (`Intl` pt-BR dates: "3 de out. de 2026").

`/dev/brand` is a development-only living brand board (404 in production) used for visual QA of logos, palette, type and admin components.

Photographer branding in client galleries (logo, accent, font pair from a curated list) is applied through CSS variables on the gallery root only — templates stay controlled.

---

## 11. Phases

| # | Scope | Status |
|---|---|---|
| 1 | Foundation, auth, database, dashboard shell | done |
| 2 | Collections CRUD, clients, galleries | done |
| 3 | R2, presigned uploads, upload UI ("Adicionar fotos") | done |
| 4 | Derivatives, gallery organisation | done |
| 5 | Client gallery cover, view, lightbox | done |
| 6 | Favourites / selections | done |
| 7 | Download authorisation, signed URLs, ZIP jobs | done |
| 8 | Expiry, password/PIN, publishing | done |
| 9 | Email (Resend) | done |
| 10 | Analytics / activity | done |
| 11 | Portfolio / public website, admin-editable site content | done |
| 12 | Settings, clients CRUD, watermarks (preview-only, versioned), collection Design tab | done |

Public pages use ISR (`revalidate = 600`) and therefore read the database at build time.
