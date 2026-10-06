import { describe, expect, it } from "vitest";
import { galleryReadyEmail } from "./templates";

describe("galleryReadyEmail", () => {
  const base = { studio: "Studio", accent: "#A27B5C", title: "Ana", message: "Olá", url: "https://bentclick.com.br/g/AAAAAAAAAAAA" };

  it("escapes user-provided content", () => {
    const { html } = galleryReadyEmail({ ...base, title: "<script>x</script>", message: 'a "b" <i>c</i>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;b&quot;");
  });

  it("refuses non-hex accents in inline styles", () => {
    const { html } = galleryReadyEmail({ ...base, accent: "red;background:url(x)" });
    expect(html).not.toContain("url(x)");
    expect(html).toContain("#A27B5C");
  });

  it("includes the link in both versions", () => {
    const { html, text } = galleryReadyEmail(base);
    expect(html).toContain(base.url);
    expect(text).toContain(base.url);
  });
});
