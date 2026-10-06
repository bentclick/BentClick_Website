import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteProfile } from "@/services/site/site.service";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSiteProfile();
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter profile={profile} />
    </>
  );
}
