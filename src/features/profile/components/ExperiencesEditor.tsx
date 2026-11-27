"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Controller, useFieldArray, useFormContext, useFormState, useWatch } from "react-hook-form";
import { ArrowDownIcon, ArrowUpIcon, BriefcaseIcon, EyeOffIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { emptyExperience, type ProfileFormValues } from "@/domain/profile/form";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./ConfirmDialog";
import { FormField, fieldA11y } from "./FormField";
import { StringListEditor } from "./StringListEditor";
import { TagInput } from "./TagInput";

type Direction = "up" | "down";

interface ExperienceItemProps {
  index: number;
  count: number;
  onMove: (index: number, direction: Direction) => void;
  onRemove: (index: number) => void;
}

const ExperienceItem = memo(function ExperienceItem({ index, count, onMove, onRemove }: ExperienceItemProps) {
  const { control, register } = useFormContext<ProfileFormValues>();
  const base = `experiences.${index}` as const;
  const company = useWatch({ control, name: `${base}.company` });
  const included = useWatch({ control, name: `${base}.includeInGeneration` });
  const { errors } = useFormState({ control, name: base });
  const itemErrors = errors.experiences?.[index];

  const idPrefix = `experience-${index}`;
  const displayName = company?.trim() || "New experience";
  const headingId = `${idPrefix}-heading`;
  const includeLabelId = `${idPrefix}-include-label`;
  const includeHelpId = `${idPrefix}-include-help`;

  const companyError = itemErrors?.company?.message;
  const roleError = itemErrors?.role?.message;
  const periodError = itemErrors?.period?.message;
  const summaryError = itemErrors?.summary?.message;
  const highlightErrors = Array.isArray(itemErrors?.highlights)
    ? itemErrors.highlights.map((e) => e?.message)
    : undefined;
  const technologiesError =
    itemErrors?.technologies?.message ??
    (Array.isArray(itemErrors?.technologies) ? itemErrors.technologies.find((e) => e?.message)?.message : undefined);

  return (
    <li
      aria-labelledby={headingId}
      className={cn(
        "bg-card text-card-foreground grid gap-4 rounded-xl border p-4",
        !included && "bg-muted/30 border-dashed",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
          >
            {index + 1}
          </span>
          <h3 id={headingId} className="truncate font-medium">
            <span className="sr-only">Experience {index + 1}: </span>
            {displayName}
          </h3>
          {!included ? (
            <Badge variant="outline" className="gap-1">
              <EyeOffIcon aria-hidden="true" />
              Excluded from generation
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            id={`${idPrefix}-move-up`}
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            onClick={() => onMove(index, "up")}
            aria-label={`Move ${displayName} up`}
          >
            <ArrowUpIcon aria-hidden="true" />
          </Button>
          <Button
            id={`${idPrefix}-move-down`}
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === count - 1}
            onClick={() => onMove(index, "down")}
            aria-label={`Move ${displayName} down`}
          >
            <ArrowDownIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${displayName}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id={`${idPrefix}-company`} label="Company" required error={companyError}>
          <Input
            {...register(`${base}.company`)}
            {...fieldA11y(`${idPrefix}-company`, { error: companyError })}
            autoComplete="organization"
          />
        </FormField>
        <FormField id={`${idPrefix}-role`} label="Role" error={roleError}>
          <Input
            {...register(`${base}.role`)}
            {...fieldA11y(`${idPrefix}-role`, { error: roleError })}
            placeholder="e.g. Senior Frontend Engineer"
            autoComplete="organization-title"
          />
        </FormField>
        <FormField id={`${idPrefix}-period`} label="Period" error={periodError}>
          <Input
            {...register(`${base}.period`)}
            {...fieldA11y(`${idPrefix}-period`, { error: periodError })}
            placeholder="e.g. 2022 – 2024"
          />
        </FormField>
      </div>

      <FormField
        id={`${idPrefix}-summary`}
        label="Summary"
        description="What the product or team was. Leave out anything you can't stand behind in an interview."
        error={summaryError}
      >
        <Textarea
          {...register(`${base}.summary`)}
          {...fieldA11y(`${idPrefix}-summary`, { description: true, error: summaryError })}
          rows={2}
        />
      </FormField>

      <div className="grid gap-1.5">
        <span id={`${idPrefix}-highlights-label`} className="text-sm leading-none font-medium">
          Highlights
        </span>
        <p id={`${idPrefix}-highlights-description`} className="text-muted-foreground text-xs">
          Concrete things you did. Only include real outcomes — metrics are never invented for you.
        </p>
        <Controller
          control={control}
          name={`${base}.highlights`}
          render={({ field }) => (
            <StringListEditor
              id={`${idPrefix}-highlights`}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              itemLabel="Highlight"
              context={`for ${displayName}`}
              errors={highlightErrors}
              maxLength={400}
              describedBy={`${idPrefix}-highlights-description`}
            />
          )}
        />
      </div>

      <FormField id={`${idPrefix}-technologies`} label="Technologies" error={technologiesError}>
        <Controller
          control={control}
          name={`${base}.technologies`}
          render={({ field }) => (
            <TagInput
              id={`${idPrefix}-technologies`}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              itemLabel="technology"
              placeholder="Type a technology and press Enter"
              maxLength={60}
              invalid={Boolean(technologiesError)}
              describedBy={technologiesError ? `${idPrefix}-technologies-error` : undefined}
            />
          )}
        />
      </FormField>

      <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
        <Controller
          control={control}
          name={`${base}.includeInGeneration`}
          render={({ field }) => (
            <Switch
              id={`${idPrefix}-include`}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              onBlur={field.onBlur}
              aria-labelledby={includeLabelId}
              aria-describedby={includeHelpId}
              className="mt-0.5"
            />
          )}
        />
        <div className="grid gap-1">
          <label id={includeLabelId} htmlFor={`${idPrefix}-include`} className="text-sm leading-none font-medium">
            Include in generated content
          </label>
          <p id={includeHelpId} className="text-muted-foreground text-xs">
            Turn off to keep this role on your profile but leave it out of generated introductions, interview answers
            and tailored CVs (for example, a short or sensitive role such as Elfie). Excluded roles are never mentioned
            in generated content.
          </p>
        </div>
      </div>
    </li>
  );
});

/** Work experiences: add, edit, reorder (up/down) and remove with confirmation. */
export function ExperiencesEditor() {
  const { control, getValues } = useFormContext<ProfileFormValues>();
  const { fields, append, move, remove } = useFieldArray({ control, name: "experiences" });
  // Target is kept after closing so the dialog text doesn't flicker during its exit animation.
  const [removeTarget, setRemoveTarget] = useState<{ index: number; name: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const nameAt = useCallback(
    (index: number) => getValues(`experiences.${index}.company`)?.trim() || "New experience",
    [getValues],
  );

  const handleMove = useCallback(
    (index: number, direction: Direction) => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= getValues("experiences").length) return;
      const name = nameAt(index);
      move(index, target);
      setAnnouncement(`${name} moved to position ${target + 1}.`);
      // Keep keyboard focus on the moved item; fall back to the other arrow at the edges.
      requestAnimationFrame(() => {
        const preferred = document.getElementById(`experience-${target}-move-${direction}`) as HTMLButtonElement | null;
        const other = document.getElementById(
          `experience-${target}-move-${direction === "up" ? "down" : "up"}`,
        ) as HTMLButtonElement | null;
        (preferred && !preferred.disabled ? preferred : other)?.focus();
      });
    },
    [getValues, move, nameAt],
  );

  const handleRequestRemove = useCallback(
    (index: number) => {
      setRemoveTarget({ index, name: nameAt(index) });
      setConfirmOpen(true);
    },
    [nameAt],
  );

  function confirmRemove() {
    if (!removeTarget) return;
    remove(removeTarget.index);
    setAnnouncement(`${removeTarget.name} removed. Save the profile to keep this change.`);
  }

  return (
    <div className="grid gap-4">
      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center">
          <BriefcaseIcon className="text-muted-foreground size-6" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">No work experience yet.</p>
        </div>
      ) : (
        <ol className="grid gap-4" aria-label="Work experiences">
          {fields.map((field, index) => (
            <ExperienceItem
              key={field.id}
              index={index}
              count={fields.length}
              onMove={handleMove}
              onRemove={handleRequestRemove}
            />
          ))}
        </ol>
      )}
      <div>
        <Button ref={addButtonRef} type="button" variant="outline" onClick={() => append(emptyExperience())}>
          <PlusIcon aria-hidden="true" />
          Add experience
        </Button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this experience?"
        description={
          removeTarget ? (
            <>
              <strong className="text-foreground font-medium">{removeTarget.name}</strong> and its highlights will be
              removed from your profile when you save. To keep it on your profile but out of generated content, turn off
              &ldquo;Include in generated content&rdquo; instead.
            </>
          ) : null
        }
        confirmLabel="Remove experience"
        onConfirm={confirmRemove}
        finalFocus={addButtonRef}
      />
    </div>
  );
}
