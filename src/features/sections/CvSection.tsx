"use client";

import { memo, useMemo } from "react";
import { AlertTriangle, Award, BookOpenCheck, Briefcase, FileText, KeyRound, Wrench } from "lucide-react";
import type { TailoredCv } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText } from "@/components/common/BilingualText";
import { CopyButton } from "@/components/common/CopyButton";
import { PriorityBadge } from "@/components/common/Badges";
import { buildCvPlainText, cvAchievementsText, cvExperienceText, cvSkillsText, sortByPriority } from "./shared/text";
import { BilingualList, Callout, ChipList, EmptyNote, Panel, SubSection } from "./shared/ui";

type Experience = TailoredCv["experienceHighlights"][number];

const ExperienceCard = memo(function ExperienceCard({ exp }: { exp: Experience }) {
  const text = useMemo(() => cvExperienceText({ experienceHighlights: [exp] }), [exp]);
  return (
    <Panel as="li" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{exp.role}</h4>
          <p className="text-muted-foreground text-sm">
            {exp.company}
            {exp.period && <span> · {exp.period}</span>}
          </p>
        </div>
        <CopyButton text={text} label={`Copy ${exp.company} bullets`} size="xs" variant="ghost" />
      </div>
      <BilingualList items={exp.bullets} />
    </Panel>
  );
});

export function CvSection({ data }: SectionProps<"cv">) {
  const fullText = useMemo(() => buildCvPlainText(data), [data]);
  const missing = useMemo(
    () => sortByPriority(data.missingSkillsToStudy, (m) => m.priority),
    [data.missingSkillsToStudy],
  );

  return (
    <div className="space-y-8">
      <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Recommended professional title
          </p>
          <p className="text-lg font-semibold tracking-tight">{data.professionalTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={data.professionalTitle} label="Copy title" size="sm" variant="ghost" />
          <CopyButton text={fullText} label="Copy full CV (English)" size="sm" variant="default" />
        </div>
      </Panel>

      <SubSection
        title="Summary"
        icon={FileText}
        actions={<CopyButton text={data.summary.en} label="Copy summary" size="xs" />}
      >
        <BilingualText
          value={data.summary}
          as="p"
          className="text-sm leading-relaxed"
          viClassName="text-sm leading-relaxed"
        />
      </SubSection>

      <SubSection
        title="Experience highlights"
        icon={Briefcase}
        actions={
          data.experienceHighlights.length > 0 ? (
            <CopyButton text={() => cvExperienceText(data)} label="Copy all experience" size="xs" />
          ) : null
        }
      >
        {data.experienceHighlights.length === 0 ? (
          <EmptyNote>No experience highlights.</EmptyNote>
        ) : (
          <ul className="space-y-3">
            {data.experienceHighlights.map((exp, i) => (
              <ExperienceCard key={`${exp.company}-${exp.role}-${i}`} exp={exp} />
            ))}
          </ul>
        )}
      </SubSection>

      <SubSection
        title="Tailored achievement bullets"
        icon={Award}
        actions={
          data.achievementBullets.length > 0 ? (
            <CopyButton text={() => cvAchievementsText(data)} label="Copy bullets" size="xs" />
          ) : null
        }
      >
        <BilingualList items={data.achievementBullets} empty="No achievement bullets." />
      </SubSection>

      <SubSection
        title="Technical skills"
        icon={Wrench}
        actions={
          data.technicalSkills.length > 0 ? (
            <CopyButton text={() => cvSkillsText(data)} label="Copy skills" size="xs" />
          ) : null
        }
      >
        {data.technicalSkills.length === 0 ? (
          <EmptyNote>No skills listed.</EmptyNote>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            {data.technicalSkills.map((group) => (
              <div key={group.category} className="bg-card space-y-2 rounded-lg border p-3">
                <dt className="text-sm font-medium">{group.category}</dt>
                <dd>
                  <ChipList items={group.skills} label={`${group.category} skills`} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </SubSection>

      <SubSection
        title="ATS keywords"
        icon={KeyRound}
        actions={
          data.atsKeywords.length > 0 ? (
            <CopyButton text={data.atsKeywords.join(", ")} label="Copy keywords" size="xs" />
          ) : null
        }
      >
        <ChipList items={data.atsKeywords} label="ATS keywords" />
      </SubSection>

      <SubSection title="Missing skills to study" icon={BookOpenCheck}>
        {missing.length === 0 ? (
          <EmptyNote>No missing skills identified.</EmptyNote>
        ) : (
          <ul className="bg-card divide-y rounded-lg border">
            {missing.map((m) => (
              <li key={m.skill} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-start sm:gap-3">
                <div className="flex shrink-0 items-center gap-2 sm:w-48">
                  <PriorityBadge priority={m.priority} />
                  <span className="text-sm font-medium">{m.skill}</span>
                </div>
                <BilingualText
                  value={m.reason}
                  as="p"
                  className="text-muted-foreground text-sm"
                  viClassName="text-sm"
                />
              </li>
            ))}
          </ul>
        )}
      </SubSection>

      {data.claimNotes.length > 0 && (
        <SubSection title="Claim notes" icon={AlertTriangle}>
          <Callout tone="warning" title="Only claim what you can back up in the interview">
            <BilingualList items={data.claimNotes} />
          </Callout>
        </SubSection>
      )}
    </div>
  );
}
