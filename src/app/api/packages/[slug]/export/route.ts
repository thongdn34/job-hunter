import { buildMarkdown } from "@/domain/export/markdown";
import { serializeJson } from "@/domain/export/json";
import { buildStandaloneHtml } from "@/domain/export/html";
import { describeIssues, ExportQuerySchema, searchParamsToObject } from "@/domain/export/options";
import {
  EXPORT_CONTENT_TYPES,
  exportFileName,
  type ExportFormat,
  type ExportTextOptions,
} from "@/domain/export/shared";
import { getPackageBySlug } from "@/server/repositories/package-repository";
import type { InterviewPackage } from "@/domain/package/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/packages/[slug]/export?format=md|json|html&sections=jd,bilingual&lang=en|vi|bilingual
 * Responds with a file download. 400 on invalid params, 404 for unknown packages.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const parsed = ExportQuerySchema.safeParse(searchParamsToObject(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Invalid export parameters", issues: describeIssues(parsed.error) }, { status: 400 });
  }

  const pkg = await getPackageBySlug(slug);
  if (!pkg) return Response.json({ error: `Package "${slug}" not found` }, { status: 404 });

  const { format, sections, lang } = parsed.data;
  let body: string;
  try {
    body = render(pkg, format, { sections, language: lang });
  } catch (error) {
    console.error("[export] failed to build export", { slug, format, error });
    return Response.json({ error: "Failed to build export" }, { status: 500 });
  }

  const filename = exportFileName(pkg.meta, format);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": EXPORT_CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function render(pkg: InterviewPackage, format: ExportFormat, options: ExportTextOptions): string {
  switch (format) {
    case "md":
      return buildMarkdown(pkg, options);
    case "json":
      return serializeJson(pkg, { sections: options.sections });
    case "html":
      return buildStandaloneHtml(pkg, options);
  }
}
