"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  id: string;
  label: string;
  hint?: string;
  isSuggestion?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  disabled = false,
  emptyMessage = "Nenhum resultado encontrado.",
  className,
}: SearchableSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matching = normalized
      ? options.filter((option) => option.label.toLowerCase().includes(normalized))
      : options;

    const suggestions = matching.filter((option) => option.isSuggestion);
    const suggestionIds = new Set(suggestions.map((option) => option.id));
    const others = matching
      .filter((option) => !suggestionIds.has(option.id))
      .sort((left, right) => left.label.localeCompare(right.label, "pt-PT"));

    return [...suggestions, ...others];
  }, [options, query]);

  function updateDropdownPosition() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
      zIndex: 80,
    });
  }

  function handleOpen() {
    if (disabled) {
      return;
    }

    updateDropdownPosition();
    setOpen(true);
  }

  function handleSelect(optionId: string) {
    onChange(optionId);
    setQuery("");
    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) {
        return;
      }

      const listbox = document.getElementById(listboxId);
      if (listbox?.contains(target)) {
        return;
      }

      setOpen(false);
      setQuery("");
    }

    function handleReposition() {
      updateDropdownPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [listboxId, open]);

  const inputValue = open ? query : (selectedOption?.label ?? "");

  const dropdown =
    open && typeof document !== "undefined"
      ? createPortal(
          <ul
            id={listboxId}
            role="listbox"
            style={dropdownStyle}
            className="max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-elevated"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</li>
            ) : (
              filteredOptions.map((option, index) => {
                const showSuggestionHeader =
                  option.isSuggestion && (index === 0 || !filteredOptions[index - 1]?.isSuggestion);
                const showOthersHeader =
                  !option.isSuggestion &&
                  index > 0 &&
                  filteredOptions[index - 1]?.isSuggestion === true;

                return (
                  <li key={option.id}>
                    {showSuggestionHeader ? (
                      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Sugestões
                      </p>
                    ) : null}
                    {showOthersHeader ? (
                      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Todos
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === option.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(option.id)}
                      className={cn(
                        "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                        value === option.id && "bg-primary/10 text-foreground",
                      )}
                    >
                      <span className="font-medium">{option.label}</span>
                      {option.hint ? (
                        <span className="text-xs text-muted-foreground">{option.hint}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            handleOpen();
          }}
          onFocus={() => {
            setQuery(selectedOption?.label ?? "");
            handleOpen();
          }}
          className="h-9 rounded-lg pr-8"
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {dropdown}
    </div>
  );
}
