import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionCard } from "@/components/admin/collections/collection-card";
import { CollectionStatusBadge } from "@/components/admin/collections/collection-status-badge";
import { SidebarContent } from "@/components/admin/shell/sidebar-content";
import { Logo } from "@/components/brand/logo";
import { Monogram } from "@/components/brand/monogram";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch-field";
import type { CollectionListItem } from "@/types/collection";

export const metadata: Metadata = { title: "Identidade visual", robots: { index: false } };

const PALETTE = [
  ["Near black", "#111111"],
  ["Warm brown", "#A27B5C"],
  ["Soft taupe", "#D9D0C6"],
  ["Off-white", "#F8F7F4"],
  ["White", "#FFFFFF"],
  ["Secondary text", "#77736D"],
  ["Borders", "#E8E5DF"],
] as const;

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

// Static specimens for visual QA only — this route 404s outside development.
const SAMPLE: CollectionListItem[] = [
  { id: "c1", title: "Ana Caroline", slug: "AAAAAAAAAAAA", clientName: "Ana Caroline", category: "BIRTHDAY", status: "PUBLISHED", eventDate: "2026-10-03T00:00:00.000Z", expiresAt: inDays(90), photoCount: 243, favoriteCount: 47, coverUrl: null, coverColor: null, updatedAt: inDays(0) },
  { id: "c2", title: "Ensaio Praia", slug: "BBBBBBBBBBBB", clientName: null, category: "SESSION", status: "DRAFT", eventDate: "2026-09-12T00:00:00.000Z", expiresAt: null, photoCount: 158, favoriteCount: 0, coverUrl: null, coverColor: null, updatedAt: inDays(0) },
  { id: "c3", title: "Evento Empresarial", slug: "CCCCCCCCCCCC", clientName: "Grupo Norte", category: "CORPORATE", status: "PUBLISHED", eventDate: "2026-08-20T00:00:00.000Z", expiresAt: inDays(15), photoCount: 432, favoriteCount: 0, coverUrl: null, coverColor: null, updatedAt: inDays(0) },
  { id: "c4", title: "Aniversário Julia", slug: "DDDDDDDDDDDD", clientName: "Julia", category: "BIRTHDAY", status: "EXPIRED", eventDate: "2026-07-05T00:00:00.000Z", expiresAt: inDays(-3), photoCount: 322, favoriteCount: 12, coverUrl: null, coverColor: null, updatedAt: inDays(0) },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-12 first:border-t-0">
      <h2 className="eyebrow mb-8">{title}</h2>
      {children}
    </section>
  );
}

export default function BrandBoardPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-12 sm:px-10">
      <Section title="Identidade visual">
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="grid place-items-center rounded-[6px] bg-surface py-16 text-foreground">
            <Logo variant="full" size={120} />
          </div>
          <div className="grid place-items-center rounded-[6px] bg-gallery-dark py-16 text-white">
            <Logo variant="full" size={96} />
          </div>
          <div className="grid gap-4">
            <div className="grid flex-1 place-items-center rounded-[6px] bg-surface py-8 text-foreground">
              <Logo variant="stacked" size={64} />
            </div>
            <div className="grid flex-1 place-items-center rounded-[6px] bg-surface py-8 text-foreground">
              <Logo variant="horizontal" size={40} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-6 rounded-[6px] bg-surface p-6">
          {[64, 32, 24, 16].map((s) => (
            <span key={s} className="flex text-foreground" style={{ height: s }}>
              <Monogram className="h-full" title={`${s}px`} />
            </span>
          ))}
          {[48, 32, 16].map((s) => (
            <span key={`f${s}`} className="grid place-items-center rounded-[4px] bg-gallery-dark text-background" style={{ width: s, height: s }}>
              <Monogram className="h-[72%]" />
            </span>
          ))}
          <span className="text-[12px] text-muted-foreground">Favicon / tamanhos mínimos</span>
        </div>
      </Section>

      <Section title="Paleta de cores">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {PALETTE.map(([name, hex]) => (
            <li key={hex}>
              <div className="aspect-square rounded-[6px] border border-border" style={{ background: hex }} />
              <p className="mt-2 text-[12px] font-medium">{name}</p>
              <p className="text-[12px] uppercase tabular-nums text-muted-foreground">{hex}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografia">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="font-serif text-8xl leading-none">Aa</p>
            <p className="mt-3 font-serif text-2xl">Cormorant Garamond</p>
            <p className="text-[13px] text-muted-foreground">Logo, títulos, nomes de clientes e galerias</p>
          </div>
          <div>
            <p className="font-sans text-8xl font-light leading-none">Aa</p>
            <p className="mt-3 text-2xl">Inter</p>
            <p className="text-[13px] text-muted-foreground">Interface, botões, filtros, datas e metadados</p>
          </div>
        </div>
      </Section>

      <Section title="Componentes">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Nova coleção</Button>
          <Button variant="outline">Cancelar</Button>
          <Button variant="ghost">Compartilhar</Button>
          <span className="rounded-[6px] bg-gallery-dark p-3">
            <Button variant="hero" className="caps text-[11px]">
              Ver galeria
            </Button>
          </span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <CollectionStatusBadge status="PUBLISHED" expiresAt={inDays(90)} />
          <CollectionStatusBadge status="DRAFT" />
          <CollectionStatusBadge status="PUBLISHED" expiresAt={inDays(15)} />
          <CollectionStatusBadge status="EXPIRED" />
          <CollectionStatusBadge status="ARCHIVED" />
        </div>
        <div className="mt-8 grid max-w-2xl gap-8 rounded-[8px] border border-border bg-surface p-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="demo-name">Nome da coleção</Label>
            <Input id="demo-name" placeholder="Ex: Ana Caroline" />
          </div>
          <div>
            <SwitchField id="demo-a" label="Permitir favoritos" defaultChecked />
            <SwitchField id="demo-b" label="Download individual" defaultChecked />
            <SwitchField id="demo-c" label="Exigir senha" />
          </div>
        </div>
      </Section>

      <Section title="Painel — coleções">
        <div className="flex overflow-hidden rounded-[8px] border border-border">
          <div className="hidden h-[560px] w-60 shrink-0 border-r border-border bg-surface md:block">
            <SidebarContent
              user={{ name: "Carlos Bentes", email: "studio@bentclick.test", title: "Fotógrafo" }}
              storage={{ usedBytes: 24.8 * 1024 ** 3, quotaBytes: 100 * 1024 ** 3 }}
            />
          </div>
          <ul className="grid flex-1 grid-cols-1 gap-5 bg-background p-6 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {SAMPLE.map((c) => (
              <li key={c.id}>
                <CollectionCard collection={c} />
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </main>
  );
}
