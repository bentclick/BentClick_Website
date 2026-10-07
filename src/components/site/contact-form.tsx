"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { submitLeadAction } from "@/actions/lead.actions";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { CATEGORY_OPTIONS } from "@/lib/constants/collection";
import type { LeadFormValues } from "@/lib/validation/lead";
import type { SiteContent } from "@/lib/validation/site-content";

const EMPTY: Required<LeadFormValues> = { name: "", email: "", phone: "", eventType: "", eventDate: "", message: "", website: "" };

/** Public contact form; every message lands in the photographer's dashboard as a lead. */
export function ContactForm({ texts }: { texts: SiteContent["contact"] }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<LeadFormValues>) => setValues((v) => ({ ...v, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitLeadAction(values);
      if (!result.ok) {
        const f = result.fieldErrors ?? {};
        setErrors({ name: f.name?.[0], email: f.email?.[0], phone: f.phone?.[0], eventDate: f.eventDate?.[0], message: f.message?.[0], form: result.fieldErrors ? undefined : result.error });
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-[6px] border border-border bg-surface px-6 py-12 text-center">
        <CheckCircle2 strokeWidth={1.4} className="size-8 text-accent" />
        <p className="font-serif text-2xl">{texts.successTitle}</p>
        <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">{texts.successText}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-[6px] border border-border bg-surface p-6 text-left sm:p-8">
      <div>
        <h2 className="font-serif text-3xl font-normal">{texts.formHeading}</h2>
        {texts.formText ? <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{texts.formText}</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lead-name">Nome</Label>
          <Input id="lead-name" autoComplete="name" value={values.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} />
          <FieldError message={errors.name} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-email">E-mail</Label>
          <Input id="lead-email" type="email" autoComplete="email" value={values.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={!!errors.email} />
          <FieldError message={errors.email} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-phone">WhatsApp / telefone (opcional)</Label>
          <Input id="lead-phone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => set({ phone: e.target.value })} aria-invalid={!!errors.phone} />
          <FieldError message={errors.phone} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-type">Tipo de trabalho (opcional)</Label>
          <Select id="lead-type" value={values.eventType} onChange={(e) => set({ eventType: e.target.value as LeadFormValues["eventType"] })}>
            <option value="">Selecione</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2 sm:col-span-2 sm:max-w-[calc(50%-10px)]">
          <Label htmlFor="lead-date">Data do evento (opcional)</Label>
          <Input id="lead-date" type="date" value={values.eventDate} onChange={(e) => set({ eventDate: e.target.value })} aria-invalid={!!errors.eventDate} />
          <FieldError message={errors.eventDate} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="lead-message">Mensagem</Label>
        <Textarea id="lead-message" rows={5} value={values.message} onChange={(e) => set({ message: e.target.value })} aria-invalid={!!errors.message} />
        <FieldError message={errors.message} />
      </div>

      {/* Honeypot: hidden from people and screen readers; bots fill it and are silently ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-website">Site</label>
        <input id="lead-website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set({ website: e.target.value })} />
      </div>

      <FieldError message={errors.form} />
      <button
        type="submit"
        disabled={pending}
        className="caps inline-flex h-12 items-center justify-center gap-2 justify-self-start rounded-[4px] bg-accent px-7 text-[11px] tracking-[0.18em] text-white transition-colors duration-200 hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {texts.formButton}
      </button>
    </form>
  );
}
