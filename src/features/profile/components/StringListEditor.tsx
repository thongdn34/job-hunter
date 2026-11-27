"use client";

import { useEffect, useRef, type Ref } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "./FormField";

interface StringListEditorProps {
  id: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  /** Singular noun, e.g. "Highlight". */
  itemLabel: string;
  /** Context appended to accessible names, e.g. "for Persefoni". */
  context?: string;
  errors?: readonly (string | undefined)[];
  maxLength?: number;
  placeholder?: string;
  describedBy?: string;
  /** Receives the first textarea (used by react-hook-form to focus on error). */
  inputRef?: Ref<HTMLTextAreaElement>;
}

/** Editable ordered list of short texts (e.g. achievement highlights). */
export function StringListEditor({
  id,
  value,
  onChange,
  onBlur,
  itemLabel,
  context,
  errors,
  maxLength,
  placeholder,
  describedBy,
  inputRef,
}: StringListEditorProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<number | "add" | null>(null);

  // Move focus after the list re-renders (new item added / item removed).
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === "add") {
      addButtonRef.current?.focus();
      return;
    }
    listRef.current?.querySelectorAll<HTMLTextAreaElement>("textarea")[target]?.focus();
  });

  const suffix = context ? ` ${context}` : "";

  function add() {
    pendingFocus.current = value.length;
    onChange([...value, ""]);
  }

  function remove(index: number) {
    pendingFocus.current = value.length > 1 ? Math.max(0, index - 1) : "add";
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-2">
      {value.length > 0 ? (
        <ol ref={listRef} className="grid gap-2" aria-label={`${itemLabel}s${suffix}`}>
          {value.map((item, index) => {
            const itemId = `${id}-${index}`;
            const error = errors?.[index];
            return (
              // Index keys are fine: each textarea is fully controlled by `value`.
              <li key={index} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="text-muted-foreground mt-2 w-5 shrink-0 text-right text-xs tabular-nums"
                >
                  {index + 1}.
                </span>
                <div className="grid flex-1 gap-1">
                  <Textarea
                    ref={index === 0 ? inputRef : undefined}
                    id={itemId}
                    rows={2}
                    value={item}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    onChange={(e) => onChange(value.map((v, i) => (i === index ? e.target.value : v)))}
                    onBlur={onBlur}
                    aria-label={`${itemLabel} ${index + 1}${suffix}`}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                      [error ? `${itemId}-error` : null, describedBy].filter(Boolean).join(" ") || undefined
                    }
                    className="min-h-10"
                  />
                  <FieldError id={`${itemId}-error`} message={error} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}${suffix}`}
                  className="text-muted-foreground hover:text-destructive mt-1"
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-muted-foreground text-xs">No {itemLabel.toLowerCase()}s yet.</p>
      )}
      <div>
        <Button ref={addButtonRef} type="button" variant="outline" size="sm" onClick={add}>
          <PlusIcon aria-hidden="true" />
          Add {itemLabel.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}
