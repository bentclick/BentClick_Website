/**
 * Several photos in one editor session. LightCraft names each export after the file it was opened as (`{name}`, with
 * `-2`, `-3`… when that name is taken), so the only link from an export back to a photo is its name. Two photos of an
 * album often share one (RAW + JPEG of the same frame, DSC_0001 in two galleries), so each is opened under a name that
 * is unique in the session: the original, or `_2`, `_3`… added to the stem. `_` and not `-`, so it can't be mistaken
 * for the editor's own suffix.
 */

/** Enough for an album in one sitting; every original is copied into the browser's storage, so a cap keeps it sane. */
export const MAX_DEVELOP_BATCH = 200;

export type BatchPhoto = { photoId: string; filename: string };
export type OpenedPhoto<T extends BatchPhoto> = T & { openName: string };

const split = (filename: string) => {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? { stem: filename.slice(0, dot), ext: filename.slice(dot) } : { stem: filename, ext: "" };
};
const key = (stem: string) => stem.toLowerCase();

/** The name each photo is opened under in the editor, in order, none sharing a stem with another. */
export function withOpenNames<T extends BatchPhoto>(photos: T[]): OpenedPhoto<T>[] {
  const taken = new Set(photos.map((p) => key(split(p.filename).stem)));
  const used = new Set<string>();
  return photos.map((photo) => {
    const { stem, ext } = split(photo.filename);
    // free = not given out yet, and not the real name of another photo (one may literally be called `DSC_2`)
    const free = (s: string) => !used.has(key(s)) && (key(s) === key(stem) || !taken.has(key(s)));
    let candidate = stem;
    for (let n = 2; !free(candidate); n++) candidate = `${stem}_${n}`;
    used.add(key(candidate));
    return { ...photo, openName: `${candidate}${ext}` };
  });
}

/** The photo an export came from, or null for anything else (another file imported into the editor, a copy). */
export function photoOfExport<T extends BatchPhoto>(photos: OpenedPhoto<T>[], savedName: string): OpenedPhoto<T> | null {
  const byStem = new Map(photos.map((p) => [key(split(p.openName).stem), p]));
  const stem = key(split(savedName).stem);
  const exact = byStem.get(stem);
  if (exact) return exact;
  const renamed = /^(.*)-\d+$/.exec(stem); // exported again in the same session: "dsc_0001-2.jpg"
  return renamed ? (byStem.get(renamed[1]!) ?? null) : null;
}
