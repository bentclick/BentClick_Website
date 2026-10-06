import "server-only";
import { once } from "node:events";
import { PassThrough } from "node:stream";
import archiver from "archiver";
import type { DownloadQuality } from "@/generated/prisma/enums";
import { readObjectStream, uploadStream } from "@/lib/r2/objects";
import { uniqueEntryNames } from "./archive-plan";
import { type DeliverablePhoto, resolveDeliveryObject } from "./delivery.service";

/**
 * Streams photos into a ZIP and the ZIP straight into storage (multipart):
 * neither the archive nor the photos are ever held in memory as a whole.
 * Entries are STORED, not deflated — JPEG/WebP are already compressed.
 */
export async function buildArchive(key: string, photos: DeliverablePhoto[], quality: DownloadQuality): Promise<void> {
  const archive = archiver("zip", { store: true });
  const sink = new PassThrough();
  archive.pipe(sink);
  const uploaded = uploadStream(key, sink, "application/zip");

  let failure: unknown = null;
  archive.on("error", (e) => {
    failure = e;
    sink.destroy(e);
  });
  archive.on("warning", (e) => console.warn("[archive] warning", e));

  const objects = [];
  for (const photo of photos) objects.push(await resolveDeliveryObject(photo, quality));
  const names = uniqueEntryNames(objects.map((o) => o.filename));

  for (let i = 0; i < objects.length; i++) {
    if (failure) break;
    // One source stream at a time: wait until archiver has consumed the entry.
    const entry = once(archive, "entry");
    archive.append(await readObjectStream(objects[i]!.key), { name: names[i]! });
    await entry;
  }
  await archive.finalize();
  await uploaded;
  if (failure) throw failure;
}
