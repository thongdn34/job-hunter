import { buildStandaloneHtmlParts } from "@/domain/export/html";
import { describeIssues, PrintBodyQuerySchema, searchParamsToObject } from "@/domain/export/options";
import { getPackageBySlug } from "@/server/repositories/package-repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/packages/[slug]/print?sections=jd,bilingual&lang=en|vi|bilingual
 * The print view's body: the `.jh-export` fragment, fully expanded and non-interactive.
 * `/print/[slug]` fetches it after mount and injects it, so the (large) body is sent once
 * instead of twice (SSR markup + RSC payload). 400 on invalid params, 404 for unknown packages.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const parsed = PrintBodyQuerySchema.safeParse(searchParamsToObject(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Invalid print parameters", issues: describeIssues(parsed.error) }, { status: 400 });
  }

  const pkg = await getPackageBySlug(slug);
  if (!pkg) return Response.json({ error: `Package "${slug}" not found` }, { status: 404 });

  const { sections, lang } = parsed.data;
  let body: string;
  try {
    // Built from HTML-escaped text + sanitize-html-sanitized Markdown (see src/domain/export/html.ts).
    body = buildStandaloneHtmlParts(pkg, { sections, language: lang, expanded: true, interactive: false }).body;
  } catch (error) {
    console.error("[print] failed to build print body", { slug, error });
    return Response.json({ error: "Failed to build print view" }, { status: 500 });
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      // A fragment for fetch() only: if opened directly, nothing in it may run or load.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
    },
  });
}
