import { post, putFile, UploadApiError } from "./upload-api";

/** Browser side of an edited version: reserve, PUT straight to storage, confirm. */
export async function uploadEditedVersion(photoId: string, file: File): Promise<void> {
  const { url, contentType } = await post<{ url: string; contentType: string }>(`/api/photos/${photoId}/edit`, { name: file.name, type: file.type, size: file.size });
  await putFile(url, file, contentType, () => undefined, new AbortController().signal);
  await post(`/api/photos/${photoId}/edit/complete`, {});
}

export async function revertEditedVersion(photoId: string): Promise<void> {
  const res = await fetch(`/api/photos/${photoId}/edit`, { method: "DELETE" });
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new UploadApiError(data.error ?? "Falha na comunicação com o servidor", res.status);
}
