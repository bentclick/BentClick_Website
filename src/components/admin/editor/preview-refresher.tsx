"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/misc";

/**
 * Re-renders previews after a watermark change, a slice per request, until
 * none are left. Starts on its own; photos stay visible meanwhile.
 */
export function PreviewRefresher({ collectionId, outdated }: { collectionId: string; outdated: number }) {
  const router = useRouter();
  const [total] = useState(outdated);
  const [remaining, setRemaining] = useState(outdated);
  const [error, setError] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    if (outdated === 0 || running.current) return;
    running.current = true;
    let cancelled = false;
    (async () => {
      let left = outdated;
      while (!cancelled && left > 0) {
        const res = await fetch(`/api/collections/${collectionId}/previews/refresh`, { method: "POST" }).catch(() => null);
        if (!res?.ok) {
          setError(true);
          break;
        }
        const data = (await res.json()) as { remaining: number; refreshed: number };
        left = data.remaining;
        setRemaining(left);
        if (data.refreshed === 0 && left > 0) {
          setError(true);
          break;
        }
      }
      running.current = false;
      if (!cancelled && left === 0) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionId, outdated, router]);

  if (outdated === 0 && remaining === 0) return null;
  const done = total - remaining;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-accent/30 bg-accent-soft px-4 py-3 text-[13px]">
      {error ? <RefreshCw className="size-4 text-accent" /> : remaining > 0 ? <Loader2 className="size-4 animate-spin text-accent" /> : null}
      <span className="flex-1">
        {error ? "A atualização das prévias foi interrompida." : remaining > 0 ? `Aplicando a marca d’água nas prévias… ${done} de ${total}` : "Prévias atualizadas."}
      </span>
      {error ? (
        <button type="button" onClick={() => router.refresh()} className="font-medium text-accent-hover underline-offset-4 hover:underline">
          Continuar
        </button>
      ) : (
        <Progress value={total ? done / total : 1} label="Prévias atualizadas" className="max-w-40" />
      )}
    </div>
  );
}
