import { Download } from "lucide-react";
import type { Metadata } from "next";
import { UpcomingSection } from "@/components/admin/upcoming-section";

export const metadata: Metadata = { title: "Downloads" };

export default function DownloadsPage() {
  return (
    <UpcomingSection
      title="Downloads"
      icon={Download}
      heading="Nenhum download ainda."
      description="Cada foto e arquivo baixado pelos clientes aparecerá aqui, por coleção."
    />
  );
}
