import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Coordinator } from '@/types';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface CoordinatorComboboxProps {
  coordinators: Coordinator[];
  /** Selected coordinator id as a string, or '' for unassigned. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Adds an explicit "Unassigned" option at the top of the list. */
  allowUnassigned?: boolean;
  id?: string;
}

const UNASSIGNED = '__unassigned__';

/**
 * Searchable coordinator picker (Command inside a Popover). Preferred over a
 * plain Select because the coordinator list grows unbounded and staff look
 * people up by name or location.
 */
export default function CoordinatorCombobox({
  coordinators,
  value,
  onChange,
  placeholder = 'Select coordinator',
  allowUnassigned = true,
  id,
}: CoordinatorComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = coordinators.find((c) => String(c.id) === value);
  const label = selected
    ? `${selected.name}${selected.location ? ` (${selected.location})` : ''}`
    : allowUnassigned && value === ''
      ? 'Unassigned'
      : placeholder;

  const select = (next: string) => {
    onChange(next === UNASSIGNED ? '' : next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && value === '' && 'text-muted-foreground')}>{label}</span>
          <ChevronsUpDown className="shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search coordinators…" />
          <CommandList>
            <CommandEmpty>No coordinator found.</CommandEmpty>
            <CommandGroup>
              {allowUnassigned && (
                <CommandItem value="Unassigned" onSelect={() => select(UNASSIGNED)}>
                  <Check className={cn('size-4', value === '' ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                  Unassigned
                </CommandItem>
              )}
              {coordinators.map((c) => (
                <CommandItem
                  key={c.id}
                  // cmdk filters on this string, so include location for search.
                  value={`${c.name} ${c.location ?? ''} ${c.employee_code ?? ''}`}
                  onSelect={() => select(String(c.id))}
                >
                  <Check
                    className={cn('size-4', value === String(c.id) ? 'opacity-100' : 'opacity-0')}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {c.location && (
                    <span className="shrink-0 text-xs text-muted-foreground">{c.location}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
