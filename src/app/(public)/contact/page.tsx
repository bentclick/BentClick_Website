import { AtSign, Globe, Mail } from "lucide-react";
import type { Metadata } from "next";
import { getSiteProfile } from "@/services/site/site.service";

export const metadata: Metadata = { title: "Contato" };
export const revalidate = 600;

export default async function ContactPage() {
  const profile = await getSiteProfile();
  const channels = [
    profile?.email ? { icon: Mail, label: "E-mail", value: profile.email, href: `mailto:${profile.email}` } : null,
    profile?.instagram
      ? {
          icon: AtSign,
          label: "Instagram",
          value: `@${profile.instagram.replace(/^@/, "")}`,
          href: `https://instagram.com/${profile.instagram.replace(/^@/, "")}`,
        }
      : null,
    profile?.websiteUrl ? { icon: Globe, label: "Site", value: profile.websiteUrl.replace(/^https?:\/\//, ""), href: profile.websiteUrl } : null,
  ].filter((c) => c !== null);

  return (
    <main className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
      <p className="eyebrow">Contato</p>
      <h1 className="mt-5 font-serif text-5xl font-normal leading-[1.05] sm:text-6xl">Vamos contar a sua história.</h1>
      <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Conte um pouco sobre a data, o lugar e o que você imagina. Respondo pessoalmente.
      </p>

      {channels.length > 0 ? (
        <ul className="mx-auto mt-14 grid max-w-md gap-px overflow-hidden rounded-[6px] border border-border bg-border text-left">
          {channels.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="flex items-center gap-4 bg-surface px-5 py-4 transition-colors hover:bg-subtle"
              >
                <Icon strokeWidth={1.4} className="size-5 text-accent" />
                <span>
                  <span className="eyebrow block">{label}</span>
                  <span className="text-[15px]">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-14 font-serif text-xl italic text-muted-foreground">Canais de contato em breve.</p>
      )}
    </main>
  );
}
