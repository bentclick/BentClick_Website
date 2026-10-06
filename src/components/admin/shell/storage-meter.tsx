import { HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/misc";
import { formatBytes } from "@/lib/utils/format";

type StorageMeterProps = { usedBytes: number; quotaBytes: number; collapsed?: boolean };

/** "24.8 GB de 100 GB" with a hairline brown bar. */
export function StorageMeter({ usedBytes, quotaBytes, collapsed = false }: StorageMeterProps) {
  const ratio = quotaBytes > 0 ? usedBytes / quotaBytes : 0;
  const summary = `${formatBytes(usedBytes)} de ${formatBytes(quotaBytes, 0)}`;

  if (collapsed) {
    return (
      <div title={`Armazenamento: ${summary}`} className="flex justify-center py-2 text-muted-foreground">
        <HardDrive aria-label={`Armazenamento: ${summary}`} strokeWidth={1.4} className="size-[17px]" />
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <p className="text-[12px] tabular-nums text-foreground/80">{summary}</p>
      <Progress value={ratio} label="Armazenamento utilizado" className={ratio > 0.9 ? "mt-2 [&>div]:bg-danger" : "mt-2"} />
    </div>
  );
}
