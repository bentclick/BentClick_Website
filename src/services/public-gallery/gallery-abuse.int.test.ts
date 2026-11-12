/**
 * Abuse battery for the public gallery (security scan 2026-10-07, findings 1, 3–6).
 * Runs the real services against the local Postgres with disposable data; every
 * attack has a negative control proving the legitimate path still works.
 *
 *   RUN_DB_TESTS=1 npx vitest run src/services/public-gallery/gallery-abuse.int.test.ts
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// ── Request context stand-ins (Next's headers()/cookies()/after()) ──────────
const ctx = { ip: "203.0.113.1", jar: new Map<string, string>() };
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": ctx.ip, "user-agent": "abuse-battery" }),
  cookies: async () => ({
    get: (name: string) => (ctx.jar.has(name) ? { name, value: ctx.jar.get(name) } : undefined),
    set: (name: string, value: string) => void ctx.jar.set(name, value),
    delete: (name: string) => void ctx.jar.delete(name),
  }),
}));
vi.mock("next/server", () => ({ after: () => undefined }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => null }));

const run = process.env.RUN_DB_TESTS === "1";
const tag = `abuse-${randomBytes(4).toString("hex")}`;
const randomIp = () => `198.51.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
const slugOf = () => randomBytes(9).toString("base64").replace(/[^0-9A-Za-z]/g, "x").slice(0, 12);

describe.skipIf(!run)("public gallery abuse battery", async () => {
  const { prisma } = await import("@/lib/db/prisma");
  const { hashGalleryPassword } = await import("@/lib/security/password");
  const { unlockWithPassword, identifyVisitor } = await import("./public-gallery.service");
  const { toggleFavorite, submitSelection } = await import("@/services/favorites/favorites.service");
  const { reopenSelection } = await import("@/services/favorites/selections.service");
  const { visitorArchiveStatus } = await import("@/services/downloads/visitor-download.service");

  const userId = `${tag}-user`;

  async function makeGallery(data: Record<string, unknown> = {}) {
    const slug = slugOf();
    const collection = await prisma.collection.create({ data: { userId, title: `${tag} gallery`, slug, status: "PUBLISHED", ...data } });
    const gallery = await prisma.gallery.create({ data: { collectionId: collection.id, name: "Fotos" } });
    const photo = await prisma.photo.create({
      data: {
        userId,
        collectionId: collection.id,
        galleryId: gallery.id,
        filename: "a.jpg",
        originalFilename: "a.jpg",
        mimeType: "image/jpeg",
        fileSize: 1000n,
        storageKey: `${tag}/${slug}/a.jpg`,
        status: "READY",
      },
    });
    return { collection, slug, photo };
  }

  const code = (p: Promise<unknown>) => p.then(() => "OK", (e: { code?: string; name?: string }) => e.code ?? e.name);

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, name: tag, email: `${tag}@example.test` } });
  });
  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined); // cascades to collections
    await prisma.$disconnect();
  });

  it("locks a gallery after 20 wrong passwords from many IPs (finding 1)", async () => {
    const { slug } = await makeGallery({ passwordHash: await hashGalleryPassword("Praia-Sol-1234!") });
    ctx.jar.clear();
    ctx.ip = randomIp();
    expect(await code(unlockWithPassword(slug, "Praia-Sol-1234!"))).toBe("OK"); // control

    for (let i = 0; i < 20; i++) {
      ctx.ip = randomIp(); // rotating IPs defeats any per-IP limit
      expect(await code(unlockWithPassword(slug, `wrong-${i}`))).toBe("WRONG_PASSWORD");
    }
    ctx.ip = randomIp();
    ctx.jar.clear();
    expect(await code(unlockWithPassword(slug, "Praia-Sol-1234!"))).toBe("GALLERY_LOCKED");
  }, 60_000);

  it("counts only wrong passwords toward the lock: the client's right one gives its attempt back (2026-11-11)", async () => {
    const { slug } = await makeGallery({ passwordHash: await hashGalleryPassword("Praia-Sol-1234!") });
    for (let i = 0; i < 19; i++) {
      ctx.ip = randomIp();
      expect(await code(unlockWithPassword(slug, `wrong-${i}`))).toBe("WRONG_PASSWORD");
    }
    for (let i = 0; i < 3; i++) {
      ctx.ip = randomIp();
      ctx.jar.clear();
      expect(await code(unlockWithPassword(slug, "Praia-Sol-1234!"))).toBe("OK");
    }
    ctx.ip = randomIp();
    expect(await code(unlockWithPassword(slug, "wrong-20"))).toBe("WRONG_PASSWORD"); // the 20th wrong one
    ctx.ip = randomIp();
    ctx.jar.clear();
    expect(await code(unlockWithPassword(slug, "Praia-Sol-1234!"))).toBe("GALLERY_LOCKED");
  }, 60_000);

  it("a ZIP that contains a deleted or re-edited photo stops being handed out at once (2026-11-11)", async () => {
    const { retireArchivesWithPhotos } = await import("@/services/maintenance/maintenance.service");
    const { collection, photo } = await makeGallery();
    const other = await makeGallery(); // control: a ZIP without that photo stays
    const job = (collectionId: string, photoId: string) =>
      prisma.downloadJob.create({
        data: { collectionId, type: "ALL", quality: "HIGH_RES", status: "READY", expiresAt: new Date(Date.now() + 3600_000), parts: { create: [{ index: 0, status: "READY", photoIds: [photoId] }] } },
      });
    const hit = await job(collection.id, photo.id);
    const kept = await job(other.collection.id, other.photo.id);
    expect(await retireArchivesWithPhotos([photo.id])).toBe(1);
    expect((await prisma.downloadJob.findUniqueOrThrow({ where: { id: hit.id } })).status).toBe("FAILED");
    expect((await prisma.downloadJob.findUniqueOrThrow({ where: { id: kept.id } })).status).toBe("READY");
  });

  it("a parallel burst can't pass the lock's ceiling: the count is one atomic step (2026-11-11)", async () => {
    const { consumeRateLimitWindow } = await import("@/lib/security/rate-limit");
    const key = `${tag}-burst`;
    const results = await Promise.all(Array.from({ length: 40 }, () => consumeRateLimitWindow(key, 20, 60)));
    expect(results.filter((r) => r.allowed)).toHaveLength(20);
    await prisma.rateLimitBucket.delete({ where: { key } });
  });

  it("limits new sessions per IP when the visitor drops the cookie (finding 3)", async () => {
    const { slug, photo } = await makeGallery();
    ctx.ip = randomIp();
    for (let i = 0; i < 30; i++) {
      ctx.jar.clear();
      expect(await code(toggleFavorite(slug, photo.id))).toBe("OK");
    }
    ctx.jar.clear();
    expect(await code(toggleFavorite(slug, photo.id))).toBe("RATE_LIMITED");
    ctx.ip = randomIp(); // control: another visitor is unaffected
    expect(await code(toggleFavorite(slug, photo.id))).toBe("OK");
  }, 60_000);

  it("refuses a ZIP once downloads are turned off or the quality is lowered (finding 4)", async () => {
    const { collection, slug } = await makeGallery({ allowFullDownload: true, downloadQuality: "ORIGINAL" });
    const job = await prisma.downloadJob.create({
      data: { collectionId: collection.id, type: "ALL", quality: "ORIGINAL", status: "READY", expiresAt: new Date(Date.now() + 3_600_000) },
    });
    ctx.jar.clear();
    ctx.ip = randomIp();
    expect(await code(visitorArchiveStatus(slug, job.id))).toBe("OK"); // control

    await prisma.collection.update({ where: { id: collection.id }, data: { downloadQuality: "WEB" } });
    expect(await code(visitorArchiveStatus(slug, job.id))).toBe("DOWNLOAD_DISABLED");

    await prisma.collection.update({ where: { id: collection.id }, data: { downloadQuality: "ORIGINAL", allowFullDownload: false } });
    expect(await code(visitorArchiveStatus(slug, job.id))).toBe("DOWNLOAD_DISABLED");
  });

  it("closes the selection once sent; only the photographer reopens it (finding 5 + decision 4)", async () => {
    const { slug, photo } = await makeGallery();
    ctx.jar.clear();
    ctx.ip = randomIp();
    expect(await code(toggleFavorite(slug, photo.id))).toBe("OK");
    const identity = { clientName: "Cliente Teste", clientEmail: "cliente@example.test" };
    expect(await code(submitSelection(slug, identity))).toBe("OK");

    expect(await code(submitSelection(slug, identity))).toBe("SELECTION_CLOSED"); // no second e-mail
    expect(await code(toggleFavorite(slug, photo.id))).toBe("SELECTION_CLOSED");

    const session = await prisma.clientSession.findFirstOrThrow({ where: { collection: { slug } } });
    await reopenSelection(userId, session.id);
    expect(await code(toggleFavorite(slug, photo.id))).toBe("OK"); // control after reopening
  });

  it("contact form: honeypot stores nothing; 6th message from one IP in an hour is refused", async () => {
    const { submitLead } = await import("@/services/leads/lead.service");
    const email = `${tag}@example.test`;
    const base = { name: "Visitante", email, phone: "", eventType: "" as const, eventDate: "", message: "Mensagem de teste da bateria." };
    try {
      ctx.ip = randomIp();
      expect(await code(submitLead({ ...base, website: "http://spam.example" }))).toBe("OK"); // bot sees success…
      expect(await prisma.lead.count({ where: { email } })).toBe(0); // …but nothing is stored

      for (let i = 0; i < 5; i++) expect(await code(submitLead({ ...base, website: "" }))).toBe("OK"); // control
      expect(await code(submitLead({ ...base, website: "" }))).toBe("RATE_LIMITED");
      expect(await prisma.lead.count({ where: { email } })).toBe(5);
    } finally {
      await prisma.lead.deleteMany({ where: { email } });
    }
  });

  it("enforces 'ask name and e-mail' on the server (finding 6)", async () => {
    const { slug, photo } = await makeGallery({ requireClientIdentity: true });
    ctx.jar.clear();
    ctx.ip = randomIp();
    expect(await code(toggleFavorite(slug, photo.id))).toBe("IDENTITY_REQUIRED");
    await identifyVisitor(slug, { clientName: "Cliente", clientEmail: "c@example.test" });
    expect(await code(toggleFavorite(slug, photo.id))).toBe("OK"); // control
  });
});
