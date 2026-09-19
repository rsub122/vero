"use client";

import { useState } from "react";

import { useQuery } from "convex/react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { api } from "@/convex/_generated/api";

import type { Copy } from "./dictionary";

export const OTHER_PROVIDER = "other";

interface ProviderPickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  t: Copy;
}

export function ProviderPicker({ id, value, onChange, invalid, t }: ProviderPickerProps) {
  const [open, setOpen] = useState(false);
  const providers = useQuery(api.applicants.providers);
  const selected = value === OTHER_PROVIDER ? t.providerOther : providers?.find((p) => p.id === value)?.name;

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
          aria-invalid={invalid}
        >
          <span className={selected ? "truncate" : "truncate text-muted-foreground"}>{selected ?? t.providerPick}</span>
          <ChevronsUpDown className="size-4 opacity-50" aria-hidden="true" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t.provider}</DrawerTitle>
        </DrawerHeader>
        <Command className="px-2 pb-2">
          <CommandInput placeholder={t.providerSearch} />
          <CommandList>
            <CommandEmpty>{t.providerNone}</CommandEmpty>
            <CommandGroup>
              {providers?.map((provider) => (
                <CommandItem key={provider.id} value={provider.name} onSelect={() => pick(provider.id)}>
                  {provider.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {/* Outside the scrolling list so "Other" is always visible on a small phone. */}
        <div className="px-4 pb-6">
          <Button type="button" variant="outline" className="w-full" onClick={() => pick(OTHER_PROVIDER)}>
            {t.providerOther}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
