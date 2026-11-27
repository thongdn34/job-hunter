"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { PriorityBadge } from "@/components/common/Badges";
import { BilingualText } from "@/components/common/BilingualText";
import { BookmarkMarker } from "@/components/common/BookmarkMarker";
import { Button } from "@/components/ui/button";
import { bookmarkToAnchorId, topicBookmark } from "@/domain/package/bookmarks";
import { EMPTY_FILTER_CRITERIA, filterStudyItems, type StudyFilterCriteria } from "@/domain/package/filters";
import { collectStudyItems } from "@/domain/package/items";
import type { InterviewQuestion, InterviewTopic } from "@/domain/package/schema";
import { scrollToAnchor } from "@/features/package-view/navigation";
import type { SectionProps } from "@/features/package-view/section-types";
import { useExpansionStore, type RevealRequest } from "@/stores/expansion-store";
import { cn } from "@/lib/utils";
import { ACCORDION_LIST_ATTR } from "./ItemAccordion";
import { StudiedCount } from "./item-parts";
import { toggleStudiedAndSyncTopic, useFavoriteIds, useStudiedCount, useStudiedIds } from "./progress";
import { QuestionItem } from "./QuestionItem";
import { QUESTION_BANK_SCROLL_MARGIN_CLASS, QuestionToolbar } from "./QuestionToolbar";

interface TopicGroup {
  topic: InterviewTopic;
  questions: InterviewQuestion[];
  questionIds: string[];
}

const OTHER_TOPIC_ID = "__other__";

/** Groups questions by topic (topic order), questions sorted by number; orphans go to "Other". */
export function groupQuestionsByTopic(
  topics: readonly InterviewTopic[],
  questions: readonly InterviewQuestion[],
): TopicGroup[] {
  const byTopic = new Map<string, InterviewQuestion[]>();
  for (const q of questions) {
    const list = byTopic.get(q.topicId);
    if (list) list.push(q);
    else byTopic.set(q.topicId, [q]);
  }
  const known = new Set(topics.map((t) => t.id));
  const groups: TopicGroup[] = topics.map((topic) => {
    const qs = [...(byTopic.get(topic.id) ?? [])].sort((a, b) => a.number - b.number);
    return { topic, questions: qs, questionIds: qs.map((q) => q.id) };
  });
  const orphans = questions.filter((q) => !known.has(q.topicId)).sort((a, b) => a.number - b.number);
  if (orphans.length > 0) {
    groups.push({
      topic: {
        id: OTHER_TOPIC_ID,
        code: "OTHER",
        priority: "medium",
        title: { en: "Other questions", vi: "Câu hỏi khác" },
      },
      questions: orphans,
      questionIds: orphans.map((q) => q.id),
    });
  }
  return groups.filter((g) => g.questions.length > 0);
}

