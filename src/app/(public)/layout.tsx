import { EditSiteButton } from "@/components/site/edit-site-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { accentVars } from "@/lib/utils/color";
import { getSite } from "@/services/site/site.service";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { profile, content, accent } = await getSite();
  return (
    <div style={accentVars(accent) as React.CSSProperties}>
      <SiteHeader />
      {children}
      <SiteFooter profile={profile} line={content.footer.line} />
      <EditSiteButton />
    </div>
  );
}
