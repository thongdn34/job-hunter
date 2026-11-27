/**
 * Typed errors thrown by the package / progress repositories. Route handlers map them to
 * HTTP statuses (404 / 403 / 400) instead of string-matching messages.
 * Pure module (no `server-only`) so tests and route handlers can import it freely.
 */

export class PackageNotFoundError extends Error {
  readonly code = "package_not_found" as const;
  constructor(readonly ref: string) {
    super(`Interview package not found: ${ref}`);
    this.name = "PackageNotFoundError";
  }
}

export class SamplePackageError extends Error {
  readonly code = "sample_package" as const;
  constructor(readonly slug: string) {
    super(`The built-in sample package "${slug}" cannot be modified or deleted.`);
    this.name = "SamplePackageError";
  }
}

export class QuestionNotFoundError extends Error {
  readonly code = "question_not_found" as const;
  constructor(readonly questionId: string) {
    super(`Question "${questionId}" does not exist in this package's question bank.`);
    this.name = "QuestionNotFoundError";
  }
}

/** Content passed Zod validation but cannot be normalized (e.g. duplicate item ids). */
export class InvalidSectionContentError extends Error {
  readonly code = "invalid_section_content" as const;
  constructor(message: string) {
    super(message);
    this.name = "InvalidSectionContentError";
  }
}
