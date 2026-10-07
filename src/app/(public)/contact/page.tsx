import { AtSign, Globe, Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";
import { getSite } from "@/services/site/site.service";

export const metadata: Metadata = { title: "Contato" };
export const revalidate = 600;

export default async function ContactPage() {
  const { profile, content } = await getSite();
  const { contact } = content;
  const instagram = profile?.instagram?.replace(/^@/, "");
  const whatsapp = contact.whatsapp.replace(/\D/g, "");

  const channels = [
    profile?.email ? { icon: Mail, label: "E-mail", value: profile.email, href: `mailto:${profile.email}` } : null,
    whatsapp ? { icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp, href: `https://wa.me/${whatsapp}` } : null,
    instagram ? { icon: AtSign, label: "Instagram", value: `@${instagram}`, href: `https://instagram.com/${instagram}` } : null,
    profile?.websiteUrl && /^https?:\/\//i.test(profile.websiteUrl) ? { icon: Globe, label: "Site", value: profile.websiteUrl.replace(/^https?:\/\//, ""), href: profile.websiteUrl } : null,
  ].filter((c) => c !== null);

  return (
    <main id="contato" className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
      {contact.eyebrow ? <p className="eyebrow">{contact.eyebrow}</p> : null}
      <h1 className="mt-5 font-serif text-5xl font-normal leading-[1.05] sm:text-6xl">{contact.heading}</h1>
      {contact.text ? <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">{contact.text}</p> : null}

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
      ) : contact.showForm ? null : (
        <p className="mt-14 font-serif text-xl italic text-muted-foreground">Canais de contato em breve.</p>
      )}

      {contact.showForm ? (
        <div className="relative mt-14">
          <ContactForm texts={contact} />
        </div>
      ) : null}
    </main>
  );
}
