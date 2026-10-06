import { cn } from "@/lib/utils/cn";

type SwitchFieldProps = Omit<React.ComponentProps<"input">, "type"> & {
  label: string;
  description?: string;
};

/**
 * Native checkbox rendered as a switch: keeps form semantics (works with
 * react-hook-form `register`) and exposes role="switch" to assistive tech.
 */
export function SwitchField({ label, description, className, id, ...props }: SwitchFieldProps) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 py-1.5 has-[:disabled]:opacity-60", className)}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={cn(
          "relative mt-px h-[18px] w-[30px] shrink-0 cursor-pointer appearance-none rounded-full bg-taupe transition-colors duration-200",
          "before:absolute before:left-[2px] before:top-[2px] before:size-[14px] before:rounded-full before:bg-white before:shadow-sm before:transition-transform before:duration-200",
          "checked:bg-accent checked:before:translate-x-[12px]",
        )}
        {...props}
      />
      <span className="grid gap-0.5">
        <span className="text-[13px] leading-5 text-foreground">{label}</span>
        {description ? <span className="text-[12px] leading-4 text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}
