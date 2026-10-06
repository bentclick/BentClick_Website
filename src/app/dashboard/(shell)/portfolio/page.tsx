import { Images } from "lucide-react";
import type { Metadata } from "next";
import { UpcomingSection } from "@/components/admin/upcoming-section";

export const metadata: Metadata = { title: "Portfólio" };

export default function PortfolioPage() {
  return (
    <UpcomingSection
      title="Portfólio"
      icon={Images}
      heading="Nenhum álbum no portfólio."
      description="Os álbuns públicos do seu site ficam aqui, separados das entregas privadas aos clientes."
    />
  );
}
