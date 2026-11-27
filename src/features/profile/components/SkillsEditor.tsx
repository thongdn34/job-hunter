"use client";

import { memo, useCallback, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SKILL_CATEGORIES, type SkillCategory } from "@/domain/profile/schema";
import {
  PROFICIENCY_LABELS,
  SKILL_CATEGORY_LABELS,
  type ProfileFormValues,
  type SkillFormValues,
} from "@/domain/profile/form";
import { cn } from "@/lib/utils";
import { FieldError } from "./FormField";

type Proficiency = SkillFormValues["proficiency"];

const CATEGORY_ITEMS = SKILL_CATEGORIES.map((c) => ({ value: c, label: SKILL_CATEGORY_LABELS[c] }));
const PROFICIENCY_ITEMS = (["production", "familiar"] as const).map((p) => ({
  value: p,
  label: PROFICIENCY_LABELS[p],
}));

interface IndexedSkill {
  skill: SkillFormValues;
  index: number;
}

/** Groups skills by category, preserving their relative order. */
export function groupSkills(skills: readonly SkillFormValues[]): Map<SkillCategory, IndexedSkill[]> {
  const groups = new Map<SkillCategory, IndexedSkill[]>();
  skills.forEach((skill, index) => {
    const list = groups.get(skill.category) ?? [];
    list.push({ skill, index });
    groups.set(skill.category, list);
  });
  return groups;
}

const SkillChip = memo(function SkillChip({
  name,
  proficiency,
  index,
  onToggle,
  onRemove,
}: {
  name: string;
  proficiency: Proficiency;
  index: number;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const other: Proficiency = proficiency === "production" ? "familiar" : "production";
  return (
    <li
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border py-0.5 pr-0.5 pl-2 text-xs",
        proficiency === "production"
          ? "border-border bg-secondary text-secondary-foreground"
          : "bg-background border-dashed",
      )}
    >
      <span className="font-medium">{name}</span>
      <button
        type="button"
        onClick={() => onToggle(index)}
        aria-label={`${name}: ${PROFICIENCY_LABELS[proficiency]}. Change to ${PROFICIENCY_LABELS[other]}`}
        className="text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:ring-ring ml-1 rounded-sm px-1 py-0.5 text-[0.7rem] outline-none focus-visible:ring-2"
      >
        {PROFICIENCY_LABELS[proficiency]}
      </button>
      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={`Remove skill ${name}`}
        className="text-muted-foreground hover:bg-background/60 hover:text-destructive focus-visible:ring-ring inline-flex size-5 items-center justify-center rounded-sm outline-none focus-visible:ring-2"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </button>
    </li>
  );
});

/**
 * Skills grouped by category. Each chip toggles proficiency (production = used at work,
 * familiar = side projects / learning) and can be removed.
 */
export function SkillsEditor() {
  const { control, getValues, setValue } = useFormContext<ProfileFormValues>();
  const skills = useWatch({ control, name: "skills" });
  const groups = useMemo(() => groupSkills(skills), [skills]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<SkillCategory>("frontend");
  const [proficiency, setProficiency] = useState<Proficiency>("production");
  const [error, setError] = useState<string | undefined>();

  const write = useCallback(
    (next: SkillFormValues[]) => setValue("skills", next, { shouldDirty: true, shouldTouch: true }),
    [setValue],
  );

  const handleToggle = useCallback(
    (index: number) => {
      write(
        getValues("skills").map((s, i) =>
          i === index ? { ...s, proficiency: s.proficiency === "production" ? "familiar" : "production" } : s,
        ),
      );
    },
    [getValues, write],
  );

  const handleRemove = useCallback(
    (index: number) => {
      write(getValues("skills").filter((_, i) => i !== index));
      // The removed chip held focus; return it to the add-skill input.
      document.getElementById("new-skill-name")?.focus();
    },
    [getValues, write],
  );

  function addSkill(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a skill name");
      return;
    }
    if (trimmed.length > 80) {
      setError("Skill names must be at most 80 characters");
      return;
    }
    const current = getValues("skills");
    const existing = current.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setError(`${existing.name} is already listed under ${SKILL_CATEGORY_LABELS[existing.category]}`);
      return;
    }
    write([...current, { name: trimmed, category, proficiency }]);
    setName("");
    setError(undefined);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Prevent Enter from submitting the whole profile form.
    if (event.key === "Enter" && !event.nativeEvent.isComposing) addSkill(event);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 rounded-lg border border-dashed p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="new-skill-name">Skill</Label>
            <Input
              id="new-skill-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(undefined);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. WebSockets"
              maxLength={80}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "new-skill-error" : undefined}
            />
          </div>
          <div className="grid gap-1.5">
            <span id="new-skill-category-label" className="text-sm leading-none font-medium">
              Category
            </span>
            <Select items={CATEGORY_ITEMS} value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger className="w-full" aria-labelledby="new-skill-category-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <span id="new-skill-proficiency-label" className="text-sm leading-none font-medium">
              Proficiency
            </span>
            <Select items={PROFICIENCY_ITEMS} value={proficiency} onValueChange={(v) => v && setProficiency(v)}>
              <SelectTrigger className="w-full" aria-labelledby="new-skill-proficiency-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFICIENCY_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={() => addSkill()}>
            <PlusIcon aria-hidden="true" />
            Add skill
          </Button>
        </div>
        <FieldError id="new-skill-error" message={error} />
        <p className="text-muted-foreground text-xs">
          <strong className="text-foreground font-medium">Production</strong> = used at work.{" "}
          <strong className="text-foreground font-medium">Familiar</strong> = side projects or learning. Select a
          chip&apos;s proficiency to change it — generated answers never claim production experience for familiar
          skills.
        </p>
      </div>

      {skills.length === 0 ? (
        <p className="text-muted-foreground text-sm">No skills yet. Add the technologies you have actually used.</p>
      ) : (
        <div className="grid gap-4">
          {SKILL_CATEGORIES.map((cat) => {
            const items = groups.get(cat);
            if (!items?.length) return null;
            const headingId = `skills-${cat}-heading`;
            return (
              <section key={cat} aria-labelledby={headingId} className="grid gap-2">
                <h3 id={headingId} className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {SKILL_CATEGORY_LABELS[cat]} <span className="font-normal">({items.length})</span>
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {items.map(({ skill, index }) => (
                    <SkillChip
                      key={skill.name}
                      name={skill.name}
                      proficiency={skill.proficiency}
                      index={index}
                      onToggle={handleToggle}
                      onRemove={handleRemove}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
