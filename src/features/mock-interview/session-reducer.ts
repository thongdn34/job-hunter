import type { MockSessionDto } from "@/domain/mock/dto";
import type { MockEvaluation } from "@/domain/mock/schema";

/** Client-side state machine of one mock interview run: setup → interview → summary. */

export interface Turn {
  itemId: string;
  /** Set when this turn answers the follow-up of another item. */
  parentId?: string;
}

export interface TurnResult {
  answerId: string;
  itemId: string;
  overall: number;
  revealedBeforeSubmit: boolean;
  evaluation: MockEvaluation;
}

export type MockRunState =
  | { phase: "setup" }
  | { phase: "interview"; sessionId: string; turns: Turn[]; index: number; results: Record<number, TurnResult> }
  | {
      phase: "summary";
      sessionId: string;
      turns: Turn[];
      results: Record<number, TurnResult>;
      session: MockSessionDto | null;
    };

export type MockRunAction =
  | { type: "start"; sessionId: string; itemIds: string[] }
  | { type: "result"; index: number; result: TurnResult }
  | { type: "next" }
  | { type: "followUp"; followUpId: string; parentId: string }
  | { type: "finish"; session: MockSessionDto | null }
  | { type: "reset" };

export const initialRunState: MockRunState = { phase: "setup" };

export function mockRunReducer(state: MockRunState, action: MockRunAction): MockRunState {
  switch (action.type) {
    case "start":
      if (action.itemIds.length === 0) return state;
      return {
        phase: "interview",
        sessionId: action.sessionId,
        turns: action.itemIds.map((itemId) => ({ itemId })),
        index: 0,
        results: {},
      };
    case "result":
      if (state.phase !== "interview") return state;
      return { ...state, results: { ...state.results, [action.index]: action.result } };
    case "next":
      if (state.phase !== "interview" || !state.results[state.index]) return state;
      if (state.index + 1 >= state.turns.length) return state;
      return { ...state, index: state.index + 1 };
    case "followUp": {
      if (state.phase !== "interview" || !state.results[state.index]) return state;
      const nextTurn = state.turns[state.index + 1];
      // Already queued (e.g. double click): just move on.
      if (nextTurn?.itemId === action.followUpId) return { ...state, index: state.index + 1 };
      const turns = [...state.turns];
      turns.splice(state.index + 1, 0, { itemId: action.followUpId, parentId: action.parentId });
      // Shift results that were recorded after the insertion point (none in practice, kept for safety).
      const results: Record<number, TurnResult> = {};
      for (const [k, v] of Object.entries(state.results)) {
        const i = Number(k);
        results[i > state.index ? i + 1 : i] = v;
      }
      return { ...state, turns, results, index: state.index + 1 };
    }
    case "finish":
      if (state.phase !== "interview") return state;
      return {
        phase: "summary",
        sessionId: state.sessionId,
        turns: state.turns,
        results: state.results,
        session: action.session,
      };
    case "reset":
      return initialRunState;
  }
}

/** Answered turns in order (unanswered/skipped turns are omitted). */
export function answeredTurns(
  turns: readonly Turn[],
  results: Record<number, TurnResult>,
): Array<Turn & { result: TurnResult; index: number }> {
  return turns.flatMap((t, index) => {
    const result = results[index];
    return result ? [{ ...t, result, index }] : [];
  });
}
