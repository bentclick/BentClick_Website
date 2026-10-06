"use client";

import { Toaster as Sonner } from "sonner";

/** Quiet, bottom-right toasts in the product palette. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[8px] !border !border-border !bg-surface !text-foreground !shadow-[0_8px_24px_-12px_rgba(23,23,23,0.18)] !font-sans",
          description: "!text-muted-foreground",
          actionButton: "!bg-foreground !text-surface",
        },
      }}
    />
  );
}
