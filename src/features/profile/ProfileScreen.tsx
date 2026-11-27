"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { AlertTriangleIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfilePayload } from "@/domain/profile/form";
import { errorMessage } from "./api";
import { CvCard } from "./CvCard";
import { ProfileForm } from "./ProfileForm";
import { useProfileQuery, useSaveProfile } from "./use-profile";

export function GroundingCallout() {
  return (
    <Alert>
      <ShieldCheckIcon aria-hidden="true" />
      <AlertTitle>Your facts, nothing more</AlertTitle>
      <AlertDescription>
        Generated content only uses facts from this profile and your CV — nothing is invented. Keep it accurate, and
        switch off any role you don&apos;t want mentioned.
      </AlertDescription>
    </Alert>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-busy="true">
      <span className="sr-only" role="status">
        Loading profile…
      </span>
      <div className="grid gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-4 rounded-xl border p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
            <Skeleton className="h-20" />
          </div>
        ))}
      </div>
      <div className="grid content-start gap-4 rounded-xl border p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

/** Client-side profile editor: loads the profile, renders the form and the CV card. */
export function ProfileScreen() {
  const query = useProfileQuery();
  const save = useSaveProfile();
  const { mutateAsync } = save;

  const handleSubmit = useCallback(
    async (payload: ProfilePayload) => {
      try {
        const saved = await mutateAsync(payload);
        toast.success("Profile saved");
        return saved;
      } catch (error) {
        toast.error("Profile not saved", { description: errorMessage(error, "Please try again.") });
        throw error;
      }
    },
    [mutateAsync],
  );

  if (query.isPending) return <ProfileSkeleton />;

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertTitle>Couldn&apos;t load your profile</AlertTitle>
        <AlertDescription>
          <p>{errorMessage(query.error, "Please try again.")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCwIcon className={query.isFetching ? "animate-spin" : undefined} aria-hidden="true" />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const profile = query.data;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="min-w-0">
        {/* The form keeps its own state; it re-baselines itself after each successful save. */}
        <ProfileForm key={profile.id ?? "profile"} profile={profile} onSubmit={handleSubmit} />
      </div>
      {/* CV first on small screens (short card), right-hand column on large screens. */}
      <div className="order-first grid gap-4 lg:sticky lg:top-4 lg:order-last">
        <CvCard profile={profile} />
      </div>
    </div>
  );
}
