import Link from "next/link";
import type { SiteContent } from "@/lib/validation/site-content";
import type { PublicImage } from "@/types/site";
import { PhotoMasonry } from "./photo-masonry";

const outlineLink =
  "caps inline-flex h-12 items-center rounded-[4px] border border-taupe px-8 text-[11px] tracking-[0.18em] transition-colors duration-200 hover:border-foreground";

export function HomeWorks({ works, images }: { works: SiteContent["works"]; images: PublicImage[] }) {
  return (
    <section id="trabalhos" className="mx-auto max-w-[1600px] scroll-mt-20 px-5 py-24 sm:px-10 sm:py-32">
      <div className="mx-auto max-w-2xl text-center">
        {works.eyebrow ? <p className="eyebrow">{works.eyebrow}</p> : null}
        <h2 className="mt-5 font-serif text-4xl font-normal leading-tight sm:text-5xl">{works.heading}</h2>
        {works.line ? <p className="mx-auto mt-6 max-w-lg text-[14px] leading-relaxed text-muted-foreground">{works.line}</p> : null}
      </div>
      {images.length > 0 ? (
        <>
          <PhotoMasonry images={images} className="mt-16" />
          <div className="mt-14 text-center">
            <Link href="/portfolio" className={outlineLink}>
              {works.buttonLabel}
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-16 text-center font-serif text-2xl italic text-muted-foreground">Portfólio em breve.</p>
      )}
    </section>
  );
}

export function HomeAbout({ about, fallbackTitle }: { about: SiteContent["about"]; fallbackTitle: string }) {
  const firstParagraph = about.text.split(/\n{2,}/)[0];
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1100px] gap-8 px-5 py-24 sm:px-10 md:grid-cols-[1fr_1.4fr] md:items-center">
        <div>
          {about.eyebrow ? <p className="eyebrow">{about.eyebrow}</p> : null}
          <h2 className="mt-4 font-serif text-4xl font-normal leading-tight">{about.title || fallbackTitle}</h2>
          {about.tagline ? <p className="mt-3 font-serif text-lg italic text-muted-foreground">{about.tagline}</p> : null}
        </div>
        <div>
          <p className="text-[15px] leading-relaxed text-foreground/80">{firstParagraph}</p>
          <Link href="/about" className={`${outlineLink} mt-8`}>
            Conhecer mais
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomeContact({ contact }: { contact: SiteContent["contact"] }) {
  return (
    <section className="bg-gallery-dark text-white">
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        {contact.eyebrow ? <p className="eyebrow !text-white/50">{contact.eyebrow}</p> : null}
        <h2 className="mt-5 font-serif text-4xl font-normal leading-tight sm:text-5xl">{contact.heading}</h2>
        {contact.text ? <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/70">{contact.text}</p> : null}
        <Link
          href="/contact"
          className="caps mt-10 inline-flex h-12 items-center rounded-[4px] bg-accent px-8 text-[11px] tracking-[0.18em] text-white transition-colors hover:bg-accent-hover"
        >
          Entrar em contato
        </Link>
      </div>
    </section>
  );
}
