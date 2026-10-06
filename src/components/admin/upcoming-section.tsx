import type { LucideIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/** Placeholder for dashboard sections scheduled in later phases (docs/ARCHITECTURE.md §11). */
export function UpcomingSection({
  title,
  icon,
  heading,
  description,
}: {
  title: string;
  icon: LucideIcon;
  heading: string;
  description: string;
}) {
  return (
    <PageContainer>
      <PageHeader title={title} />
      <EmptyState
        icon={icon}
        title={heading}
        description={description}
        className="mt-10 rounded-[8px] border border-dashed border-taupe"
      />
    </PageContainer>
  );
}
