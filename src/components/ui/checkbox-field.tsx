import { cn } from "@/lib/utils/cn";

type CheckboxFieldProps = Omit<React.ComponentProps<"input">, "type"> & {
  label: string;
  description?: string;
};

/** Native checkbox with label + description; whole row is the hit target. */
export function CheckboxField({ label, description, className, id, ...props }: CheckboxFieldProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[6px] py-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[3px] border-taupe accent-[var(--accent)]"
        {...props}
      />
      <span className="grid gap-0.5">
        <span className="text-sm font-medium leading-5">{label}</span>
        {description ? <span className="text-[13px] text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}
