import { PageContainer } from "@/components/admin/page-header";
import { Skeleton } from "@/components/ui/misc";

export default function CollectionsLoading() {
  return (
    <PageContainer>
      <Skeleton className="h-11 w-56" />
      <Skeleton className="mt-8 h-10 w-full max-w-3xl" />
      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/3] rounded-[8px]" />
            <Skeleton className="mt-4 h-6 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
