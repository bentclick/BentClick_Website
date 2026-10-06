import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { WatermarkList } from "@/components/admin/watermarks/watermark-list";
import { requireUser } from "@/lib/auth/session";
import { listWatermarks } from "@/services/watermarks/watermark.service";

export const metadata: Metadata = { title: "Marcas d’água" };

export default async function WatermarksPage() {
  const user = await requireUser();
  const watermarks = await listWatermarks(user.id);
  return (
    <PageContainer className="max-w-5xl">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Configurações
      </Link>
      <PageHeader title="Marcas d’água" description="Aplicadas apenas às prévias das galerias. Originais e downloads nunca são alterados." className="mb-2 mt-4" />
      <WatermarkList watermarks={watermarks} />
    </PageContainer>
  );
}
