const SLUG = /^[0-9A-Za-z]{12}$/;

/**
 * Accepts a bare gallery code ("7VqxN28LmK0a") or a full gallery link
 * ("https://…/g/7VqxN28LmK0a?x") and returns the code, or null.
 */
export function parseGalleryCode(input: string): string | null {
  const value = input.trim();
  if (SLUG.test(value)) return value;
  const match = value.match(/\/g\/([0-9A-Za-z]{12})(?:[/?#]|$)/);
  return match?.[1] ?? null;
}
