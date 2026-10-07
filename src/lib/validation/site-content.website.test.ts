import { describe, expect, it } from "vitest";
import { parseSiteContent } from "./site-content";

describe("site contact website link", () => {
  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://x"])("drops %s without resetting the rest of the document", (website) => {
    const parsed = parseSiteContent({ contact: { website, heading: "Fale comigo" }, about: { title: "Ana" } });
    expect(parsed.contact.website).toBe("");
    expect(parsed.contact.heading).toBe("Fale comigo");
    expect(parsed.about.title).toBe("Ana");
  });

  it("keeps http(s) links", () => {
    expect(parseSiteContent({ contact: { website: "https://bentclick.com.br" } }).contact.website).toBe("https://bentclick.com.br");
  });
});
