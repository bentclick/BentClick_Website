import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateCollectionForm } from "@/components/admin/collection-form/create-collection-form";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth/session";
import { listClientOptions } from "@/services/clients/client.service";
import { defaultCollectionInput } from "@/services/collections/collection-defaults";
import { getPhotographerProfile } from "@/services/profile/profile.service";
import { listWatermarkOptions } from "@/services/watermarks/watermark.service";

export const metadata: Metadata = { title: "Nova coleção" };

export default async function NewCollectionPage() {
  const user = await requireUser();
  const [profile, clients, watermarks] = await Promise.all([
    getPhotographerProfile(user.id, user.name),
    listClientOptions(user.id),
    listWatermarkOptions(user.id),
  ]);

  return (
    <PageContainer className="max-w-4xl">
      <Link
        href="/dashboard/collections"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Coleções
      </Link>
      <PageHeader
        title="Criar Nova Coleção"
        description="A capa é escolhida depois do envio das fotos."
        className="mb-8 mt-5"
      />
      <CreateCollectionForm defaultValues={defaultCollectionInput(profile)} clients={clients} watermarks={watermarks} />
    </PageContainer>
  );
}
