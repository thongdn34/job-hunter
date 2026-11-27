import { z } from "zod";

/**
 * Per-package study progress. Persisted client-side (localStorage via Zustand persist)
 * and synced to the server (StudyProgress table) so it survives browser sessions.
 */
export const PackageProgressSchema = z.object({
  studied: z.array(z.string()),
  favorites: z.array(z.string()),
  completedTopics: z.array(z.string()),
  flashcards: z.object({
    known: z.array(z.string()),
    review: z.array(z.string()),
    reviewedCount: z.number().int().min(0),
  }),
  studyPlanTasks: z.array(z.string()),
  /** Checklist items of the practice project. */
  projectChecklist: z.array(z.string()),
  lastSection: z.string().optional(),
  lastAnchor: z.string().optional(),
  lastScrollY: z.number().optional(),
  updatedAt: z.string(),
});
export type PackageProgress = z.infer<typeof PackageProgressSchema>;

export function emptyProgress(): PackageProgress {
  return {
    studied: [],
    favorites: [],
    completedTopics: [],
    flashcards: { known: [], review: [], reviewedCount: 0 },
    studyPlanTasks: [],
    projectChecklist: [],
    updatedAt: new Date(0).toISOString(),
  };
}
