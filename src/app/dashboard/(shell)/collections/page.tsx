import { GalleryVerticalEnd, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollectionCard } from "@/components/admin/collections/collection-card";
import { CollectionListTable } from "@/components/admin/collections/collection-list-table";
import { CollectionSearch } from "@/components/admin/collections/collection-search";
import { CollectionsToolbar } from "@/components/admin/collections/collections-toolbar";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { collectionFiltersSchema } from "@/lib/validation/collection";
import { hasAnyCollections, listCollections } from "@/services/collections/collection.service";

export const metadata: Metadata = { title: "Coleções" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CollectionsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const filters = collectionFiltersSchema.parse(await searchParams);
  const [collections, anyCollections] = await Promise.all([listCollections(user.id, filters), hasAnyCollections(user.id)]);

  if (!anyCollections) {
    return (
      <PageContainer>
        <PageHeader title="Coleções" />
        <EmptyState
          icon={GalleryVerticalEnd}
          title="Nenhuma coleção ainda."
          description="Cada coleção reúne um trabalho — suas galerias, capa e configurações de entrega. Comece pela sessão mais recente."
          action={
            <Button asChild size="lg">
              <Link href="/dashboard/collections/new">Criar sua primeira coleção</Link>
            </Button>
          }
          className="mt-10 rounded-[6px] border border-dashed border-taupe bg-surface/50"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Coleções"
        count={collections.length}
        actions={
          <>
            <CollectionSearch initialQuery={filters.q} />
            <Button asChild>
              <Link href="/dashboard/collections/new">
                <Plus /> Nova coleção
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-7">
        <CollectionsToolbar filters={filters} />
      </div>

      <section aria-label="Coleções" className="mt-6">
        {collections.length === 0 ? (
          <EmptyState icon={SearchX} title="Nada encontrado." description="Tente outra busca ou limpe os filtros." />
        ) : filters.view === "list" ? (
          <CollectionListTable collections={collections} />
        ) : (
          <ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5">
            {collections.map((collection) => (
              <li key={collection.id}>
                <CollectionCard collection={collection} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
