"use client";

import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuGroup = Primitive.Group;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-[8px] border border-border bg-surface p-1 text-foreground shadow-[0_12px_32px_-12px_rgba(23,23,23,0.22)] animate-fade-in",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof Primitive.Item> & { destructive?: boolean }) {
  return (
    <Primitive.Item
      className={cn(
        "flex cursor-default select-none items-center gap-2.5 rounded-[5px] px-2.5 py-2 text-[13px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-subtle [&_svg]:size-4 [&_svg]:text-muted-foreground",
        destructive && "text-danger data-[highlighted]:bg-danger/8 [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

export const DropdownMenuRadioGroup = Primitive.RadioGroup;

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[5px] py-2 pl-7 pr-2.5 text-[13px] outline-none data-[highlighted]:bg-subtle data-[state=checked]:font-medium data-[state=checked]:text-accent-hover",
        className,
      )}
      {...props}
    >
      <Primitive.ItemIndicator className="absolute left-2.5 size-1.5 rounded-full bg-accent" />
      {children}
    </Primitive.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn("eyebrow px-2.5 pb-1 pt-2", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}
