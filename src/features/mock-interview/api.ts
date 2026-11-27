"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import {
  ApiErrorSchema,
  MockAnswerResponseSchema,
  MockSessionDetailResponseSchema,
  MockSessionListResponseSchema,
  MockSessionResponseSchema,
  type AddMockAnswerBody,
  type MockAnswerResponse,
  type MockSessionDetail,
  type MockSessionDto,
  type MockSessionListItem,
} from "@/domain/mock/dto";

/** Error thrown by the mock API client; `status` is the HTTP status (0 = network). */
export class MockApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MockApiError";
  }
}

async function request<T extends z.ZodType>(url: string, schema: T, init?: RequestInit): Promise<z.output<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    });
  } catch {
    throw new MockApiError("Network error — check your connection and try again.", 0);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    throw new MockApiError(parsed.success ? parsed.data.error : `Request failed (${res.status}).`, res.status);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new MockApiError("The server returned an unexpected response.", res.status);
  return parsed.data;
}

export const mockApi = {
  createSession: (packageSlug: string) =>
    request("/api/mock/sessions", MockSessionResponseSchema, {
      method: "POST",
      body: JSON.stringify({ packageSlug }),
    }).then((r) => r.session),
  listSessions: (packageSlug: string) =>
    request(`/api/mock/sessions?packageSlug=${encodeURIComponent(packageSlug)}`, MockSessionListResponseSchema).then(
      (r) => r.sessions,
    ),
  getSession: (id: string) => request(`/api/mock/sessions/${encodeURIComponent(id)}`, MockSessionDetailResponseSchema),
  submitAnswer: (sessionId: string, body: AddMockAnswerBody) =>
    request(`/api/mock/sessions/${encodeURIComponent(sessionId)}/answers`, MockAnswerResponseSchema, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  completeSession: (id: string) =>
    request(`/api/mock/sessions/${encodeURIComponent(id)}/complete`, MockSessionResponseSchema, {
      method: "POST",
    }).then((r) => r.session),
};

export const mockKeys = {
  sessions: (slug: string) => ["mock", "sessions", slug] as const,
  session: (id: string) => ["mock", "session", id] as const,
};

export function useMockSessions(packageSlug: string) {
  return useQuery<MockSessionListItem[], MockApiError>({
    queryKey: mockKeys.sessions(packageSlug),
    queryFn: () => mockApi.listSessions(packageSlug),
  });
}

export function useMockSessionDetail(id: string, enabled: boolean) {
  return useQuery<MockSessionDetail, MockApiError>({
    queryKey: mockKeys.session(id),
    queryFn: () => mockApi.getSession(id),
    enabled,
  });
}

export function useStartMockSession(packageSlug: string) {
  return useMutation<MockSessionDto, MockApiError, void>({
    mutationFn: () => mockApi.createSession(packageSlug),
  });
}

export function useSubmitMockAnswer(sessionId: string) {
  return useMutation<MockAnswerResponse, MockApiError, AddMockAnswerBody>({
    mutationFn: (body) => mockApi.submitAnswer(sessionId, body),
  });
}

export function useCompleteMockSession(packageSlug: string) {
  const qc = useQueryClient();
  return useMutation<MockSessionDto, MockApiError, string>({
    mutationFn: (id) => mockApi.completeSession(id),
    onSuccess: (session) => {
      void qc.invalidateQueries({ queryKey: mockKeys.sessions(packageSlug) });
      void qc.invalidateQueries({ queryKey: mockKeys.session(session.id) });
    },
  });
}
