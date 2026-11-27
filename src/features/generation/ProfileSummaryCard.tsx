"use client";

import Link from "next/link";
import { AlertCircle, FileCheck2, FileX2, RotateCw } from "lucide-react";
import { generationExperiences, type CandidateProfile } from "@/domain/profile/schema";
import { useProfileQuery } from "@/features/profile/use-profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "./api";

const MAX_SKILLS = 14;

const ARRANGEMENT_LABEL: Record<CandidateProfile["workingArrangement"], string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  flexible: "Flexible",
};

/** Step 2 of the wizard: what the generator will know about the candidate. */
export function ProfileSummaryCard() {
  const { data: profile, isPending, isError, error, refetch, isFetching } = useProfileQuery();

  if (isPending) {
    return (
      <div role="status" aria-label="Loading profile" className="bg-card space-y-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden />
        <AlertTitle>Couldn&apos;t load your profile</AlertTitle>
        <AlertDescription>
          <p>
            {errorMessage(error)} Generation uses the profile saved on the server, so you can still continue — but
            review it first if you changed anything recently.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RotateCw className={isFetching ? "animate-spin" : undefined} aria-hidden />
              Retry
            </Button>
            <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open profile
            </Link>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const included = generationExperiences(profile);
  const excludedCount = profile.experiences.length - included.length;
  const productionSkills = profile.skills.filter((s) => s.proficiency === "production");
  const skills = (productionSkills.length > 0 ? productionSkills : profile.skills).slice(0, MAX_SKILLS);
  const hiddenSkills = (productionSkills.length > 0 ? productionSkills.length : profile.skills.length) - skills.length;

  return (
    <section
      aria-labelledby="profile-summary-title"
      className="bg-card text-card-foreground space-y-4 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id="profile-summary-title" className="font-medium">
            {profile.fullName || "Candidate profile"}
          </h3>
          <p className="text-muted-foreground text-sm">{profile.headline}</p>
        </div>
        <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Edit profile
        </Link>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-xs">Experience</dt>
          <dd>
            {profile.yearsOfExperience} year{profile.yearsOfExperience === 1 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Location</dt>
          <dd>{profile.location || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Working arrangement</dt>
          <dd>{ARRANGEMENT_LABEL[profile.workingArrangement]}</dd>
        </div>
      </dl>

      <div>
        <h4 className="text-muted-foreground mb-1.5 text-xs">Target roles</h4>
        <ul className="flex flex-wrap gap-1.5">
          {profile.targetRoles.map((role) => (
            <li key={role}>
              <Badge variant="secondary">{role}</Badge>
            </li>
          ))}
        </ul>
      </div>

      {skills.length > 0 ? (
        <div>
          <h4 className="text-muted-foreground mb-1.5 text-xs">Key skills</h4>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <li key={skill.id ?? skill.name}>
                <Badge variant="outline">{skill.name}</Badge>
              </li>
            ))}
            {hiddenSkills > 0 ? (
              <li>
                <Badge variant="ghost" className="text-muted-foreground">
                  +{hiddenSkills} more
                </Badge>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div>
        <h4 className="text-muted-foreground mb-1.5 text-xs">
          Experience used for generation ({included.length}){excludedCount > 0 ? ` · ${excludedCount} excluded` : ""}
        </h4>
        {included.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {included.map((exp) => (
              <li key={exp.id ?? `${exp.company}-${exp.role}`} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{exp.company}</span>
                {exp.role ? <span className="text-muted-foreground">{exp.role}</span> : null}
                {exp.period ? <span className="text-muted-foreground tabular-nums">· {exp.period}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No work experience is enabled for generation.{" "}
            <Link href="/profile" className="underline underline-offset-2">
              Add or enable experience
            </Link>{" "}
            for tailored answers.
          </p>
        )}
      </div>

      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        {profile.cvFileName ? (
          <>
            <FileCheck2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            CV uploaded: <span className="text-foreground truncate">{profile.cvFileName}</span>
          </>
        ) : (
          <>
            <FileX2 className="size-4" aria-hidden />
            No CV uploaded — the generator relies on the profile fields only.
          </>
        )}
      </p>
    </section>
  );
}
