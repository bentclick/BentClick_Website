/** Pairs exported files with gallery photos by name: DSC03035.jpg goes to DSC03035.ARW. */

const stem = (filename: string) => filename.replace(/\.[^.]+$/, "").trim().toLowerCase();

export type EditedMatch<F> = { matched: { photoId: string; file: F }[]; unmatched: F[]; ambiguous: F[] };

export function matchEditedFiles<F extends { name: string }>(files: F[], photos: { id: string; filename: string }[]): EditedMatch<F> {
  const byStem = new Map<string, string[]>();
  for (const photo of photos) byStem.set(stem(photo.filename), [...(byStem.get(stem(photo.filename)) ?? []), photo.id]);

  const fileCount = new Map<string, number>();
  for (const file of files) fileCount.set(stem(file.name), (fileCount.get(stem(file.name)) ?? 0) + 1);

  const result: EditedMatch<F> = { matched: [], unmatched: [], ambiguous: [] };
  for (const file of files) {
    const ids = byStem.get(stem(file.name));
    const [photoId, ...others] = ids ?? [];
    if (!photoId) result.unmatched.push(file);
    // Guessing here could put one client's photo over another, so it is left to the photographer.
    else if (others.length > 0 || (fileCount.get(stem(file.name)) ?? 0) > 1) result.ambiguous.push(file);
    else result.matched.push({ photoId, file });
  }
  return result;
}
