"use client";

import { useState } from "react";
import { updateProfileAction } from "@/actions/settings.actions";
import { SettingsCard, useSave } from "@/components/admin/collection-settings/settings-card";
import { FieldError, Input, Label } from "@/components/ui/field";
import type { ProfileInput } from "@/lib/validation/settings";

export function ProfileCard({ initial, email }: { initial: ProfileInput; email: string }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const { pending, save } = useSave();
  const field = (key: keyof ProfileInput, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="grid gap-2">
      <Label htmlFor={`pf-${key}`}>{label}</Label>
      <Input id={`pf-${key}`} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} aria-invalid={!!errors[key]} {...props} />
      <FieldError message={errors[key]?.[0]} />
    </div>
  );

  return (
    <SettingsCard
      id="perfil"
      title="Perfil e marca"
      description="Seu nome no painel, o nome do estúdio nas galerias e os contatos de resposta."
      pending={pending}
      onSave={() => save(() => updateProfileAction(form), "Perfil atualizado", () => setErrors({}), setErrors)}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {field("name", "Seu nome")}
        {field("professionalTitle", "Título", { placeholder: "Fotógrafo" })}
      </div>
      {field("brandName", "Nome do estúdio", { placeholder: "BentClick Fotografia" })}
      {field("tagline", "Frase do estúdio")}
      <div className="grid gap-5 sm:grid-cols-2">
        {field("websiteUrl", "Site", { placeholder: "https://bentclick.com.br" })}
        {field("instagram", "Instagram", { placeholder: "@bentclick" })}
      </div>
      {field("replyToEmail", "E-mail para respostas", { placeholder: email, type: "email" })}
      <p className="text-[12px] text-muted-foreground">
        E-mail de acesso: <span className="text-foreground">{email}</span>
      </p>
    </SettingsCard>
  );
}
