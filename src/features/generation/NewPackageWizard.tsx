"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  Loader2,
  Sparkles,
  TextCursorInput,
  Wand2,
} from "lucide-react";
import type { NormalizedJd } from "@/domain/jd/schema";
import {
  EMPTY_NEW_PACKAGE_FORM,
  JD_INPUT_MODES,
  MIN_PASTED_JD_LENGTH,
  NewPackageFormSchema,
  toCreatePackageRequest,
  type JdInputMode,
  type NewPackageFormInput,
  type NewPackageFormValues,
} from "@/domain/jd/wizard";
import { MAX_JD_TEXT_LENGTH } from "@/domain/jd/normalize";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ApiError, createPackage, errorMessage, extractJd } from "./api";
import { AiSetupHelp, AiStatusPanel, useAiStatus } from "./AiStatusPanel";
import { JdPreview } from "./JdPreview";
import { ProfileSummaryCard } from "./ProfileSummaryCard";

const STEPS = [
  { id: "job", title: "Job description", description: "Company, role and the job posting." },
  { id: "profile", title: "Your profile", description: "What the generator knows about you." },
  { id: "generate", title: "Generate", description: "Review and start the Run #10 package." },
] as const;

const STEP_ONE_FIELDS = ["mode", "companyName", "jobTitle", "url", "rawText"] as const;

type Form = { control: Control<NewPackageFormInput, unknown, NewPackageFormValues> };

function isMode(value: unknown): value is JdInputMode {
  return typeof value === "string" && (JD_INPUT_MODES as readonly string[]).includes(value);
}

