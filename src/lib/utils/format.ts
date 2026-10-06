const LOCALE = "pt-BR";
const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** "24.8 GB" — decimal point kept on purpose: storage figures read like specs. */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : fractionDigits)} ${UNITS[exponent]}`;
}

// Event dates are calendar dates (stored as DATE) — always format in UTC.
const shortDate = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "3 de out. de 2026" */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return shortDate.format(new Date(date));
}

/** "3 de outubro de 2026" */
export function formatLongDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return longDate.format(new Date(date));
}

export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function initials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
