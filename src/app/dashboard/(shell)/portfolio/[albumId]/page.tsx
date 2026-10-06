import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { AlbumImages } from "@/components/admin/portfolio/album-images";
import { AlbumSettings } from "@/components/admin/portfolio/album-settings";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { NotFoundError } from "@/services/errors";
import { getAlbum } from "@/services/portfolio/portfolio.service";

export const metadata: Metadata = { title: "Álbum do portfólio" };

export default async function AlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const user = await requireUser();
  const id = idSchema.safeParse((await params).albumId);
  if (!id.success) notFound();
  const { album, images } = await getAlbum(user.id, id.data).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  return (
    <PageContainer className="grid gap-8">
      <div>
        <Link href="/dashboard/portfolio" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Portfólio
        </Link>
        <PageHeader
          title={album.title}
          className="mt-4"
          actions={
            album.isPublished ? (
              <Button asChild variant="outline" size="sm">
                <a href="/portfolio" target="_blank" rel="noreferrer">
                  <ExternalLink /> Ver no site
                </a>
              </Button>
            ) : null
          }
        />
      </div>
      <AlbumSettings
        key={`${album.title}-${album.isPublished}-${album.category}`}
        album={{ id: album.id, title: album.title, category: album.category, description: album.description ?? "", isPublished: album.isPublished }}
      />
      <AlbumImages albumId={album.id} albumTitle={album.title} images={images} />
    </PageContainer>
  );
}
