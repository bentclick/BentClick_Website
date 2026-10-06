"use client";

import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { unlockGalleryAction } from "@/actions/public-gallery.actions";

export function AccessForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return setError("Digite a senha enviada pelo fotógrafo.");
    startTransition(async () => {
      const result = await unlockGalleryAction({ slug, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(`/g/${slug}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="mt-10 grid w-full max-w-xs gap-3">
      <label htmlFor="gallery-password" className="sr-only">
        Senha da galeria
      </label>
      <div className="relative">
        <Lock aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/60" />
        <input
          id="gallery-password"
          type="password"
          autoComplete="off"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(undefined);
          }}
          placeholder="Senha ou PIN"
          aria-invalid={!!error}
          className="h-12 w-full rounded-[4px] border border-white/40 bg-white/10 pl-10 pr-4 text-center text-[15px] tracking-[0.2em] text-white placeholder:tracking-normal placeholder:text-white/50 backdrop-blur-sm focus-visible:border-white focus-visible:outline-none"
        />
      </div>
      {error ? (
        <p role="alert" className="text-center text-[12.5px] text-white">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="caps inline-flex h-12 items-center justify-center gap-2 rounded-[4px] border border-white/80 text-[11px] tracking-[0.24em] text-white transition-colors hover:bg-white hover:text-foreground disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} Entrar
      </button>
    </form>
  );
}
