"use client";

import { useEffect, useState } from "react";
import { clearEditorStorage } from "@/lib/develop/editor-storage";

export type EditorStorage = "clearing" | "blocked" | "clear";

/**
 * Starts every session with an empty editor library and empties it again on leaving, so the RAWs opened here don't
 * pile up in the photographer's browser. The editor may only mount once this reports `clear`: opening the database
 * while its deletion is pending would leave the editor waiting on it.
 */
export function useEditorStorage(): EditorStorage {
  const [state, setState] = useState<EditorStorage>("clearing");

  useEffect(() => {
    let active = true;
    void clearEditorStorage(() => active && setState("blocked")).then(() => active && setState("clear"));
    return () => {
      active = false;
      // queued by the browser until the frame closes its connection, then runs
      void clearEditorStorage();
    };
  }, []);

  return state;
}
