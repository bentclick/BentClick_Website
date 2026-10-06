"use client";

import { X } from "lucide-react";
import { Dialog as Primitive } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

function Overlay() {
  return <Primitive.Overlay className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-[2px] animate-fade-in" />;
}

/** Centered modal. */
export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Overlay />
      <Primitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[8px] bg-surface p-6 shadow-[0_24px_64px_-24px_rgba(23,23,23,0.4)] animate-fade-in",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close className="absolute right-4 top-4 rounded-[6px] p-1 text-muted-foreground hover:bg-subtle hover:text-foreground">
          <X className="size-4" />
          <span className="sr-only">Fechar</span>
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}

/** Edge drawer — used for mobile navigation. */
export function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: React.ComponentProps<typeof Primitive.Content> & { side?: "left" | "right" }) {
  return (
    <Primitive.Portal>
      <Overlay />
      <Primitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(300px,86vw)] flex-col bg-surface shadow-xl animate-fade-in",
          side === "left" ? "left-0" : "right-0",
          className,
        )}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn("font-serif text-2xl font-medium", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn("mt-1.5 text-sm text-muted-foreground", className)} {...props} />;
}
