/**
 * Email templates: table layout + inline styles (what email clients render
 * reliably), escaped user content, and a plain-text twin for every message.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const paragraphs = (s: string) =>
  esc(s)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font:15px/1.65 Georgia,'Times New Roman',serif;color:#3d3a36">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

function layout(studio: string, rawAccent: string, inner: string) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(rawAccent) ? rawAccent : "#A27B5C";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f8f7f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e5df;border-radius:8px">
<tr><td style="padding:36px 40px 8px;text-align:center;font:500 12px/1 Georgia,serif;letter-spacing:6px;color:#111111;text-transform:uppercase">${esc(studio)}</td></tr>
<tr><td style="padding:24px 40px 40px">${inner}</td></tr>
</table>
<p style="margin:20px 0 0;font:11px/1.5 Arial,sans-serif;color:#77736d">Enviado com BentClick</p>
</td></tr></table></body></html>`.replace(/ACCENT/g, accent);
}

export function galleryReadyEmail(input: { studio: string; accent: string; title: string; message: string; url: string; password?: boolean }) {
  const button = `<a href="${esc(input.url)}" style="display:inline-block;background:ACCENT;color:#ffffff;text-decoration:none;font:500 12px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;padding:16px 28px;border-radius:4px">Ver galeria</a>`;
  const html = layout(
    input.studio,
    input.accent,
    `<h1 style="margin:0 0 24px;text-align:center;font:400 30px/1.2 Georgia,serif;color:#111111;letter-spacing:2px;text-transform:uppercase">${esc(input.title)}</h1>
${paragraphs(input.message)}
<p style="margin:28px 0;text-align:center">${button}</p>
${input.password ? `<p style="margin:0 0 12px;font:13px/1.5 Arial,sans-serif;color:#77736d;text-align:center">A galeria é protegida por senha — ela foi enviada separadamente pelo fotógrafo.</p>` : ""}
<p style="margin:0;font:12px/1.5 Arial,sans-serif;color:#77736d;text-align:center;word-break:break-all">${esc(input.url)}</p>`,
  );
  const text = `${input.title.toUpperCase()}\n\n${input.message}\n\nVer galeria: ${input.url}\n${input.password ? "\nA galeria é protegida por senha.\n" : ""}\n— ${input.studio}`;
  return { html, text };
}

export function selectionSubmittedEmail(input: { studio: string; accent: string; title: string; clientName: string; clientEmail: string; count: number; url: string }) {
  const html = layout(
    input.studio,
    input.accent,
    `<h1 style="margin:0 0 20px;font:400 26px/1.25 Georgia,serif;color:#111111">Nova seleção em “${esc(input.title)}”</h1>
${paragraphs(`${input.clientName} (${input.clientEmail}) escolheu ${input.count} ${input.count === 1 ? "foto" : "fotos"}.`)}
<p style="margin:24px 0 0"><a href="${esc(input.url)}" style="display:inline-block;background:ACCENT;color:#fff;text-decoration:none;font:500 12px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;padding:14px 24px;border-radius:4px">Ver seleção</a></p>`,
  );
  const text = `Nova seleção em "${input.title}"\n\n${input.clientName} (${input.clientEmail}) escolheu ${input.count} fotos.\n\nVer seleção: ${input.url}`;
  return { html, text };
}

export const DEFAULT_GALLERY_MESSAGE = (clientName: string | null) =>
  `Olá${clientName ? `, ${clientName.split(" ")[0]}` : ""}!\n\nSuas fotos estão prontas. Foi um prazer registrar esse momento — espero que você goste de cada imagem.\n\nNa galeria você pode marcar suas favoritas com o coração e baixar as fotos.`;
