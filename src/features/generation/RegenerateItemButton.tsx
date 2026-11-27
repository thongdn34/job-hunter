"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiError, errorMessage, fetchLatestJob, generationKeys, regenerateItem } from "./api";
import { isJobActive } from "./section-progress";

/**
 * Regenerates a single question's answer after confirmation (non-sample packages only). Disabled
 * while a generation job runs for the package (the server refuses it with JOB_RUNNING too).
 */
export function RegenerateItemButton({
  packageSlug,
  itemId,
  disabled,
}: {
  packageSlug: string;
  itemId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Reads the latest-job cache kept fresh by the generation banner; never fetches on its own.
  const { data: jobRunning = false } = useQuery({
    queryKey: generationKeys.latestJob(packageSlug),
    queryFn: () => fetchLatestJob(packageSlug),
    enabled: false,
    select: isJobActive,
  });
  const mutation = useMutation({
    mutationFn: () => regenerateItem(packageSlug, itemId),
    onSuccess: () => {
      setOpen(false);
      toast.success("Answer regenerated");
      router.refresh();
    },
    onError: (error) => {
      toast.error("Couldn't regenerate the answer", {
        description:
          error instanceof ApiError && error.code === "AI_NOT_CONFIGURED"
            ? "No AI provider is configured. Add an API key to .env (see Settings)."
            : errorMessage(error),
      });
    },
  });
  const pending = mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Keep the dialog open while the request runs so the result is visible.
        if (!pending) setOpen(next);
        if (next) mutation.reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || pending || jobRunning}
            title={jobRunning ? "Wait for the running generation to finish" : undefined}
          />
        }
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
        {pending ? "Regenerating…" : "Regenerate answer"}
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Regenerate this answer?</DialogTitle>
          <DialogDescription>
            The AI writes a new answer, explanation and follow-ups for this question from your current profile and the
            job description. The current version will be replaced.
          </DialogDescription>
        </DialogHeader>
        {mutation.isError ? (
          <p role="alert" className="text-destructive text-sm">
            {errorMessage(mutation.error)}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={pending || jobRunning}
            aria-busy={pending || undefined}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
            {pending ? "Regenerating…" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
