import { Monogram } from "@/components/brand/monogram";

/** Quiet full-screen notice for expired / unavailable galleries — no photo URLs are ever issued here. */
export function GalleryNotice({ title, message, studio }: { title: string; message: string; studio?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <Monogram className="h-16 text-taupe" />
      <h1 className="mt-10 max-w-lg font-serif text-4xl font-normal leading-tight sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted-foreground">{message}</p>
      {studio ? <p className="mt-12 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{studio}</p> : null}
    </main>
  );
}
