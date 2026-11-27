"use client";

import { useId, useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, FileTextIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CandidateProfile } from "@/domain/profile/schema";
import { CV_ACCEPT, CV_MAX_BYTES, CV_SUPPORTED_LABEL, checkCvFile, formatBytes } from "@/domain/profile/cv";
import { cn } from "@/lib/utils";
import { errorMessage } from "./api";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { useRemoveCv, useUploadCv } from "./use-profile";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const numberFormatter = new Intl.NumberFormat();

function formatUploadedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

/** Upload / replace / remove the CV and preview its extracted text. */
export function CvCard({ profile }: { profile: Pick<CandidateProfile, "cvText" | "cvFileName" | "cvUploadedAt"> }) {
  const upload = useUploadCv();
  const removeCv = useRemoveCv();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const hintId = useId();
  const previewId = useId();

  const hasCv = Boolean(profile.cvText);
  const uploadedAt = useMemo(() => formatUploadedAt(profile.cvUploadedAt), [profile.cvUploadedAt]);
  const busy = upload.isPending || removeCv.isPending;

  function handleFile(file: File | undefined) {
    if (!file || busy) return;
    const check = checkCvFile({ name: file.name, size: file.size, type: file.type });
    if (!check.ok) {
      setError(check.message);
      toast.error("CV not uploaded", { description: check.message });
      return;
    }
    setError(null);
    setPendingName(file.name);
    upload.mutate(file, {
      onSuccess: ({ extractedChars, truncated }) => {
        toast.success("CV uploaded", {
          description: truncated
            ? `Extracted the first ${numberFormatter.format(extractedChars)} characters (the rest was cut to stay within the limit).`
            : `Extracted ${numberFormatter.format(extractedChars)} characters of text.`,
        });
      },
      onError: (err) => {
        const message = errorMessage(err, "The CV could not be uploaded.");
        setError(message);
        toast.error("CV not uploaded", { description: message });
      },
    });
  }

  function handleRemove() {
    removeCv.mutate(undefined, {
      onSuccess: () => toast.success("CV removed"),
      onError: (err) => toast.error("Could not remove the CV", { description: errorMessage(err) }),
    });
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = busy ? "none" : "copy";
  }

  function onDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  return (
    <section aria-labelledby="cv-card-title">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id="cv-card-title">CV</h2>
          </CardTitle>
          <CardDescription>
            The extracted text is used as extra grounding for generated content, alongside your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {hasCv ? (
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <FileTextIcon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={profile.cvFileName}>
                    {profile.cvFileName ?? "CV"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {uploadedAt ? <>Uploaded {uploadedAt} · </> : null}
                    {numberFormatter.format(profile.cvText?.length ?? 0)} characters
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy}
                  aria-label={`Remove CV ${profile.cvFileName ?? ""}`.trim()}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {removeCv.isPending ? (
                    <Loader2Icon className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2Icon aria-hidden="true" />
                  )}
                </Button>
              </div>
              <Collapsible>
                <CollapsibleTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="group/trigger w-full justify-between"
                    />
                  }
                >
                  Extracted text preview
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="transition-transform group-aria-expanded/trigger:rotate-180"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre
                    id={previewId}
                    tabIndex={0}
                    aria-label="Extracted CV text"
                    className="bg-muted focus-visible:ring-ring mt-2 max-h-80 overflow-auto rounded-md p-3 font-mono text-xs break-words whitespace-pre-wrap outline-none focus-visible:ring-2"
                  >
                    {profile.cvText}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}

          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            aria-busy={upload.isPending || undefined}
            className={cn(
              "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-5 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border",
              busy && "opacity-70",
            )}
          >
            {upload.isPending ? (
              <Loader2Icon className="text-muted-foreground size-6 animate-spin" aria-hidden="true" />
            ) : (
              <UploadIcon className="text-muted-foreground size-6" aria-hidden="true" />
            )}
            <div className="grid gap-1">
              <p className="text-sm font-medium">
                {upload.isPending
                  ? `Extracting text from ${pendingName ?? "your CV"}…`
                  : dragging
                    ? "Drop to upload"
                    : hasCv
                      ? "Drop a new file here to replace your CV"
                      : "Drag and drop your CV here"}
              </p>
              <p id={hintId} className="text-muted-foreground text-xs">
                {CV_SUPPORTED_LABEL}, up to {formatBytes(CV_MAX_BYTES)}. Word (.docx) isn&apos;t supported yet — export
                to PDF first.
              </p>
            </div>
            <Button
              ref={uploadButtonRef}
              type="button"
              variant={hasCv ? "outline" : "default"}
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              aria-describedby={hintId}
            >
              {hasCv ? "Replace CV" : "Choose file"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={CV_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              data-testid="cv-file-input"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                // Allow re-selecting the same file after an error.
                event.target.value = "";
              }}
            />
          </div>

          <p role="status" aria-live="polite" className="sr-only">
            {upload.isPending ? `Uploading ${pendingName ?? "CV"}` : ""}
          </p>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Upload failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove your CV?"
        description="The extracted text will be deleted. Generated content will rely on your profile only until you upload a CV again."
        confirmLabel="Remove CV"
        onConfirm={handleRemove}
        finalFocus={uploadButtonRef}
      />
    </section>
  );
}
