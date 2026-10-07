import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/** Split layout shared by the login, forgot-password and reset-password screens. */
export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col items-center justify-center bg-gallery-dark p-12 text-white lg:flex">
        <Logo variant="full" size={112} />
        <p className="absolute bottom-10 text-[11px] uppercase tracking-[0.3em] text-white/40">Área do fotógrafo</p>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-12 inline-block text-foreground lg:hidden" aria-label="BentClick — início">
            <Logo variant="horizontal" size={32} />
          </Link>
          <h1 className="font-serif text-[40px] font-medium leading-none tracking-tight">{title}</h1>
          <p className="mt-3 text-[13px] text-muted-foreground">{description}</p>
          <div className="mt-10">{children}</div>
        </div>
      </section>
    </main>
  );
}