/** Section 7 — bilingual technical question bank (the core learning UI). */
export function QuestionBankSection({ pkg, data }: SectionProps<"bilingual">) {
  const slug = pkg.meta.slug;
  const companyCode = pkg.meta.companyCode;
  const canRegenerate = !pkg.meta.isSample;

  const [criteria, setCriteria] = useState<StudyFilterCriteria>(EMPTY_FILTER_CRITERIA);
  const deferredQuery = useDeferredValue(criteria.query);

  const groups = useMemo(() => groupQuestionsByTopic(data.topics, data.questions), [data.topics, data.questions]);
  const studyItems = useMemo(
    () => collectStudyItems({ ...pkg, sections: { bilingual: data } }).filter((i) => i.kind === "question"),
    [pkg, data],
  );
  const questionIdSet = useMemo(() => new Set(data.questions.map((q) => q.id)), [data.questions]);
  const topicByQuestion = useMemo(() => {
    const map = new Map<string, { id: string; questionIds: readonly string[] }>();
    for (const g of groups) {
      if (g.topic.id === OTHER_TOPIC_ID) continue;
      const entry = { id: g.topic.id, questionIds: g.questionIds };
      for (const id of g.questionIds) map.set(id, entry);
    }
    return map;
  }, [groups]);
  const topicAnchorIds = useMemo(
    () => new Set(groups.map((g) => bookmarkToAnchorId(topicBookmark(companyCode, g.topic.code)))),
    [groups, companyCode],
  );

  // Progress lists are only subscribed to while a status filter needs them.
  const liveStudiedIds = useStudiedIds(slug, criteria.status === "studied" || criteria.status === "not-studied");
  const liveFavoriteIds = useFavoriteIds(slug, criteria.status === "favorites");
  // Status-filter membership is a snapshot taken when the criteria change, not live: toggling
  // "studied"/"favorite" inside a visible question must not unmount it mid-interaction (which
  // would drop keyboard focus to <body>). Changing any filter applies the current progress.
  const [statusSnapshot, setStatusSnapshot] = useState(() => ({
    criteria,
    studiedIds: liveStudiedIds,
    favoriteIds: liveFavoriteIds,
  }));
  if (statusSnapshot.criteria !== criteria) {
    setStatusSnapshot({ criteria, studiedIds: liveStudiedIds, favoriteIds: liveFavoriteIds });
  }
  const fresh = statusSnapshot.criteria === criteria;
  const studiedIds = fresh ? statusSnapshot.studiedIds : liveStudiedIds;
  const favoriteIds = fresh ? statusSnapshot.favoriteIds : liveFavoriteIds;

  const visibleIds = useMemo(() => {
    const filtered = filterStudyItems(studyItems, { ...criteria, query: deferredQuery, studiedIds, favoriteIds });
    return new Set(filtered.map((i) => i.id));
  }, [studyItems, criteria, deferredQuery, studiedIds, favoriteIds]);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, visible: g.questions.filter((q) => visibleIds.has(q.id)) }))
        .filter((g) => g.visible.length > 0),
    [groups, visibleIds],
  );
  const visibleCount = visibleIds.size;

  const onChange = useCallback((patch: Partial<StudyFilterCriteria>) => setCriteria((c) => ({ ...c, ...patch })), []);
  const onClear = useCallback(() => setCriteria(EMPTY_FILTER_CRITERIA), []);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // The empty-state button is replaced by the list once activated: keep focus in the section.
  const onEmptyStateClear = useCallback(() => {
    setCriteria(EMPTY_FILTER_CRITERIA);
    searchInputRef.current?.focus();
  }, []);
  const onToggleStudied = useCallback(
    (id: string) => toggleStudiedAndSyncTopic(slug, id, topicByQuestion.get(id)),
    [slug, topicByQuestion],
  );

  const visibleIdsRef = useRef(visibleIds);
  useEffect(() => {
    visibleIdsRef.current = visibleIds;
  }, [visibleIds]);

  const onExpandAll = useCallback(() => useExpansionStore.getState().expandMany([...visibleIdsRef.current]), []);
  const onCollapseAll = useCallback(() => useExpansionStore.getState().collapseMany([...visibleIdsRef.current]), []);

  // App-level search / deep links may target a question hidden by local filters:
  // reset the filters so the item mounts and handles its own focus request.
  useEffect(
    () =>
      useExpansionStore.subscribe((state, prev) => {
        const req = state.focusRequest;
        if (!req || req === prev.focusRequest) return;
        if (questionIdSet.has(req.id) && !visibleIdsRef.current.has(req.id)) setCriteria(EMPTY_FILTER_CRITERIA);
      }),
    [questionIdSet],
  );

  // TOC / global search / hash links to a topic heading hidden by the filters: scrollToAnchor
  // files a reveal request; reset the filters and scroll once the heading has mounted.
  const pendingRevealRef = useRef<RevealRequest | null>(null);
  useEffect(
    () =>
      useExpansionStore.subscribe((state, prev) => {
        const req = state.revealRequest;
        if (!req || req === prev.revealRequest || !topicAnchorIds.has(req.anchorId)) return;
        pendingRevealRef.current = req;
        useExpansionStore.getState().clearRevealRequest();
        setCriteria(EMPTY_FILTER_CRITERIA);
      }),
    [topicAnchorIds],
  );
  useEffect(() => {
    const req = pendingRevealRef.current;
    // `visibleGroups` follows the deferred query, so the heading may need one more render.
    if (!req || !document.getElementById(req.anchorId)) return;
    pendingRevealRef.current = null;
    scrollToAnchor(req.anchorId, req.options);
  }, [visibleGroups]);

  if (data.questions.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">No questions yet.</p>
    );
  }

  return (
    <div className="space-y-6" {...{ [ACCORDION_LIST_ATTR]: "" }}>
      <QuestionToolbar
        criteria={criteria}
        onChange={onChange}
        onClear={onClear}
        topics={data.topics}
        total={data.questions.length}
        visible={visibleCount}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        searchInputRef={searchInputRef}
      />

      {visibleGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <SearchX className="text-muted-foreground size-6" aria-hidden />
          <p className="text-muted-foreground text-sm">No questions match the current search and filters.</p>
          <Button type="button" size="sm" variant="outline" onClick={onEmptyStateClear}>
            Clear filters
          </Button>
        </div>
      ) : (
        visibleGroups.map((g) => (
          <TopicGroupView
            key={g.topic.id}
            topic={g.topic}
            companyCode={companyCode}
            slug={slug}
            questionIds={g.questionIds}
            questions={g.visible}
            canRegenerate={canRegenerate}
            onToggleStudied={onToggleStudied}
          />
        ))
      )}
    </div>
  );
}

interface TopicGroupViewProps {
  topic: InterviewTopic;
  companyCode: string;
  slug: string;
  /** All question ids of the topic (for completion), regardless of filters. */
  questionIds: readonly string[];
  questions: readonly InterviewQuestion[];
  canRegenerate: boolean;
  onToggleStudied: (id: string) => void;
}

const TopicGroupView = memo(function TopicGroupView({
  topic,
  companyCode,
  slug,
  questionIds,
  questions,
  canRegenerate,
  onToggleStudied,
}: TopicGroupViewProps) {
  const bookmark = topicBookmark(companyCode, topic.code);
  const anchorId = bookmarkToAnchorId(bookmark);
  const titleId = `${anchorId}-title`;
  const studied = useStudiedCount(slug, questionIds);

  return (
    <section aria-labelledby={titleId} className="space-y-3" data-topic-id={topic.id}>
      <header id={anchorId} className={cn("space-y-1.5", QUESTION_BANK_SCROLL_MARGIN_CLASS)}>
        <BookmarkMarker bookmark={bookmark} anchorId={anchorId} />
        <h3 id={titleId} className="text-lg leading-snug font-semibold">
          <BilingualText value={topic.title} viClassName="text-base font-normal" />
        </h3>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          {topic.range ? <span className="tabular-nums">Questions {topic.range}</span> : null}
          <PriorityBadge priority={topic.priority} />
          <StudiedCount studied={studied} total={questionIds.length} />
        </div>
      </header>
      <div className="space-y-2">
        {questions.map((q) => (
          <QuestionItem
            key={q.id}
            question={q}
            slug={slug}
            canRegenerate={canRegenerate}
            onToggleStudied={onToggleStudied}
            className={QUESTION_BANK_SCROLL_MARGIN_CLASS}
          />
        ))}
      </div>
    </section>
  );
});
