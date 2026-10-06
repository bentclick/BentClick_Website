import { Images } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollectionCover } from "@/components/admin/collections/collection-cover";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { NewAlbumButton } from "@/components/admin/portfolio/new-album-button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { PORTFOLIO_CATEGORIES } from "@/lib/constants/portfolio";
import { cn } from "@/lib/utils/cn";
import { pluralize } from "@/lib/utils/format";
import { listPortfolioAlbums } from "@/services/portfolio/portfolio.service";

export const metadata: Metadata = { title: "Portfólio" };

const LABEL = Object.fromEntries(PORTFOLIO_CATEGORIES.map((c) => [c.value, c.label]));

export default async function PortfolioPage() {
  const user = await requireUser();
  const albums = await listPortfolioAlbums(user.id);

  return (
    <PageContainer>
      <PageHeader
        title="Portfólio"
        count={albums.length || undefined}
        description="Álbuns publicados aparecem no site, separados das entregas aos clientes."
        actions={<NewAlbumButton />}
      />
      {albums.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Nenhum álbum no portfólio."
          description="Crie um álbum por trabalho ou categoria. A capa do álbum também alimenta a abertura do site."
          className="mt-10 rounded-[6px] border border-dashed border-taupe bg-surface/50"
        />
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {albums.map((a) => (
            <li key={a.id}>
              <Link href={`/dashboard/portfolio/${a.id}`} className="group block overflow-hidden rounded-[6px] border border-border bg-surface transition-colors hover:border-taupe">
                <CollectionCover title={a.title} coverUrl={a.coverUrl} coverColor={a.coverColor} className="aspect-[4/3]" />
                <div className="px-4 pb-4 pt-3.5">
                  <p className="truncate font-serif text-[19px] font-medium leading-tight">{a.title}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {LABEL[a.category]} · {pluralize(a.imageCount, "foto")}
                  </p>
                  <span
                    className={cn(
                      "mt-3 inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 text-[11.5px] font-medium",
                      a.isPublished ? "bg-success-soft text-success" : "bg-subtle text-muted-foreground",
                    )}
                  >
                    <i aria-hidden className={cn("size-1.5 rounded-full", a.isPublished ? "bg-success" : "bg-muted-foreground/60")} />
                    {a.isPublished ? "No site" : "Oculto"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
