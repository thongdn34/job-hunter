import { z } from "zod";
import { PackageProgressSchema } from "@/domain/progress/schema";
import { getProgress, saveProgress } from "@/server/repositories/progress-repository";
import { PackageNotFoundError } from "@/server/repositories/repository-errors";

// Reads/writes the local database on every request.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(200);
/** Progress payloads are small id lists; anything bigger is rejected before parsing. */
const MAX_BODY_BYTES = 512 * 1024;

const noStore = { "cache-control": "no-store" };

function error(status: number, message: string, issues?: unknown) {
  return Response.json(issues ? { error: message, issues } : { error: message }, { status, headers: noStore });
}

async function resolveSlug(ctx: Context): Promise<string | null> {
  const { slug } = await ctx.params;
  const parsed = SlugSchema.safeParse(slug);
  return parsed.success ? parsed.data : null;
}

/** GET /api/progress/[slug] -> { progress: PackageProgress | null } */
export async function GET(_req: Request, ctx: Context) {
  const slug = await resolveSlug(ctx);
  if (!slug) return error(400, "Invalid package slug");
  try {
    const progress = await getProgress(slug);
    return Response.json({ progress }, { headers: noStore });
  } catch (e) {
    console.error("[api/progress] GET failed", e);
    return error(500, "Failed to load progress");
  }
}

async function save(req: Request, ctx: Context) {
  const slug = await resolveSlug(ctx);
  if (!slug) return error(400, "Invalid package slug");

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return error(413, "Payload too large");

  // Raw text so navigator.sendBeacon (text/plain) and fetch (application/json) both work.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return error(400, "Unreadable request body");
  }
  if (raw.length > MAX_BODY_BYTES) return error(413, "Payload too large");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error(400, "Body must be valid JSON");
  }

  const parsed = PackageProgressSchema.safeParse(body);
  if (!parsed.success) return error(400, "Invalid progress payload", z.treeifyError(parsed.error));

  try {
    const progress = await saveProgress(slug, parsed.data);
    return Response.json({ progress }, { headers: noStore });
  } catch (e) {
    // A deleted/unknown package is a client-side condition (4xx stops the client's retries).
    if (e instanceof PackageNotFoundError) return error(404, "Package not found");
    console.error("[api/progress] save failed", e);
    return error(500, "Failed to save progress");
  }
}

/** PUT /api/progress/[slug] with a PackageProgress body -> { progress } (server copy after last-write-wins). */
export async function PUT(req: Request, ctx: Context) {
  return save(req, ctx);
}

/** POST is accepted for navigator.sendBeacon (which can only POST); same semantics as PUT. */
export async function POST(req: Request, ctx: Context) {
  return save(req, ctx);
}
