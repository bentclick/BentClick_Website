"use client";

import { useCallback } from "react";
import { toast } from "sonner";

export function useCopyToClipboard() {
  return useCallback(async (text: string, successMessage = "Copiado") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error("Não foi possível acessar a área de transferência");
    }
  }, []);
}
