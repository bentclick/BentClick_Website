import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { SiteProfile } from "@/types/site";

export function SiteFooter({ profile, line }: { profile: SiteProfile | null; line?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-8 px-5 py-16 text-center sm:px-10">
        <Logo variant="full" size={64} className="text-foreground" />
        {line ? <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{line}</p> : null}
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[12px] text-muted-foreground">
          {profile?.instagram ? (
            <li>
              <a
                href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                Instagram
              </a>
            </li>
          ) : null}
          {profile?.email ? (
            <li>
              <a href={`mailto:${profile.email}`} className="hover:text-foreground">
                {profile.email}
              </a>
            </li>
          ) : null}
          <li>
            <Link href="/cliente" className="hover:text-foreground">
              Área do cliente
            </Link>
          </li>
        </ul>
        <p className="text-[11px] text-muted-foreground/80">
          © {year} BentClick Fotografia ·{" "}
          <Link href="/login" className="hover:text-foreground">
            Acesso do fotógrafo
          </Link>
        </p>
      </div>
    </footer>
  );
}
