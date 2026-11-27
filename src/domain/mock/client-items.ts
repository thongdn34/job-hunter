import type { Bilingual, Difficulty, Priority } from "@/domain/common/schema";
import type { InterviewPackage } from "@/domain/package/schema";
import type { StudyItemKind } from "@/domain/package/items";
import { buildMockItemIndex, type MockEvaluationItem } from "./item-context";

/**
 * The slim, client-facing shape of an askable mock item (primary item or stored follow-up).
 *
 * It carries only what the mock interview UI renders or plans with. AI-only context
 * (`supportingNotes`, `memoryShortcut`, `keyTakeaway`, the follow-up answer) and the search
 * blob (`searchText`) stay on the server: the answers route re-resolves the full item with
 * `resolveMockItem` before evaluating, so the browser never needs them. This keeps the
 * standalone mock page from serializing the whole package into the RSC payload.
 */
export interface MockClientItem {
  id: string;
  number: number;
  kind: StudyItemKind;
  priority: Priority;
  difficulty: Difficulty;
  title: Bilingual;
  /** What the interviewer asks (bilingual). */
  prompt: Bilingual;
  /** Recommended English answer, shown after "reveal" / used as a self-check. */
  referenceAnswer: string;
  /** Set when this item IS a follow-up: the id of the parent item. */
  parentId?: string;
  /** First stored interviewer follow-up (question only — its answer stays on the server). */
  followUp?: { id: string; question: Bilingual };
}

/** Maps a full evaluation item to the client DTO (drops AI-only context and search text). */
export function toMockClientItem(item: MockEvaluationItem): MockClientItem {
  const out: MockClientItem = {
    id: item.id,
    number: item.number,
    kind: item.kind,
    priority: item.priority,
    difficulty: item.difficulty,
    title: item.title,
    prompt: item.prompt,
    referenceAnswer: item.referenceAnswer,
  };
  if (item.parentId) out.parentId = item.parentId;
  if (item.followUp) out.followUp = { id: item.followUp.id, question: item.followUp.question };
  return out;
}

/** Every askable item of a package (primary items first, then their follow-ups), as client DTOs. */
export function buildMockClientItems(pkg: InterviewPackage): MockClientItem[] {
  return Array.from(buildMockItemIndex(pkg).values(), toMockClientItem);
}
