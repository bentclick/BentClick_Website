"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

export type FilterOption = { value: string; label: string };

type FilterMenuProps = {
  label: string;
  value: string;
  defaultValue: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

/** "Status ⌄" — shows the chosen value and turns brown while a filter is active. */
export function FilterMenu({ label, value, defaultValue, options, onChange }: FilterMenuProps) {
  const active = value !== defaultValue;
  const current = options.find((o) => o.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[5px] border border-border bg-surface px-3 text-[12.5px] text-foreground/85 transition-colors duration-200 hover:border-taupe data-[state=open]:border-taupe",
          active && "border-accent/40 bg-accent-soft text-accent-hover hover:border-accent/60",
        )}
      >
        {active && current ? current.label : label}
        <ChevronDown aria-hidden className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange} aria-label={label}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
