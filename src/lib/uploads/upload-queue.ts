import { checkFile } from "./file-types";
import { putFile, type UploadAdapter, UploadApiError } from "./upload-api";

export type UploadStatus = "queued" | "uploading" | "confirming" | "processing" | "done" | "failed";

export type UploadItem = {
  key: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number; // 0..1 of the byte transfer
  error?: string;
  photoId?: string;
  url?: string;
  contentType?: string;
  /** False when retrying can't help (unsupported type, size limit). */
  retriable?: boolean;
  /** Local object URL for the row preview (small images only). */
  previewUrl?: string;
};

const PREVIEW_MAX_BYTES = 12 * 1024 * 1024;

// Decoding hundreds of 20 MB+ originals for 40 px previews would exhaust memory.
function localPreview(file: File): string | undefined {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > PREVIEW_MAX_BYTES) return undefined;
  return URL.createObjectURL(file);
}

function release(item: UploadItem) {
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
}

const UPLOAD_CONCURRENCY = 4;
const PROCESS_CONCURRENCY = 3;
const PRESIGN_BATCH = 50;
const AUTO_RETRIES = 2;

let seq = 0;

/**
 * Upload lifecycle on the client (docs/ARCHITECTURE.md §7):
 * queued → presign (batched) → PUT to storage (4 parallel, progress, auto-retry)
 * → confirm (batched) → process derivatives (3 parallel) → done | failed.
 * Framework-free; React subscribes through useSyncExternalStore.
 */
export class UploadQueue {
  private items: UploadItem[] = [];
  private snapshot: UploadItem[] = [];
  private listeners = new Set<() => void>();
  private controllers = new Map<string, AbortController>();
  private confirmBuffer: string[] = [];
  private confirmTimer: ReturnType<typeof setTimeout> | null = null;
  private presigning = false;
  private processing = 0;
  private processQueue: string[] = [];
  private wasBusy = false;
  private resumed = new Set<string>();

  constructor(
    private api: UploadAdapter,
    private hooks: { onPhotoReady?: () => void; onIdle?: (summary: { done: number; failed: number }) => void } = {},
  ) {}

  setAdapter(api: UploadAdapter) {
    this.api = api;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    this.snapshot = [...this.items];
    this.listeners.forEach((l) => l());
  }

  private patch(key: string, change: Partial<UploadItem>) {
    this.items = this.items.map((i) => (i.key === key ? { ...i, ...change } : i));
    this.emit();
  }

  private get(key: string) {
    return this.items.find((i) => i.key === key);
  }

  add(files: File[]) {
    for (const file of files) {
      const check = checkFile(file);
      this.items.push({
        key: `u${++seq}`,
        file,
        name: file.name,
        size: file.size,
        status: check.ok ? "queued" : "failed",
        progress: 0,
        error: check.ok ? undefined : check.reason,
        retriable: check.ok,
        previewUrl: localPreview(file),
      });
    }
    this.emit();
    void this.pump();
  }

  cancel(key: string) {
    this.controllers.get(key)?.abort();
    const item = this.get(key);
    if (item) release(item);
    this.items = this.items.filter((i) => i.key !== key);
    this.emit();
    void this.pump();
  }

  clearFinished() {
    const finished = (i: UploadItem) => i.status === "done" || i.status === "failed";
    this.items.filter(finished).forEach(release);
    this.items = this.items.filter((i) => !finished(i));
    this.emit();
  }

  async retry(key: string) {
    const item = this.get(key);
    if (!item || item.status !== "failed") return;
    if (!item.photoId) {
      // Never reached the server (validation/presign) — start over.
      if (!checkFile(item.file).ok) return;
      this.patch(key, { status: "queued", error: undefined, progress: 0, url: undefined });
    } else {
      try {
        const fresh = await this.api.resign(item.photoId);
        this.patch(key, { status: "queued", error: undefined, progress: 0, url: fresh.url, contentType: fresh.contentType });
      } catch (e) {
        this.patch(key, { error: message(e) });
        return;
      }
    }
    void this.pump();
  }

  /** Resumes derivative generation for photos left UPLOADED by an interrupted session. */
  resumeProcessing(photoIds: string[], force = false) {
    for (const id of photoIds) {
      if (!force && this.resumed.has(id)) continue; // page refreshes re-send the same stuck ids
      this.resumed.add(id);
      if (!this.processQueue.includes(id)) this.processQueue.push(id);
    }
    void this.drainProcessing();
  }

