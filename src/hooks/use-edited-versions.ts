"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { revertEditedVersion, uploadEditedVersion } from "@/lib/uploads/edit-api";
import { matchEditedFiles } from "@/lib/uploads/match-edited";

const CONCURRENCY = 3;

type Job = { photoId: string; file: File };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : "Falha ao enviar");
const listNames = (files: File[]) => files.slice(0, 3).map((f) => f.name).join(", ") + (files.length > 3 ? ` e mais ${files.length - 3}` : "");

/** Sends edited versions (one photo or a batch matched by name) and reverts them. */
export function useEditedVersions(photos: { id: string; filename: string }[]) {
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const running = useRef(false);

  const run = useCallback(
    async (jobs: Job[]) => {
      if (running.current || jobs.length === 0) return;
      running.current = true;
      let done = 0;
      const failures: string[] = [];
      setProgress({ done, total: jobs.length });

      const pending = [...jobs];
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
          for (let job = pending.shift(); job; job = pending.shift()) {
            try {
              await uploadEditedVersion(job.photoId, job.file);
            } catch (error) {
              failures.push(`${job.file.name}: ${messageOf(error)}`);
            }
            setProgress({ done: ++done, total: jobs.length });
          }
        }),
      );

      running.current = false;
      setProgress(null);
      const applied = jobs.length - failures.length;
      if (applied > 0) toast.success(applied === 1 ? "Versão editada aplicada" : `${applied} versões editadas aplicadas`);
      if (failures.length > 0) toast.error(failures[0], { description: failures.length > 1 ? `E mais ${failures.length - 1} com erro.` : undefined });
      router.refresh();
    },
    [router],
  );

  const sendForPhoto = useCallback((photoId: string, file: File) => run([{ photoId, file }]), [run]);

  const sendBatch = useCallback(
    (files: File[]) => {
      const { matched, unmatched, ambiguous } = matchEditedFiles(files, photos);
      if (unmatched.length > 0) toast.warning(`Sem foto com o mesmo nome: ${listNames(unmatched)}`);
      if (ambiguous.length > 0) toast.warning(`Nome repetido, envie pela foto: ${listNames(ambiguous)}`);
      return run(matched);
    },
    [photos, run],
  );

  const revert = useCallback(
    async (photoId: string) => {
      try {
        await revertEditedVersion(photoId);
        toast.success("A foto voltou ao original");
        router.refresh();
      } catch (error) {
        toast.error(messageOf(error));
      }
    },
    [router],
  );

  return { progress, sendForPhoto, sendBatch, revert };
}