/** Three-step wizard: job description -> profile review -> generate. */
export function NewPackageWizard() {
  const router = useRouter();
  const ids = useId();
  const [step, setStep] = useState(0);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingOnStep = useRef(false);
  const pendingTextFocus = useRef(false);

  const { control, register, setValue, getValues, trigger, handleSubmit, setFocus, clearErrors, formState } = useForm<
    NewPackageFormInput,
    unknown,
    NewPackageFormValues
  >({
    resolver: zodResolver(NewPackageFormSchema),
    defaultValues: EMPTY_NEW_PACKAGE_FORM,
    mode: "onTouched",
  });
  const { errors } = formState;
  const mode = useWatch({ control, name: "mode" });

  // Move focus after the DOM for the new step / tab exists.
  useEffect(() => {
    if (pendingTextFocus.current) {
      pendingTextFocus.current = false;
      focusHeadingOnStep.current = false;
      setFocus("rawText");
      return;
    }
    if (focusHeadingOnStep.current) {
      focusHeadingOnStep.current = false;
      headingRef.current?.focus();
    }
  }, [step, mode, setFocus]);

  function goToStep(next: number) {
    focusHeadingOnStep.current = true;
    setStep(next);
  }

  /** Switches to the paste tab on step 1 and focuses the textarea. */
  function switchToPaste(reason: string | null) {
    setFallbackReason(reason);
    clearErrors("url");
    if (getValues("mode") === "paste" && step === 0) {
      setFocus("rawText");
      return;
    }
    pendingTextFocus.current = true;
    setValue("mode", "paste");
    setStep(0);
  }

  const extract = useMutation({
    mutationFn: extractJd,
    onSuccess: (jd) => {
      setFallbackReason(null);
      if (!getValues("companyName").trim() && jd.companyName) {
        setValue("companyName", jd.companyName.slice(0, 120), { shouldValidate: true });
      }
      if (!getValues("jobTitle").trim() && jd.jobTitle) {
        setValue("jobTitle", jd.jobTitle.slice(0, 160), { shouldValidate: true });
      }
    },
    onError: (error) => switchToPaste(errorMessage(error, "We couldn't read that page.")),
  });

  const create = useMutation({
    mutationFn: createPackage,
    onSuccess: ({ slug }) => {
      toast.success("Generation started", { description: "Sections will appear as soon as they are ready." });
      router.push(`/packages/${encodeURIComponent(slug)}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "EXTRACTION_FAILED") {
        toast.error("Couldn't read the job page", { description: "Paste the job description to continue." });
        switchToPaste(error.message);
      }
    },
  });

  async function fetchPreview() {
    const valid = await trigger("url", { shouldFocus: true });
    if (!valid) return;
    setFallbackReason(null);
    extract.mutate(getValues("url").trim());
  }

  function editExtractedText(jd: NormalizedJd) {
    setValue("rawText", jd.text.slice(0, MAX_JD_TEXT_LENGTH), { shouldDirty: true });
    switchToPaste(null);
  }

  async function goNext() {
    if (step === 0) {
      const valid = await trigger(STEP_ONE_FIELDS, { shouldFocus: true });
      if (!valid) return;
    }
    goToStep(Math.min(step + 1, STEPS.length - 1));
  }

  const onValid = (values: NewPackageFormValues) => create.mutate(toCreatePackageRequest(values));
  const onInvalid = () => goToStep(0);

  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      void goNext();
      return;
    }
    void handleSubmit(onValid, onInvalid)(event);
  }

  const current = STEPS[step]!;
  const headingId = `${ids}-step-heading`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">New Run #10 package</h1>
        <p className="text-muted-foreground text-sm">
          Turn a job description into a complete, personalized interview-preparation package.
        </p>
      </header>

      <StepIndicator step={step} onSelect={goToStep} />

      <form noValidate onSubmit={onFormSubmit} aria-labelledby={headingId} className="mt-6 space-y-6">
        <section aria-labelledby={headingId} className="space-y-5">
          <div>
            <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
              <span className="sr-only">
                Step {step + 1} of {STEPS.length}:{" "}
              </span>
              {current.title}
            </h2>
            <p className="text-muted-foreground text-sm">{current.description}</p>
          </div>

          {step === 0 ? (
            <JobStep
              control={control}
              register={register}
              errors={errors}
              mode={mode}
              fallbackReason={fallbackReason}
              onModeChange={(next) => {
                setValue("mode", next);
                clearErrors(["url", "rawText"]);
              }}
              onFetchPreview={() => void fetchPreview()}
              extracting={extract.isPending}
              extracted={extract.data}
              extractedUrl={extract.variables}
              onEditExtractedText={editExtractedText}
            />
          ) : null}

          {step === 1 ? <ProfileSummaryCard /> : null}

          {step === 2 ? <GenerateStep control={control} error={create.error} /> : null}
        </section>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          {step === 0 ? (
            <Link href="/" className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </Link>
          ) : (
            <Button type="button" variant="outline" onClick={() => goToStep(step - 1)} disabled={create.isPending}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="submit" size="lg">
              Next
              <ArrowRight aria-hidden />
            </Button>
          ) : (
            <GenerateButton pending={create.isPending || create.isSuccess} />
          )}
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StepIndicator({ step, onSelect }: { step: number; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="Wizard progress">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s, index) => {
          const done = index < step;
          const active = index === step;
          const content = (
            <>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "text-muted-foreground",
                )}
                aria-hidden
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className={cn("truncate text-sm", active ? "font-medium" : "text-muted-foreground")}>
                {s.title}
                {done ? <span className="sr-only"> (completed)</span> : null}
              </span>
            </>
          );
          return (
            <li key={s.id} aria-current={active ? "step" : undefined} className="min-w-0">
              <div className={cn("h-1 rounded-full", done || active ? "bg-primary" : "bg-muted")} aria-hidden />
              {done ? (
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="focus-visible:ring-ring/50 mt-2 flex w-full min-w-0 items-center gap-2 rounded-md text-left outline-none hover:underline focus-visible:ring-3"
                >
                  {content}
                </button>
              ) : (
                <div className="mt-2 flex min-w-0 items-center gap-2">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-destructive flex items-center gap-1.5 text-sm">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

interface JobStepProps extends Form {
  register: UseFormRegister<NewPackageFormInput>;
  errors: FieldErrors<NewPackageFormInput>;
  mode: JdInputMode;
  fallbackReason: string | null;
  onModeChange: (mode: JdInputMode) => void;
  onFetchPreview: () => void;
  extracting: boolean;
  extracted: NormalizedJd | undefined;
  extractedUrl: string | undefined;
  onEditExtractedText: (jd: NormalizedJd) => void;
}

function JobStep({
  control,
  register,
  errors,
  mode,
  fallbackReason,
  onModeChange,
  onFetchPreview,
  extracting,
  extracted,
  extractedUrl,
  onEditExtractedText,
}: JobStepProps) {
  const id = useId();
  const companyErr = `${id}-company-error`;
  const titleErr = `${id}-title-error`;
  const urlHint = `${id}-url-hint`;
  const urlErr = `${id}-url-error`;
  const textHint = `${id}-text-hint`;
  const textErr = `${id}-text-error`;
  const describedBy = (...ids: Array<string | false | undefined>) => ids.filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-company`}>
            Company name{" "}
            <span aria-hidden className="text-destructive">
              *
            </span>
          </Label>
          <Input
            id={`${id}-company`}
            autoComplete="organization"
            aria-required="true"
            aria-invalid={errors.companyName ? true : undefined}
            aria-describedby={describedBy(errors.companyName && companyErr)}
            placeholder="e.g. ISB Vietnam"
            {...register("companyName")}
          />
          <FieldError id={companyErr} message={errors.companyName?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-title`}>
            Job title <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id={`${id}-title`}
            autoComplete="organization-title"
            aria-invalid={errors.jobTitle ? true : undefined}
            aria-describedby={describedBy(errors.jobTitle && titleErr)}
            placeholder="e.g. Senior Front-End Developer"
            {...register("jobTitle")}
          />
          <FieldError id={titleErr} message={errors.jobTitle?.message} />
        </div>
      </div>

      {fallbackReason ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>We couldn&apos;t read the job page</AlertTitle>
          <AlertDescription>
            {fallbackReason} Paste the job description below instead — copy it from the posting in your browser.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={mode} onValueChange={(value) => isMode(value) && onModeChange(value)}>
        <TabsList aria-label="How to provide the job description" className="w-full sm:w-fit">
          <TabsTrigger value="url">
            <Link2 aria-hidden />
            Job URL
          </TabsTrigger>
          <TabsTrigger value="paste">
            <TextCursorInput aria-hidden />
            Paste description
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-url`}>Job posting URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`${id}-url`}
                type="url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder="https://www.linkedin.com/jobs/view/…"
                aria-invalid={errors.url ? true : undefined}
                aria-describedby={describedBy(urlHint, errors.url && urlErr)}
                {...register("url")}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onFetchPreview}
                disabled={extracting}
                aria-busy={extracting || undefined}
                className="sm:w-auto"
              >
                {extracting ? <Loader2 className="animate-spin" aria-hidden /> : <Wand2 aria-hidden />}
                {extracting ? "Fetching…" : "Fetch & preview"}
              </Button>
            </div>
            <p id={urlHint} className="text-muted-foreground text-xs">
              LinkedIn, ITviec or a company career page. The page is read as plain data — nothing on it is executed.
            </p>
            <FieldError id={urlErr} message={errors.url?.message} />
          </div>
          <ExtractedPreview
            control={control}
            extracted={extracted}
            extractedUrl={extractedUrl}
            onEditAsText={onEditExtractedText}
          />
        </TabsContent>

        <TabsContent value="paste" className="space-y-1.5 pt-2">
          <Label htmlFor={`${id}-text`}>Job description</Label>
          <Textarea
            id={`${id}-text`}
            rows={12}
            className="max-h-[60vh] min-h-48 font-normal"
            placeholder={"Paste the full job description: responsibilities, requirements, benefits…"}
            aria-invalid={errors.rawText ? true : undefined}
            aria-describedby={describedBy(textHint, errors.rawText && textErr)}
            {...register("rawText")}
          />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p id={textHint} className="text-muted-foreground text-xs">
              At least {MIN_PASTED_JD_LENGTH} characters. English and Vietnamese are both fine. If you also entered a
              URL, it is kept as the source link.
            </p>
            <CharCount control={control} />
          </div>
          <FieldError id={textErr} message={errors.rawText?.message} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CharCount({ control }: Form) {
  const rawText = useWatch({ control, name: "rawText" });
  const length = rawText.trim().length;
  const enough = length >= MIN_PASTED_JD_LENGTH;
  return (
    <p className={cn("text-xs tabular-nums", enough ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300")}>
      {length.toLocaleString("en-US")} characters
      {!enough ? <span className="sr-only"> (minimum {MIN_PASTED_JD_LENGTH})</span> : null}
    </p>
  );
}

function ExtractedPreview({
  control,
  extracted,
  extractedUrl,
  onEditAsText,
}: Form & {
  extracted: NormalizedJd | undefined;
  extractedUrl: string | undefined;
  onEditAsText: (jd: NormalizedJd) => void;
}) {
  const url = useWatch({ control, name: "url" });
  if (!extracted) return null;
  const isCurrent = extractedUrl === url.trim();
  return (
    <div className="space-y-2">
      <p role="status" className="sr-only">
        {isCurrent ? `Job description extracted with ${extracted.sections.length} sections.` : ""}
      </p>
      {isCurrent ? (
        <JdPreview jd={extracted} onEditAsText={() => onEditAsText(extracted)} />
      ) : (
        <p className="text-muted-foreground text-sm">The URL changed — fetch again to preview the new page.</p>
      )}
    </div>
  );
}

function GenerateStep({ control, error }: Form & { error: Error | null }) {
  const values = useWatch({ control });
  const source =
    values.mode === "paste"
      ? `Pasted text (${(values.rawText ?? "").trim().length.toLocaleString("en-US")} characters)`
      : values.url || "—";

  return (
    <div className="space-y-5">
      <dl className="bg-card grid gap-x-6 gap-y-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-muted-foreground text-xs">Company</dt>
          <dd className="font-medium break-words">{values.companyName}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground text-xs">Job title</dt>
          <dd className="break-words">
            {values.jobTitle || (
              <span className="text-muted-foreground">Detected from the job description (if possible)</span>
            )}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-muted-foreground text-xs">Job description source</dt>
          <dd className="break-all">{source}</dd>
        </div>
      </dl>

      <AiStatusPanel />

      <p className="text-muted-foreground text-sm">
        All 16 sections are generated independently. You&apos;ll be taken to the package page right away and sections
        appear as they finish; failed sections can be retried individually.
      </p>

      {error ? <GenerateError error={error} /> : null}
    </div>
  );
}

function GenerateError({ error }: { error: Error }) {
  if (error instanceof ApiError && error.code === "AI_NOT_CONFIGURED") return <AiSetupHelp message={error.message} />;
  if (error instanceof ApiError && error.code === "EXTRACTION_FAILED") return null; // handled by switching to paste
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden />
      <AlertTitle>Generation couldn&apos;t start</AlertTitle>
      <AlertDescription>{errorMessage(error)} Try again in a moment.</AlertDescription>
    </Alert>
  );
}

function GenerateButton({ pending }: { pending: boolean }) {
  const { data } = useAiStatus();
  const notConfigured = data !== undefined && (!data.configured || data.provider === "none");
  return (
    <Button type="submit" size="lg" disabled={pending || notConfigured} aria-busy={pending || undefined}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
      {pending ? "Starting generation…" : "Generate package"}
    </Button>
  );
}
