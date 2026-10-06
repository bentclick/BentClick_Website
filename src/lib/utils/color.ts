/** Derives hover/soft tones from one brand accent so a studio colour themes the whole gallery. */
export function accentVars(hex: string): Record<string, string> {
  const valid = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#A27B5C";
  const n = parseInt(valid.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return {
    "--accent": valid,
    "--accent-hover": `rgb(${Math.round(r * 0.86)} ${Math.round(g * 0.86)} ${Math.round(b * 0.86)})`,
    "--accent-soft": `rgb(${r} ${g} ${b} / 0.12)`,
    "--ring": valid,
  };
}
