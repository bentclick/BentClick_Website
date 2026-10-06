"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/result";

/** Runs a settings action with feedback; returns field errors to the caller. */
export function useSave() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function save<T>(action: () => Promise<ActionResult<T>>, success: string, onDone?: (data: T) => void, onFieldErrors?: (e: Record<string, string[]>) => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        if (result.fieldErrors) onFieldErrors?.(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(success);
      onDone?.(result.data);
      router.refresh();
    });
  }

  return { pending, save };
}

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave?: () => void;
  pending?: boolean;
  saveLabel?: string;
  id?: string;
};

/** One settings section: label column, controls, and its own save button. */
export function SettingsCard({ title, description, children, onSave, pending, saveLabel = "Salvar", id }: Props) {
  return (
    <section id={id} className="scroll-mt-24 overflow-hidden rounded-[8px] border border-border bg-surface">
      <div className="grid gap-6 p-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        <div>
          <h3 className="font-serif text-[22px] font-medium leading-tight">{title}</h3>
          {description ? <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">{description}</p> : null}
        </div>
        <div className="grid max-w-xl content-start gap-5">{children}</div>
      </div>
      {onSave ? (
        <div className="flex justify-end border-t border-border bg-background/50 px-6 py-3">
          <Button size="sm" onClick={onSave} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {saveLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
