import { HomeHero } from "@/components/site/home-hero";
import { HomeAbout, HomeContact, HomeWorks } from "@/components/site/home-sections";
import { getHeroImages, getPortfolioImages, getSite } from "@/services/site/site.service";

// Signed display URLs live for ≥ 6 h; edits revalidate immediately anyway.
export const revalidate = 600;

/** Hero first, then the sections in the order and visibility chosen in the site editor. */
export default async function HomePage() {
  const { content, profile } = await getSite();
  const showWorks = content.home.sections.some((s) => s.type === "works" && s.visible);
  const [heroImages, works] = await Promise.all([getHeroImages(content), showWorks ? getPortfolioImages(null, content.works.count) : Promise.resolve([])]);

  return (
    <main>
      <HomeHero images={heroImages} hero={content.hero} />
      {content.home.sections
        .filter((s) => s.visible)
        .map((s) => {
          switch (s.type) {
            case "works":
              return <HomeWorks key="works" works={content.works} images={works} />;
            case "about":
              return <HomeAbout key="about" about={content.about} fallbackTitle={profile?.name ?? "BentClick Fotografia"} />;
            case "contact":
              return <HomeContact key="contact" contact={content.contact} />;
          }
        })}
    </main>
  );
}