  private async pump() {
    await this.presignPending();
    const active = this.items.filter((i) => i.status === "uploading").length;
    const ready = this.items.filter((i) => i.status === "queued" && i.url).slice(0, Math.max(0, UPLOAD_CONCURRENCY - active));
    ready.forEach((item) => void this.upload(item.key));
    this.checkIdle();
  }

  private async presignPending() {
    if (this.presigning) return;
    const batch = this.items.filter((i) => i.status === "queued" && !i.url && !i.photoId).slice(0, PRESIGN_BATCH);
    if (batch.length === 0) return;
    this.presigning = true;
    try {
      const res = await this.api.presign(batch.map((i) => ({ clientId: i.key, name: i.name, type: i.file.type, size: i.size })));
      for (const u of res.uploads) this.patch(u.clientId, { url: u.url, photoId: u.photoId, contentType: u.contentType });
      for (const r of res.rejected) this.patch(r.clientId, { status: "failed", error: r.reason, retriable: false });
    } catch (e) {
      for (const i of batch) this.patch(i.key, { status: "failed", error: message(e) });
    } finally {
      this.presigning = false;
    }
    if (this.items.some((i) => i.status === "queued" && !i.url && !i.photoId)) await this.presignPending();
  }

  private async upload(key: string) {
    const item = this.get(key);
    if (!item?.url || !item.contentType) return;
    const controller = new AbortController();
    this.controllers.set(key, controller);
    this.patch(key, { status: "uploading", progress: 0 });

    for (let attempt = 0; ; attempt++) {
      try {
        await putFile(item.url, item.file, item.contentType, (p) => this.patch(key, { progress: p }), controller.signal);
        break;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        const retriable = e instanceof UploadApiError && (e.status === 0 || e.status >= 500);
        if (!retriable || attempt >= AUTO_RETRIES) {
          this.controllers.delete(key);
          this.patch(key, { status: "failed", error: message(e) });
          void this.pump();
          return;
        }
        await new Promise((r) => setTimeout(r, 1000 * 3 ** attempt));
      }
    }

    this.controllers.delete(key);
    this.patch(key, { status: "confirming", progress: 1 });
    this.queueConfirm(key);
    void this.pump();
  }

  private queueConfirm(key: string) {
    this.confirmBuffer.push(key);
    if (this.confirmTimer) clearTimeout(this.confirmTimer);
    this.confirmTimer = setTimeout(() => void this.flushConfirm(), this.confirmBuffer.length >= 10 ? 0 : 500);
  }

  private async flushConfirm() {
    const keys = this.confirmBuffer.splice(0);
    const byPhoto = new Map(keys.map((k) => [this.get(k)?.photoId, k] as const));
    const ids = [...byPhoto.keys()].filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    try {
      const res = await this.api.complete(ids);
      for (const id of res.completed) {
        const k = byPhoto.get(id);
        if (k) this.patch(k, { status: "processing" });
        this.processQueue.push(id);
      }
      for (const f of res.failed) {
        const k = byPhoto.get(f.photoId);
        if (k) this.patch(k, { status: "failed", error: f.reason });
      }
    } catch (e) {
      for (const k of keys) this.patch(k, { status: "failed", error: message(e) });
    }
    void this.drainProcessing();
  }

  private async drainProcessing() {
    while (this.processing < PROCESS_CONCURRENCY && this.processQueue.length > 0) {
      const photoId = this.processQueue.shift()!;
      this.processing++;
      void this.api
        .process(photoId)
        .then((r) => {
          const key = this.items.find((i) => i.photoId === photoId)?.key;
          if (!key) return;
          if (r.status === "READY" || r.status === "UPLOADED") this.patch(key, { status: "done" });
          else this.patch(key, { status: "failed", error: r.reason ?? "Falha ao processar" });
        })
        .catch((e) => {
          const key = this.items.find((i) => i.photoId === photoId)?.key;
          if (key) this.patch(key, { status: "failed", error: message(e) });
        })
        .finally(() => {
          this.processing--;
          this.hooks.onPhotoReady?.();
          void this.drainProcessing();
          this.checkIdle();
        });
    }
  }

  private checkIdle() {
    const busy = this.items.some((i) => i.status === "queued" || i.status === "uploading" || i.status === "confirming" || i.status === "processing");
    if (busy || this.processing > 0 || this.processQueue.length > 0) {
      this.wasBusy = true;
      return;
    }
    if (this.wasBusy) {
      this.wasBusy = false;
      this.hooks.onIdle?.({
        done: this.items.filter((i) => i.status === "done").length,
        failed: this.items.filter((i) => i.status === "failed").length,
      });
    }
  }
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : "Erro inesperado";
}
