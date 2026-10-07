"use client";

import { ArrowDown, ArrowUp, Check, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSiteContentAction } from "@/actions/site.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch-field";
import { cn } from "@/lib/utils/cn";
import { HOME_SECTION_LABELS, type SiteContent } from "@/lib/validation/site-content";
import type { PickableImage } from "@/types/site";
import { EditorSection, TextField } from "./fields";
import { ImagePicker } from "./image-picker";
import { PortraitField } from "./portrait-field";

const ACCENTS = ["#A27B5C", "#8C6A54", "#6F7A5E", "#5E6B7A", "#9A5B4F", "#111111"];

type Props = { initial: SiteContent; initialAccent: string; images: PickableImage[]; portraitUrl: string | null };

/** Every public text, photo, colour and section — one document, saved together. */
export function SiteEditor({ initial, initialAccent, images, portraitUrl }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [accent, setAccent] = useState(initialAccent);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof SiteContent>(section: K, patch: Partial<SiteContent[K]>) {
    setContent((c) => ({ ...c, [section]: { ...c[section], ...patch } }));
    setDirty(true);
  }

  function moveSection(index: number, delta: number) {
    const list = [...content.home.sections];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target]!, list[index]!];
    update("home", { sections: list });
  }

  function save() {
    startTransition(async () => {
      const r = await saveSiteContentAction({ content, accent });
      if (!r.ok) return void toast.error(r.error);
      setDirty(false);
      toast.success("Site atualizado", { description: "As mudanças já estão no ar." });
      router.refresh();
    });
  }

  const { hero, works, about, contact, clientArea, footer, home } = content;

  return (
    <div className="grid gap-6">
      <EditorSection id="aparencia" title="Aparência" description="A cor de destaque dos botões e detalhes, no site e nas galerias.">
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setAccent(c);
                setDirty(true);
              }}
              aria-label={`Usar ${c}`}
              aria-pressed={accent.toLowerCase() === c.toLowerCase()}
              className="grid size-9 place-items-center rounded-full ring-offset-2 aria-pressed:ring-1 aria-pressed:ring-foreground"
              style={{ background: c }}
            >
              {accent.toLowerCase() === c.toLowerCase() ? <Check className="size-4 text-white" /> : null}
            </button>
          ))}
          <label className="relative grid size-9 cursor-pointer place-items-center rounded-full border border-dashed border-taupe text-[11px] text-muted-foreground" title="Cor personalizada">
            +
            <input
              type="color"
              value={accent}
              onChange={(e) => {
                setAccent(e.target.value.toUpperCase());
                setDirty(true);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Cor personalizada"
            />
          </label>
          <code className="ml-2 text-[12px] text-muted-foreground">{accent}</code>
        </div>
      </EditorSection>

      <EditorSection id="abertura" title="Abertura" description="A primeira tela do site: fotos, título e botões.">
        <TextField id="hero-title" label="Título" multiline rows={3} value={hero.title} onChange={(v) => update("hero", { title: v })} hint="Cada linha vira uma linha do título." />
        <TextField id="hero-subtitle" label="Texto de apoio" multiline rows={2} value={hero.subtitle} onChange={(v) => update("hero", { subtitle: v })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="hero-primary" label="Botão principal" value={hero.primaryLabel} onChange={(v) => update("hero", { primaryLabel: v })} />
          <TextField id="hero-secondary" label="Botão secundário (celular)" value={hero.secondaryLabel} onChange={(v) => update("hero", { secondaryLabel: v })} />
        </div>
        <SwitchField id="hero-show-secondary" label="Mostrar botão “Área do cliente” na abertura" checked={hero.showSecondary} onChange={(e) => update("hero", { showSecondary: e.target.checked })} />
        <div className="grid gap-2">
          <Label htmlFor="hero-overlay">Escurecimento sobre a foto · {Math.round(hero.overlay * 100)}%</Label>
          <input id="hero-overlay" type="range" min={0} max={0.8} step={0.05} value={hero.overlay} onChange={(e) => update("hero", { overlay: Number(e.target.value) })} className="accent-[var(--accent)]" />
        </div>
        <div className="grid gap-2">
          <Label>Fotos da abertura</Label>
          <ImagePicker images={images} selected={hero.imageIds} max={5} onChange={(ids) => update("hero", { imageIds: ids })} />
        </div>
      </EditorSection>

      <EditorSection id="secoes" title="Seções da página inicial" description="Mostre, oculte e reordene o que aparece depois da abertura.">
        <ol className="grid gap-2">
          {home.sections.map((s, i) => (
            <li key={s.type} className={cn("flex items-center gap-3 rounded-[6px] border border-border px-3 py-2", !s.visible && "bg-background/60")}>
              <span className="w-5 text-center text-[12px] tabular-nums text-muted-foreground">{i + 1}</span>
              <span className={cn("flex-1 text-[13px]", !s.visible && "text-muted-foreground")}>{HOME_SECTION_LABELS[s.type]}</span>
              <Button variant="ghost" size="icon-sm" aria-label="Subir" disabled={i === 0} onClick={() => moveSection(i, -1)}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Descer" disabled={i === home.sections.length - 1} onClick={() => moveSection(i, 1)}>
                <ArrowDown />
              </Button>
              <SwitchField
                id={`sec-${s.type}`}
                label={s.visible ? "Visível" : "Oculta"}
                checked={s.visible}
                onChange={(e) => update("home", { sections: home.sections.map((x) => (x.type === s.type ? { ...x, visible: e.target.checked } : x)) })}
                className="py-0"
              />
            </li>
          ))}
        </ol>
      </EditorSection>

      <EditorSection id="trabalhos" title="Trabalhos" description="Seção com fotos dos álbuns publicados do portfólio.">
        <TextField id="works-eyebrow" label="Rótulo" value={works.eyebrow} onChange={(v) => update("works", { eyebrow: v })} />
        <TextField id="works-heading" label="Título" value={works.heading} onChange={(v) => update("works", { heading: v })} />
        <TextField id="works-line" label="Linha de apoio" value={works.line} onChange={(v) => update("works", { line: v })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="works-button" label="Texto do botão" value={works.buttonLabel} onChange={(v) => update("works", { buttonLabel: v })} />
          <div className="grid gap-2">
            <Label htmlFor="works-count">Quantidade de fotos · {works.count}</Label>
            <input id="works-count" type="range" min={4} max={24} step={1} value={works.count} onChange={(e) => update("works", { count: Number(e.target.value) })} className="accent-[var(--accent)]" />
          </div>
        </div>
      </EditorSection>

      <EditorSection id="sobre" title="Sobre" description="Página Sobre e o resumo na página inicial.">
        <PortraitField url={portraitUrl} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="about-eyebrow" label="Rótulo" value={about.eyebrow} onChange={(v) => update("about", { eyebrow: v })} />
          <TextField id="about-title" label="Título" value={about.title} placeholder="Seu nome" onChange={(v) => update("about", { title: v })} />
        </div>
        <TextField id="about-tagline" label="Frase de destaque" value={about.tagline} onChange={(v) => update("about", { tagline: v })} />
        <TextField id="about-text" label="Texto" multiline rows={8} value={about.text} onChange={(v) => update("about", { text: v })} hint="Deixe uma linha em branco entre parágrafos." />
        <TextField id="about-button" label="Texto do botão" value={about.buttonLabel} onChange={(v) => update("about", { buttonLabel: v })} />
      </EditorSection>

      <EditorSection id="contato" title="Contato" description="Página Contato e a chamada na página inicial.">
        <TextField id="contact-heading" label="Título" value={contact.heading} onChange={(v) => update("contact", { heading: v })} />
        <TextField id="contact-text" label="Texto" multiline value={contact.text} onChange={(v) => update("contact", { text: v })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="contact-email" label="E-mail" value={contact.email} onChange={(v) => update("contact", { email: v })} />
          <TextField id="contact-whatsapp" label="WhatsApp" value={contact.whatsapp} placeholder="+55 11 99999-9999" onChange={(v) => update("contact", { whatsapp: v })} />
          <TextField id="contact-instagram" label="Instagram" value={contact.instagram} placeholder="@bentclick" onChange={(v) => update("contact", { instagram: v })} />
          <TextField
            id="contact-website"
            label="Site"
            value={contact.website}
            placeholder="https://"
            hint={contact.website && !/^https?:\/\/\S+$/i.test(contact.website) ? "Use o endereço completo, começando com https://" : undefined}
            onChange={(v) => update("contact", { website: v })}
          />
        </div>
        <SwitchField
          id="contact-show-form"
          label="Mostrar formulário de mensagem"
          description="As mensagens chegam em Contatos, no painel, e no seu e-mail."
          checked={contact.showForm}
          onChange={(e) => update("contact", { showForm: e.target.checked })}
        />
        {contact.showForm ? (
          <>
            <TextField id="contact-form-heading" label="Título do formulário" value={contact.formHeading} onChange={(v) => update("contact", { formHeading: v })} />
            <TextField id="contact-form-text" label="Texto do formulário (opcional)" multiline rows={2} value={contact.formText} onChange={(v) => update("contact", { formText: v })} />
            <TextField id="contact-form-button" label="Texto do botão" value={contact.formButton} onChange={(v) => update("contact", { formButton: v })} />
            <TextField id="contact-success-title" label="Título após enviar" value={contact.successTitle} onChange={(v) => update("contact", { successTitle: v })} />
            <TextField id="contact-success-text" label="Texto após enviar" multiline rows={2} value={contact.successText} onChange={(v) => update("contact", { successText: v })} />
          </>
        ) : null}
      </EditorSection>

      <EditorSection id="area-do-cliente" title="Área do cliente" description="Página onde o cliente cola o link ou código da galeria.">
        <TextField id="client-heading" label="Título" value={clientArea.heading} onChange={(v) => update("clientArea", { heading: v })} />
        <TextField id="client-text" label="Texto" multiline value={clientArea.text} onChange={(v) => update("clientArea", { text: v })} />
      </EditorSection>

      <EditorSection id="rodape" title="Rodapé" description="Frase opcional abaixo do logo, em todas as páginas.">
        <TextField id="footer-line" label="Frase" value={footer.line} onChange={(v) => update("footer", { line: v })} />
      </EditorSection>

      <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 xl:-mx-10 xl:px-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-muted-foreground">{dirty ? "Alterações não salvas" : "Tudo salvo"}</p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink /> Ver site
              </a>
            </Button>
            <Button size="sm" onClick={save} disabled={pending || !dirty}>
              {pending ? <Loader2 className="animate-spin" /> : null} Salvar alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
