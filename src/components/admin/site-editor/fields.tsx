"use client";

import { Input, Label, Textarea } from "@/components/ui/field";

/** Labelled text input / textarea bound to a value — the editor's building block. */
export function TextField({
  id,
  label,
  value,
  onChange,
  multiline,
  rows = 3,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint ? <p className="text-[12px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** One editor section with an anchor, so "Editar site" on a public page lands on it. */
export function EditorSection({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[8px] border border-border bg-surface target:ring-2 target:ring-accent/40">
      <div className="grid gap-6 p-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        <div>
          <h2 className="font-serif text-[22px] font-medium leading-tight">{title}</h2>
          {description ? <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">{description}</p> : null}
        </div>
        <div className="grid max-w-xl content-start gap-5">{children}</div>
      </div>
    </section>
  );
}
