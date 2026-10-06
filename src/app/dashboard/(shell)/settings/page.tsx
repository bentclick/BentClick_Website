import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { UpcomingSection } from "@/components/admin/upcoming-section";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <UpcomingSection
      title="Configurações"
      icon={Settings}
      heading="Configurações em breve."
      description="Perfil, marca, padrões de galeria, marcas d’água, downloads, e-mail, armazenamento e segurança."
    />
  );
}
