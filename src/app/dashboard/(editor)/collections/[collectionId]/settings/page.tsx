import type { Metadata } from "next";
import { AccessCard } from "@/components/admin/collection-settings/access-card";
import { DetailsCard } from "@/components/admin/collection-settings/details-card";
import { ExpiryCard } from "@/components/admin/collection-settings/expiry-card";
import { LinkCard } from "@/components/admin/collection-settings/link-card";
import { PermissionsCard } from "@/components/admin/collection-settings/permissions-card";
import { listClientOptions } from "@/services/clients/client.service";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { loadEditorCollection } from "../_load";

export const metadata: Metadata = { title: "Configurações da coleção" };

export default async function CollectionSettingsPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { user, collection } = await loadEditorCollection((await params).collectionId);
  const clients = await listClientOptions(user.id);

  const view: CollectionSettingsView = {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description ?? "",
    eventDate: collection.eventDate?.toISOString().slice(0, 10) ?? "",
    category: collection.category,
    clientId: collection.clientId ?? "",
    status: collection.status,
    expiresAt: collection.expiresAt?.toISOString() ?? null,
    isPrivate: collection.isPrivate,
    requireClientIdentity: collection.requireClientIdentity,
    hasPassword: collection.hasPassword,
    linkEnabled: collection.linkEnabled,
    allowFavorites: collection.allowFavorites,
    allowIndividualDownload: collection.allowIndividualDownload,
    allowFullDownload: collection.allowFullDownload,
    allowSharing: collection.allowSharing,
    downloadQuality: collection.downloadQuality,
    layout: collection.layout,
  };

  return (
    <div className="grid max-w-5xl gap-6">
      <header>
        <h2 className="font-serif text-[30px] font-medium leading-none">Configurações</h2>
        <p className="mt-2 text-[12.5px] text-muted-foreground">Cada seção é salva separadamente.</p>
      </header>
      <DetailsCard key={`d-${collection.title}-${view.eventDate}`} collection={view} clients={clients} />
      <ExpiryCard collection={view} />
      <AccessCard key={`a-${view.hasPassword}`} collection={view} />
      <PermissionsCard collection={view} />
      <LinkCard collection={view} />
    </div>
  );
}
