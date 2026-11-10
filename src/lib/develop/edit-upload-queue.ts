/**
 * Edited versions from one editor session, uploaded one at a time in the order the editor exported them. "Salvar
 * todas" can hand over an album in seconds, past the upload rate limit (60 a minute), so a 429 waits and tries the same
 * photo again instead of failing the rest of the batch.
 */

export type UploadCounts = { pending: number; saved: number; failed: number };
type Job = { label: string; run: () => Promise<void> };
type Options = {
  onChange: (counts: UploadCounts) => void;
  onFailure: (label: string, error: unknown) => void;
  isRateLimited: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
  retryDelayMs?: number;
  maxRetries?: number;
};

export function createEditUploadQueue({ onChange, onFailure, isRateLimited, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), retryDelayMs = 20_000, maxRetries = 4 }: Options) {
  const counts: UploadCounts = { pending: 0, saved: 0, failed: 0 };
  let tail: Promise<void> = Promise.resolve();
  const emit = () => onChange({ ...counts });

  async function attempt(job: Job) {
    for (let tries = 0; ; tries++) {
      try {
        await job.run();
        counts.saved++;
        return;
      } catch (error) {
        if (isRateLimited(error) && tries < maxRetries) {
          await sleep(retryDelayMs);
          continue;
        }
        counts.failed++;
        onFailure(job.label, error);
        return;
      }
    }
  }

  return {
    add(job: Job) {
      counts.pending++;
      emit();
      tail = tail.then(async () => {
        await attempt(job);
        counts.pending--;
        emit();
      });
      return tail;
    },
  };
}
