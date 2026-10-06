import { describe, expect, it } from "vitest";
import { parseSiteContent } from "./site-content";

describe("parseSiteContent", () => {
  it("fills every field from defaults for an empty document", () => {
    const c = parseSiteContent({});
    expect(c.hero.title).toBe("Histórias\nem imagens\nreais.");
    expect(c.hero.overlay).toBe(0.45);
    expect(c.contact.heading).toBe("Vamos contar a sua história.");
    expect(c.home.sections.map((s) => s.type)).toEqual(["works", "about", "contact"]);
    expect(c.home.sections.find((s) => s.type === "works")?.visible).toBe(true);
  });

  it("keeps edited fields and defaults the rest", () => {
    const c = parseSiteContent({ hero: { title: "Outro título" }, contact: { email: "oi@bentclick.com.br" } });
    expect(c.hero.title).toBe("Outro título");
    expect(c.hero.subtitle).toMatch(/Fotografia/);
    expect(c.contact.email).toBe("oi@bentclick.com.br");
  });

  it("falls back per field on invalid stored data instead of failing", () => {
    const c = parseSiteContent({ hero: { title: 42, overlay: 9 }, works: { count: "x" } });
    expect(c.hero.title).toBe("Histórias\nem imagens\nreais.");
    expect(c.hero.overlay).toBe(0.45);
    expect(c.works.count).toBe(12);
  });

  it("preserves section order and visibility, dedupes, appends new section types", () => {
    const c = parseSiteContent({ home: { sections: [{ type: "contact", visible: true }, { type: "contact", visible: false }, { type: "works", visible: false }] } });
    expect(c.home.sections).toEqual([
      { type: "contact", visible: true },
      { type: "works", visible: false },
      { type: "about", visible: false },
    ]);
  });

  it("survives null and garbage", () => {
    expect(parseSiteContent(null).hero.primaryLabel).toBe("Ver portfólio");
    expect(parseSiteContent("nope").works.eyebrow).toBe("Trabalhos");
  });
});
