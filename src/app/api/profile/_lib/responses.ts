import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

export interface ApiIssue {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
  issues?: ApiIssue[];
}

export function jsonError(status: number, error: string, extra: Omit<ApiErrorBody, "error"> = {}) {
  return NextResponse.json<ApiErrorBody>({ error, ...extra }, { status });
}

export function zodIssues(error: z.ZodError): ApiIssue[] {
  return error.issues.slice(0, 50).map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

export function internalError(scope: string, error: unknown) {
  console.error(`[api/profile] ${scope} failed`, error);
  return jsonError(500, "Something went wrong while accessing your profile. Please try again.", { code: "internal" });
}
