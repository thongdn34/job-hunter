import { collectStudyItems, type StudyItem, type StudyItemKind } from "@/domain/package/items";
import type { InterviewPackage } from "@/domain/package/schema";

/**
 * collectStudyItems() builds big search strings; cache per package object so the study plan,
 * cheat sheet and progress panel share one pass.
 */
const cache = new WeakMap<InterviewPackage, { items: StudyItem[]; byId: Map<string, StudyItem> }>();

export function getStudyItemIndex(pkg: InterviewPackage): { items: StudyItem[]; byId: Map<string, StudyItem> } {
  let entry = cache.get(pkg);
  if (!entry) {
    const items = collectStudyItems(pkg);
    entry = { items, byId: new Map(items.map((i) => [i.id, i])) };
    cache.set(pkg, entry);
  }
  return entry;
}

const KIND_PREFIX: Record<StudyItemKind, string> = {
  question: "Q",
  systemDesign: "SD",
  coding: "Code",
  behavioral: "STAR",
};

/** Short visible label for an item chip, e.g. "Q7", "SD2". */
export function itemShortLabel(item: Pick<StudyItem, "kind" | "number">): string {
  return `${KIND_PREFIX[item.kind]}${item.kind === "question" ? "" : " "}${item.number}`;
}
