/**
 * The editor's library in this browser. LightCraft runs on our origin with `?store=idb`, so it keeps its catalog and
 * a copy of every RAW it opens in this IndexedDB database. `?store=memory` would keep nothing, but in 0.20.0 it can't
 * develop a RAW at all (the worker looks the original up in browser storage and edits only the camera preview).
 * Removing a photo inside the editor doesn't delete its stored original either, so the page wipes the whole
 * database: before the editor starts and again on the way out. Nothing in it is ours to keep, since adjustments
 * aren't saved and only the exported image reaches the site.
 */
const EDITOR_DATABASE = "lightcraft";

/**
 * Deletes the editor's database. Resolves once it is gone, or right away when the browser refuses storage (the
 * editor then still opens, keeping its copy). While another tab still has the editor open the browser holds the
 * deletion: `onBlocked` fires, and the promise resolves when that tab closes.
 */
export function clearEditorStorage(onBlocked?: () => void): Promise<void> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = window.indexedDB.deleteDatabase(EDITOR_DATABASE);
    } catch {
      return resolve();
    }
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => onBlocked?.();
  });
}
