import { uploadFileKey } from "./duplicates";
import { checkFile } from "./file-types";
import { putFile, type UploadAdapter, UploadApiError } from "./upload-api";
import { isTransient, needsFreshUrl, pause, retryDelay, withRetry } from "./upload-retry";

export type UploadStatus = "checking" | "queued" | "uploading" | "confirming" | "processing" | "done" | "skipped" | "failed";

/** Finished one way or another: nothing more will happen to it without the photographer. */
export const isFinished = (status: UploadStatus) => status === "done" || status === "skipped" || status === "failed";

export type UploadSummary = { done: number; failed: number; skipped: number };

/** Which step a failed item stopped at, so a retry resumes there instead of starting over. */
export type UploadStage = "upload" | "confirm" | "process";

export type UploadItem = {
  key: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number; // 0..1 of the byte transfer
  error?: string;
  /** Shown while the item is still alive but waiting to try again (connection drop, rate limit). */
  note?: string;
  photoId?: string;
  url?: string;
  contentType?: string;
  /** When the current PUT URL was issued (ms); stale URLs are renewed before use. */
  urlAt?: number;
  failedAt?: UploadStage;
  /** Automatic end-of-queue retry passes already spent on this item. */
  sweeps?: number;
  /** False when retrying can't help (unsupported type, size limit). */
  retriable?: boolean;
  /** Local object URL for the row preview (small images only). */
  previewUrl?: string;
};

const PREVIEW_MAX_BYTES = 12 * 1024 * 1024;

// Decoding hundreds of 20 MB+ originals for 40 px previews would exhaust memory.
function localPreview(file: File): string | undefined {
  if (typeof URL.createObjectURL !== "function") return undefined;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > PREVIEW_MAX_BYTES) return undefined;
  return URL.createObjectURL(file);
}

function release(item: UploadItem) {
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
}

const UPLOAD_CONCURRENCY = 4;
const PROCESS_CONCURRENCY = 3;
/** URLs are asked for in small lots, just ahead of their turn — never the whole drop at once. */
export const PRESIGN_BATCH = 8;
const PRESIGN_AHEAD = UPLOAD_CONCURRENCY;
/** Files per duplicate check call (the route takes up to MAX_CHECK_FILES). */
const CHECK_BATCH = 1000;
/** Automatic passes over the failed items once the rest of the queue is done. */
const MAX_SWEEPS = 1;

const SKIPPED = { status: "skipped" as const, progress: 1, note: "Já está na galeria — pulada", error: undefined };

