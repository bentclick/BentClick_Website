"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { clearEditorStorage } from "@/lib/develop/editor-storage";

/**
 * The editor wipes its copies of the RAWs on the way out, but a closed tab or a crash skips that. Any other dashboard
 * page, and the login, sweep them again, so client originals don't stay in this browser until the editor's next use.
 * Not on the editor's own page, which manages its library itself (use-editor-storage).
 */
export function EditorStorageSweep() {
  const pathname = usePathname();
  const inEditor = pathname.startsWith("/dashboard/revelar");
  useEffect(() => {
    if (!inEditor) void clearEditorStorage();
  }, [inEditor]);
  return null;
}
