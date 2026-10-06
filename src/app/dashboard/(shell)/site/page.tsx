import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { SiteEditor } from "@/components/admin/site-editor/site-editor";
import { requireUser } from "@/lib/auth/session";
import { getSiteEditorData } from "@/services/site/site-content.service";

export const metadata: Metadata = { title: "Site" };

/** Edit every text, photo, colour and section of the public website — no code. */
export default async function SitePage() {
  const user = await requireUser();
  const { content, accent, images } = await getSiteEditorData(user.id);

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="Site" description="Textos, fotos, cores e seções do seu site público. Salve para publicar na hora." className="mb-8" />
      <SiteEditor initial={content} initialAccent={accent} images={images} />
    </PageContainer>
  );
}
