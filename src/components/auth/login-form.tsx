"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { type SignUpInput, signInFormSchema, signUpSchema } from "@/lib/validation/auth";

type Mode = "sign-in" | "sign-up";

export function LoginForm({ nextPath, allowSignup }: { nextPath: string; allowSignup: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SignUpInput>({
    // Both schemas share one shape; sign-in simply doesn't validate the name.
    resolver: zodResolver(mode === "sign-up" ? signUpSchema : signInFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name: values.name, email: values.email, password: values.password })
        : await authClient.signIn.email({ email: values.email, password: values.password });

    if (result.error) {
      setServerError(
        result.error.status === 429
          ? "Muitas tentativas. Aguarde um minuto e tente novamente."
          : mode === "sign-in"
            ? "E-mail ou senha incorretos."
            : (result.error.message ?? "Não foi possível criar a conta."),
      );
      return;
    }
    router.replace(nextPath);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {mode === "sign-up" ? (
        <div className="grid gap-2">
          <Label htmlFor="name">Nome do estúdio</Label>
          <Input id="name" autoComplete="organization" aria-invalid={!!errors.name} {...form.register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          aria-invalid={!!errors.password}
          {...form.register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>

      {serverError ? (
        <p role="alert" className="rounded-[6px] bg-danger/8 px-3 py-2 text-[13px] text-danger">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        {mode === "sign-in" ? "Entrar" : "Criar conta do estúdio"}
      </Button>

      {allowSignup ? (
        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setServerError(null);
            form.clearErrors();
          }}
          className="text-center text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {mode === "sign-in" ? "Primeiro acesso? Configure seu estúdio" : "Já tem conta? Entrar"}
        </button>
      ) : null}
    </form>
  );
}
