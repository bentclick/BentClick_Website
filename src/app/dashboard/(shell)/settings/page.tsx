import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { DefaultsCard } from "@/components/admin/settings/defaults-card";
import { ProfileCard } from "@/components/admin/settings/profile-card";
import { SecurityCard } from "@/components/admin/settings/security-card";
import { Progress } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { formatBytes } from "@/lib/utils/format";
import { getSettings } from "@/services/settings/settings.service";

export const metadata: Metadata = { title: "Configurações" };

const SECTIONS = [
  ["perfil", "Perfil e marca"],
  ["padroes", "Padrões de galeria"],
  ["marcas-dagua", "Marcas d’água"],
  ["seguranca", "Segurança"],
  ["armazenamento", "Armazenamento"],
] as const;

export default async function SettingsPage() {
  const user = await requireUser();
  const { user: account, profile, storage, watermarks } = await getSettings(user.id, user.name);

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="Configurações" className="mb-6" />
      <nav aria-label="Seções" className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="hover:text-foreground">
            {label}
          </a>
        ))}
        <Link href="/dashboard/site" className="hover:text-foreground">
          Site (textos, fotos e cores) →
        </Link>
      </nav>

      <div className="grid gap-6">
        <ProfileCard
          email={account.email}
          initial={{
            name: account.name,
            brandName: profile.brandName,
            professionalTitle: profile.professionalTitle,
            tagline: profile.tagline ?? "",
            websiteUrl: profile.websiteUrl ?? "",
            instagram: profile.instagram ?? "",
            replyToEmail: profile.replyToEmail ?? "",
          }}
        />
        <DefaultsCard
          watermarks={watermarks}
          initial={{
            defaultExpiryDays: ([0, 7, 15, 30, 60, 90] as const).find((d) => d === (profile.defaultExpiryDays ?? 0)) ?? 30,
            defaultAllowFavorites: profile.defaultAllowFavorites,
            defaultAllowIndividualDownload: profile.defaultAllowIndividualDownload,
            defaultAllowFullDownload: profile.defaultAllowFullDownload,
            defaultAllowSharing: profile.defaultAllowSharing,
            defaultDownloadQuality: profile.defaultDownloadQuality,
            defaultLayout: profile.defaultLayout,
            defaultWatermarkId: profile.defaultWatermarkId ?? "",
          }}
        />
        <section id="marcas-dagua" className="scroll-mt-24 rounded-[8px] border border-border bg-surface p-6">
          <h3 className="font-serif text-[22px] font-medium">Marcas d’água</h3>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            {watermarks.length ? `${watermarks.length} marca(s) cadastrada(s).` : "Nenhuma marca d’água ainda."}{" "}
            <Link href="/dashboard/settings/watermarks" className="text-foreground underline underline-offset-4">
              Gerenciar marcas d’água
            </Link>
          </p>
        </section>
        <SecurityCard />
        <section id="armazenamento" className="scroll-mt-24 rounded-[8px] border border-border bg-surface p-6">
          <h3 className="font-serif text-[22px] font-medium">Armazenamento</h3>
          <p className="mt-3 text-[14px] tabular-nums">
            {formatBytes(storage.usedBytes)} de {formatBytes(storage.quotaBytes, 0)} usados
          </p>
          <Progress value={storage.ratio} label="Armazenamento utilizado" className="mt-3 max-w-md" />
          <p className="mt-3 text-[12px] text-muted-foreground">Originais das galerias e do portfólio. Prévias e arquivos ZIP temporários não entram na conta.</p>
        </section>
      </div>
    </PageContainer>
  );
}
