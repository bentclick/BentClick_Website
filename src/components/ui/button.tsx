import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-[13px] font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Warm brown — reserved for the one primary action on a screen. */
        primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
        dark: "bg-foreground text-white hover:bg-foreground/85",
        /** Secondary: transparent with a taupe hairline. */
        outline: "border border-taupe bg-transparent text-foreground hover:border-muted-foreground/40 hover:bg-subtle",
        ghost: "text-foreground hover:bg-subtle",
        /** Over photography: white hairline, white text. */
        hero: "border border-white/80 bg-transparent text-white hover:bg-white hover:text-foreground",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "h-auto px-0 text-foreground underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[12.5px]",
        md: "h-9 px-4",
        lg: "h-11 px-6",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}
