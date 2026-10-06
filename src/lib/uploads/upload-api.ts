import type { CompleteResponse, PresignRequest, PresignResponse } from "@/lib/validation/upload";

/** Browser-side calls to the upload routes. Errors carry the server's user-facing message. */
export class UploadApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new UploadApiError(data.error ?? "Falha na comunicação com o servidor", res.status);
  return data;
}

type FileSpec = PresignRequest["files"][number];

/** What the upload queue needs from a destination (collection gallery, portfolio album, …). */
export type UploadAdapter = {
  presign: (files: FileSpec[]) => Promise<PresignResponse>;
  resign: (id: string) => Promise<{ url: string; contentType: string }>;
  complete: (ids: string[]) => Promise<CompleteResponse>;
  process: (id: string) => Promise<{ status: string; reason?: string }>;
};

export function collectionUploadAdapter(target: { collectionId: string; galleryId: string }): UploadAdapter {
  return {
    presign: (files) => post<PresignResponse>("/api/uploads/presign", { ...target, files }),
    resign: (photoId) => post("/api/uploads/resign", { photoId }),
    complete: (photoIds) => post<CompleteResponse>("/api/uploads/complete", { photoIds }),
    process: (photoId) => post(`/api/photos/${photoId}/process`, {}),
  };
}

export function portfolioUploadAdapter(albumId: string): UploadAdapter {
  return {
    presign: (files) => post<PresignResponse>("/api/portfolio/uploads/presign", { albumId, files }),
    resign: (imageId) => post("/api/portfolio/uploads/resign", { imageId }),
    complete: (imageIds) => post<CompleteResponse>("/api/portfolio/uploads/complete", { imageIds }),
    process: (imageId) => post(`/api/portfolio/images/${imageId}/process`, {}),
  };
}

/** PUT straight to object storage with progress. Bytes never touch the app server. */
export function putFile(url: string, file: File, contentType: string, onProgress: (ratio: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new UploadApiError(`Armazenamento recusou o envio (${xhr.status})`, xhr.status)));
    xhr.onerror = () => reject(new UploadApiError("Falha de rede durante o envio", 0));
    xhr.onabort = () => reject(new DOMException("Cancelado", "AbortError"));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
