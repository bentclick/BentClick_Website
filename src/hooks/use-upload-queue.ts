"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { UploadAdapter } from "@/lib/uploads/upload-api";
import { UploadQueue } from "@/lib/uploads/upload-queue";

const REFRESH_THROTTLE_MS = 2500;

type Refresh = () => void;

/** Refreshes at most once per window so thumbnails appear progressively without hammering the server. */
function throttled(refresh: Refresh): Refresh {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      last = Date.now();
      refresh();
    }, Math.max(0, last + REFRESH_THROTTLE_MS - Date.now()));
  };
}

/**
 * One queue per destination; keeps running while the upload panel is closed.
 * `adapter` must be memoised by the caller.
 */
export function useUploadQueue(adapter: UploadAdapter) {
  const router = useRouter();

  const [queue] = useState(() => {
    const refreshSoon = throttled(() => router.refresh());
    return new UploadQueue(adapter, {
      onPhotoReady: refreshSoon,
      onIdle: ({ done, failed }) => {
        router.refresh();
        if (done > 0) toast.success("Envio concluído", { description: `${done} ${done === 1 ? "foto enviada" : "fotos enviadas"}` });
        if (failed > 0) {
          toast.error(`${failed} ${failed === 1 ? "arquivo não foi enviado" : "arquivos não foram enviados"}`, {
            description: "Tente novamente pelo painel de envio.",
          });
        }
      },
    });
  });

  useEffect(() => queue.setAdapter(adapter), [queue, adapter]);

  const items = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  return { queue, items };
}
