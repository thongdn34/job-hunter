"use client";

import { useEffect, type ReactNode } from "react";
import { Controller, FormProvider, useForm, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2Icon, Loader2Icon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CandidateProfile } from "@/domain/profile/schema";
import {
  ProfileFormSchema,
  WORKING_ARRANGEMENTS,
  WORKING_ARRANGEMENT_LABELS,
  formValuesToPayload,
  profileToFormValues,
  type ProfileFormValues,
  type ProfilePayload,
} from "@/domain/profile/form";
import { ExperiencesEditor } from "./components/ExperiencesEditor";
import { FormField, fieldA11y } from "./components/FormField";
import { SkillsEditor } from "./components/SkillsEditor";
import { TagInput } from "./components/TagInput";

const ARRANGEMENT_ITEMS = WORKING_ARRANGEMENTS.map((value) => ({ value, label: WORKING_ARRANGEMENT_LABELS[value] }));

export interface ProfileFormProps {
  profile: CandidateProfile;
  /**
   * Persists the payload. Resolve with the saved profile to re-baseline the form (clears the dirty
   * state); reject to keep the user's edits (the caller is responsible for surfacing the error).
   */
  onSubmit: (payload: ProfilePayload) => Promise<CandidateProfile | void>;
}

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id={`${id}-title`}>{title}</h2>
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}

/** Warns before leaving the page with unsaved edits. */
function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

function SaveBar({ onDiscard }: { onDiscard: () => void }) {
  const { isDirty, isSubmitting } = useFormState<ProfileFormValues>();
  useUnsavedChangesWarning(isDirty);

  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 z-10 -mx-4 border-t px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
          {isSubmitting ? (
            <>
              <Loader2Icon className="text-muted-foreground size-4 animate-spin" aria-hidden="true" />
              <span>Saving…</span>
            </>
          ) : isDirty ? (
            <>
              <span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />
              <span>Unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="text-muted-foreground">All changes saved</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onDiscard} disabled={!isDirty || isSubmitting}>
            <RotateCcwIcon aria-hidden="true" />
            Discard
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <SaveIcon aria-hidden="true" />
            )}
            Save profile
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProfileForm({ profile, onSubmit }: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: profileToFormValues(profile),
  });
  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = form;

  const submit = handleSubmit(
    async (values) => {
      try {
        const saved = await onSubmit(formValuesToPayload(values));
        reset(saved ? profileToFormValues(saved) : values);
      } catch {
        // Keep the edits; the caller reports the failure.
      }
    },
    () => {
      toast.error("Some fields need attention", { description: "Fix the highlighted fields and save again." });
    },
  );

  const headlineError = errors.headline?.message;
  const fullNameError = errors.fullName?.message;
  const yearsError = errors.yearsOfExperience?.message;
  const locationError = errors.location?.message;
  const rolesError =
    errors.targetRoles?.message ??
    (Array.isArray(errors.targetRoles) ? errors.targetRoles.find((e) => e?.message)?.message : undefined) ??
    errors.targetRoles?.root?.message;
  const arrangementError = errors.workingArrangement?.message;
  const summaryError = errors.summary?.message;

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate aria-label="Candidate profile" className="grid gap-6">
        <FormSection
          id="profile-basics"
          title="About you"
          description="Used for introductions, the tailored CV and match analysis."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="profile-headline" label="Headline" required error={headlineError} className="sm:col-span-2">
              <Input
                {...register("headline")}
                {...fieldA11y("profile-headline", { error: headlineError })}
                placeholder="e.g. Senior Software Engineer"
                maxLength={160}
              />
            </FormField>
            <FormField
              id="profile-full-name"
              label="Full name"
              description="Optional. Shown on the tailored CV."
              error={fullNameError}
            >
              <Input
                {...register("fullName")}
                {...fieldA11y("profile-full-name", { description: true, error: fullNameError })}
                autoComplete="name"
                maxLength={120}
              />
            </FormField>
            <FormField id="profile-years" label="Years of experience" required error={yearsError}>
              <Input
                {...register("yearsOfExperience", { valueAsNumber: true })}
                {...fieldA11y("profile-years", { error: yearsError })}
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                step={1}
              />
            </FormField>
            <FormField id="profile-location" label="Location" error={locationError}>
              <Input
                {...register("location")}
                {...fieldA11y("profile-location", { error: locationError })}
                placeholder="e.g. Ho Chi Minh City, Vietnam"
                autoComplete="address-level2"
                maxLength={120}
              />
            </FormField>
            <FormField
              id="profile-arrangement"
              labelId="profile-arrangement-label"
              label="Working arrangement"
              required
              error={arrangementError}
            >
              <Controller
                control={control}
                name="workingArrangement"
                render={({ field }) => (
                  <Select
                    items={ARRANGEMENT_ITEMS}
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) field.onChange(value);
                    }}
                  >
                    <SelectTrigger
                      ref={field.ref}
                      onBlur={field.onBlur}
                      className="w-full"
                      {...fieldA11y("profile-arrangement", { error: arrangementError })}
                      aria-labelledby="profile-arrangement-label"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ARRANGEMENT_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              id="profile-target-roles"
              label="Target roles"
              required
              description="Roles you are applying for. Press Enter or comma to add each one."
              error={rolesError}
              className="sm:col-span-2"
            >
              <Controller
                control={control}
                name="targetRoles"
                render={({ field }) => (
                  <TagInput
                    id="profile-target-roles"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    itemLabel="target role"
                    placeholder="e.g. Senior Frontend Engineer"
                    maxLength={120}
                    invalid={Boolean(rolesError)}
                    describedBy={["profile-target-roles-description", rolesError ? "profile-target-roles-error" : null]
                      .filter(Boolean)
                      .join(" ")}
                  />
                )}
              />
            </FormField>
            <FormField
              id="profile-summary"
              label="Professional summary"
              description="A few factual sentences about your experience and strengths."
              error={summaryError}
              className="sm:col-span-2"
            >
              <Textarea
                {...register("summary")}
                {...fieldA11y("profile-summary", { description: true, error: summaryError })}
                rows={4}
                maxLength={3000}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          id="profile-skills"
          title="Technical skills"
          description="Grouped by category. Only list what you can discuss confidently."
        >
          <SkillsEditor />
        </FormSection>

        <FormSection
          id="profile-experience"
          title="Work experience"
          description="Most relevant first — the order here is the order used in generated content."
        >
          <ExperiencesEditor />
        </FormSection>

        <SaveBar onDiscard={() => reset()} />
      </form>
    </FormProvider>
  );
}
