import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  title: string;
  /** Small count shown after the title, e.g. "Coleções (12)". */
  count?: number;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, count, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0">
        <h1 className="font-serif text-[34px] font-medium leading-none tracking-tight">
          {title}
          {count !== undefined ? <span className="ml-2 font-sans text-base font-normal text-muted-foreground">({count})</span> : null}
        </h1>
        {description ? <p className="mt-2.5 text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Standard page gutter for dashboard content. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8 sm:py-10 xl:px-10", className)}>{children}</main>;
}
