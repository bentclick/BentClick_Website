"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      title="Algo deu errado."
      description={error.digest ? `Referência ${error.digest}. Tente novamente.` : "Tente novamente."}
      action={
        <Button variant="outline" onClick={reset}>
          Tentar novamente
        </Button>
      }
      className="min-h-[60dvh]"
    />
  );
}
