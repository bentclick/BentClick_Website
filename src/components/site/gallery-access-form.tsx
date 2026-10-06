"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldError } from "@/components/ui/field";
import { parseGalleryCode } from "@/lib/validation/gallery-code";

/** Navigation helper only — the gallery itself enforces access server-side. */
export function GalleryAccessForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = parseGalleryCode(value);
    if (!code) {
      setError("Cole o link completo da galeria ou o código de 12 caracteres.");
      return;
    }
    router.push(`/g/${code}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto mt-12 grid max-w-md gap-2 text-left">
      <label htmlFor="gallery-code" className="eyebrow">
        Link ou código da galeria
      </label>
      <div className="flex">
        <input
          id="gallery-code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
          placeholder="https://…/g/XXXXXXXXXXXX"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          className="h-12 min-w-0 flex-1 rounded-l-[4px] border border-r-0 border-taupe bg-surface px-4 text-[14px] focus-visible:border-accent focus-visible:outline-none aria-invalid:border-danger"
        />
        <button
          type="submit"
          aria-label="Acessar galeria"
          className="grid h-12 w-14 place-items-center rounded-r-[4px] bg-accent text-white transition-colors hover:bg-accent-hover"
        >
          <ArrowRight strokeWidth={1.5} className="size-5" />
        </button>
      </div>
      <FieldError message={error} />
    </form>
  );
}