export type UploadQueueDeps = {
  put?: typeof putFile;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

let seq = 0;

/**
 * Upload lifecycle on the client (docs/ARCHITECTURE.md §7):
 * checking (already in the gallery? → skipped) → queued → presign (small lots, just in time) → PUT to storage (4 parallel,
 * fresh URL on every retry) → confirm (batched) → process derivatives (3 parallel)
 * → done | failed. Transient failures (network, expired URL, 429, 5xx) wait and
 * retry on their own; what still fails gets one more pass when the queue drains.
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
  private readonly put: typeof putFile;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(
    private api: UploadAdapter,
    private hooks: { onPhotoReady?: () => void; onIdle?: (summary: UploadSummary) => void } = {},
    deps: UploadQueueDeps = {},
  ) {
    this.put = deps.put ?? putFile;
    this.sleep = deps.sleep ?? pause;
    this.now = deps.now ?? Date.now;
  }

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

  private fail(key: string, stage: UploadStage, e: unknown) {
    this.patch(key, { status: "failed", failedAt: stage, error: message(e), note: undefined });
  }

  /**
   * Accepts a whole folder, even one dropped before: a file already in this list is
   * not added again (a failed one is retried instead), and the destination is asked
   * which of the rest it already holds before anything is reserved.
   */
  add(files: File[]) {
    const inList = new Map(this.items.map((i) => [uploadFileKey(i.name, i.size), i.key]));
    const toCheck: string[] = [];
    for (const file of files) {
      const id = uploadFileKey(file.name, file.size);
      const existing = inList.get(id);
      if (existing) {
        this.requeue(existing);
        continue;
      }
      const check = checkFile(file);
      const key = `u${++seq}`;
      inList.set(id, key);
      this.items.push({
        key,
        file,
        name: file.name,
        size: file.size,
        status: !check.ok ? "failed" : this.api.check ? "checking" : "queued",
        progress: 0,
        error: check.ok ? undefined : check.reason,
        retriable: check.ok,
        previewUrl: localPreview(file),
      });
      if (check.ok && this.api.check) toCheck.push(key);
    }
    this.emit();
    if (toCheck.length > 0) void this.checkExisting(toCheck);
    this.restart();
  }

  /** Marks what the destination already holds as skipped; if the check fails the files just go ahead (presign refuses duplicates too). */
  private async checkExisting(keys: string[]) {
    const check = this.api.check;
    for (let i = 0; i < keys.length; i += CHECK_BATCH) {
      const chunk = keys
        .slice(i, i + CHECK_BATCH)
        .map((k) => this.get(k))
        .filter((it): it is UploadItem => it?.status === "checking");
      if (chunk.length === 0) continue;
      let duplicates = new Set<string>();
      try {
        if (check) duplicates = new Set((await withRetry(() => check(chunk.map((it) => ({ clientId: it.key, name: it.name, size: it.size }))), this.sleep)).duplicates);
      } catch {
        // Unknown: let them through.
      }
      const verdict = new Map(chunk.map((it) => [it.key, duplicates.has(it.key)] as const));
      this.items = this.items.map((it) => {
        if (it.status !== "checking" || !verdict.has(it.key)) return it;
        return verdict.get(it.key) ? { ...it, ...SKIPPED } : { ...it, status: "queued" as const };
      });
      this.emit();
      void this.pump();
    }
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
    const finished = (i: UploadItem) => isFinished(i.status);
    this.items.filter(finished).forEach(release);
    this.items = this.items.filter((i) => !finished(i));
    this.emit();
  }

  /** Puts one failed item back where it stopped. */
  retry(key: string) {
    this.requeue(key);
    this.restart();
  }

  /** Every failed item that a retry can help, in one go. */
  retryFailed() {
    for (const item of this.items) this.requeue(item.key);
    this.restart();
  }

  private restart() {
    // Work was just handed over: even if it all finishes before the next check (a lot of duplicates), report it.
    if (this.items.some((i) => !isFinished(i.status))) this.wasBusy = true;
    void this.pump();
    void this.drainProcessing();
  }

  private requeue(key: string): boolean {
    const item = this.get(key);
    if (!item || item.status !== "failed" || item.retriable === false) return false;
    const reset = { error: undefined, note: undefined, failedAt: undefined };
    if (item.failedAt === "process" && item.photoId) {
      this.patch(key, { ...reset, status: "processing" });
      if (!this.processQueue.includes(item.photoId)) this.processQueue.push(item.photoId);
    } else if (item.failedAt === "confirm" && item.photoId) {
      this.patch(key, { ...reset, status: "confirming" });
      this.queueConfirm(key);
    } else if (item.photoId) {
      // Reserved on the server already: upload() asks for a fresh URL first.
      this.patch(key, { ...reset, status: "queued", progress: 0, urlAt: undefined });
    } else {
      if (!checkFile(item.file).ok) return false;
      this.patch(key, { ...reset, status: "queued", progress: 0, url: undefined });
    }
    return true;
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

  /** Keeps a few URLs ready ahead of the uploads; a lot that turns out to be all duplicates moves straight on to the next. */
  private async presignPending() {
    if (this.presigning) return;
    this.presigning = true;
    try {
      for (;;) {
        const waiting = this.items.filter((i) => i.status === "queued" && i.url).length;
        if (waiting >= PRESIGN_AHEAD) break;
        const batch = this.items.filter((i) => i.status === "queued" && !i.url && !i.photoId).slice(0, PRESIGN_BATCH);
        if (batch.length === 0) break;
        try {
          const files = batch.map((i) => ({ clientId: i.key, name: i.name, type: i.file.type, size: i.size }));
          const res = await withRetry(() => this.api.presign(files), this.sleep);
          const at = this.now();
          for (const u of res.uploads) this.patch(u.clientId, { url: u.url, photoId: u.photoId, contentType: u.contentType, urlAt: at });
          for (const r of res.rejected) this.patch(r.clientId, r.duplicate ? SKIPPED : { status: "failed", error: r.reason, retriable: false });
        } catch (e) {
          for (const i of batch) if (this.get(i.key)?.status === "queued") this.fail(i.key, "upload", e);
          break;
        }
      }
    } finally {
      this.presigning = false;
    }
  }

  private async refreshUrl(key: string, photoId: string) {
    const fresh = await withRetry(() => this.api.resign(photoId), this.sleep);
    this.patch(key, { url: fresh.url, contentType: fresh.contentType, urlAt: this.now() });
  }

  private async upload(key: string) {
    const item = this.get(key);
    if (!item?.url || !item.contentType) return;
    const controller = new AbortController();
    this.controllers.set(key, controller);
    this.patch(key, { status: "uploading", progress: 0 });

    for (let attempt = 0; ; attempt++) {
      try {
        const current = this.get(key);
        if (!current || controller.signal.aborted) return;
        if (current.photoId && needsFreshUrl(current.urlAt, this.now())) await this.refreshUrl(key, current.photoId);
        const ready = this.get(key);
        if (!ready?.url || !ready.contentType || controller.signal.aborted) return;
        await this.put(ready.url, ready.file, ready.contentType, (p) => this.patch(key, { progress: p }), controller.signal);
        break;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        const wait = isTransient(e) ? retryDelay(attempt) : null;
        if (wait === null) {
          this.controllers.delete(key);
          this.fail(key, "upload", e);
          void this.pump();
          return;
        }
        // A dropped or refused PUT may be an expired URL in disguise (R2's 403 has no CORS headers): renew it next time.
        this.patch(key, { progress: 0, urlAt: undefined, note: `Conexão instável — nova tentativa em ${Math.round(wait / 1000)} s` });
        await this.sleep(wait);
        if (controller.signal.aborted) return;
        this.patch(key, { note: undefined });
      }
    }

    this.controllers.delete(key);
    this.patch(key, { status: "confirming", progress: 1, note: undefined });
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
      const res = await withRetry(() => this.api.complete(ids), this.sleep);
      for (const id of res.completed) {
        const k = byPhoto.get(id);
        if (k) this.patch(k, { status: "processing" });
        this.processQueue.push(id);
      }
      for (const f of res.failed) {
        const k = byPhoto.get(f.photoId);
        if (k) this.patch(k, { status: "failed", failedAt: "confirm", error: f.reason });
      }
    } catch (e) {
      for (const k of keys) this.fail(k, "confirm", e);
    }
    void this.drainProcessing();
    this.checkIdle();
  }

  private async drainProcessing() {
    while (this.processing < PROCESS_CONCURRENCY && this.processQueue.length > 0) {
      const photoId = this.processQueue.shift()!;
      this.processing++;
      void withRetry(() => this.api.process(photoId), this.sleep)
        .then((r) => {
          const key = this.items.find((i) => i.photoId === photoId)?.key;
          if (!key) return;
          if (r.status === "READY" || r.status === "UPLOADED") this.patch(key, { status: "done" });
          else this.patch(key, { status: "failed", failedAt: "process", error: r.reason ?? "Falha ao processar" });
        })
        .catch((e) => {
          const key = this.items.find((i) => i.photoId === photoId)?.key;
          if (key) this.fail(key, "process", e);
        })
        .finally(() => {
          this.processing--;
          this.hooks.onPhotoReady?.();
          void this.drainProcessing();
          this.checkIdle();
        });
    }
  }

  /** One more pass over what failed, now that the queue is quiet — most of these were a passing hiccup. */
  private sweepFailed(): boolean {
    let any = false;
    for (const item of this.items) {
      if (item.status !== "failed" || (item.sweeps ?? 0) >= MAX_SWEEPS) continue;
      const sweeps = (item.sweeps ?? 0) + 1;
      if (this.requeue(item.key)) {
        this.patch(item.key, { sweeps });
        any = true;
      }
    }
    if (any) this.restart();
    return any;
  }

  private checkIdle() {
    const busy = this.items.some((i) => i.status === "checking" || i.status === "queued" || i.status === "uploading" || i.status === "confirming" || i.status === "processing");
    if (busy || this.processing > 0 || this.processQueue.length > 0 || this.presigning) {
      this.wasBusy = true;
      return;
    }
    if (this.wasBusy && this.sweepFailed()) return;
    if (this.wasBusy) {
      this.wasBusy = false;
      this.hooks.onIdle?.({
        done: this.items.filter((i) => i.status === "done").length,
        failed: this.items.filter((i) => i.status === "failed").length,
        skipped: this.items.filter((i) => i.status === "skipped").length,
      });
    }
  }
}

function message(e: unknown): string {
  if (e instanceof UploadApiError && e.status === 429) return "O servidor pediu uma pausa. Tente de novo em um minuto.";
  return e instanceof Error ? e.message : "Erro inesperado";
}
