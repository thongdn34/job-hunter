"use client";

import { memo, useCallback, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  id: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  /** Noun used in accessible labels, e.g. "target role". */
  itemLabel: string;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  describedBy?: string;
  /** Callback ref for the inner input (e.g. react-hook-form's `field.ref`, used to focus on error). */
  inputRef?: (node: HTMLInputElement | null) => void;
  className?: string;
}

/** Splits pasted / typed text on commas, semicolons and new lines. */
export function splitTags(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Adds tags, ignoring blanks and case-insensitive duplicates. */
export function addTags(current: readonly string[], incoming: readonly string[], maxLength?: number): string[] {
  const seen = new Set(current.map((t) => t.toLowerCase()));
  const next = [...current];
  for (const raw of incoming) {
    const tag = maxLength ? raw.slice(0, maxLength) : raw;
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    next.push(tag);
  }
  return next;
}

const Tag = memo(function Tag({
  tag,
  index,
  itemLabel,
  onRemove,
}: {
  tag: string;
  index: number;
  itemLabel: string;
  onRemove: (index: number) => void;
}) {
  return (
    <li className="bg-secondary text-secondary-foreground inline-flex max-w-full items-center gap-1 rounded-md py-0.5 pr-0.5 pl-2 text-xs font-medium">
      <span className="truncate">{tag}</span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={`Remove ${itemLabel} ${tag}`}
        className="text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </button>
    </li>
  );
});

/**
 * Chip-style list input. Enter / comma adds the typed value, Backspace on an empty input removes
 * the last chip, pasted lists are split. The wrapped <input> carries `id` so a <label> can target it.
 */
export function TagInput({
  id,
  value,
  onChange,
  onBlur,
  itemLabel,
  placeholder,
  maxLength,
  invalid,
  describedBy,
  inputRef,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const hintId = useId();
  const localInputRef = useRef<HTMLInputElement | null>(null);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      localInputRef.current = node;
      inputRef?.(node);
    },
    [inputRef],
  );

  const commit = useCallback(
    (text: string) => {
      const tags = splitTags(text);
      if (tags.length > 0) {
        const next = addTags(value, tags, maxLength);
        if (next.length !== value.length) onChange(next);
      }
      setDraft("");
    },
    [value, onChange, maxLength],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
      localInputRef.current?.focus();
    },
    [value, onChange],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (/[,;\n]/.test(text)) {
      event.preventDefault();
      commit(draft + text);
    }
  }

  return (
    <div
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border bg-transparent px-1.5 py-1 transition-colors focus-within:ring-3",
        invalid && "border-destructive ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40 ring-3",
        className,
      )}
    >
      {value.length > 0 ? (
        <ul className="contents" aria-label={`${itemLabel}s`}>
          {value.map((tag, index) => (
            <Tag key={`${tag}-${index}`} tag={tag} index={index} itemLabel={itemLabel} onRemove={handleRemove} />
          ))}
        </ul>
      ) : null}
      <input
        ref={setInputRef}
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (draft.trim()) commit(draft);
          onBlur?.();
        }}
        placeholder={value.length === 0 ? placeholder : `Add ${itemLabel}…`}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={[hintId, describedBy].filter(Boolean).join(" ")}
        autoComplete="off"
        className="placeholder:text-muted-foreground h-6 min-w-32 flex-1 bg-transparent px-1 text-base outline-none md:text-sm"
      />
      <span id={hintId} className="sr-only">
        Press Enter or comma to add. Backspace removes the last {itemLabel}.
      </span>
    </div>
  );
}
