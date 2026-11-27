import { load, type CheerioAPI } from "cheerio";
import { z } from "zod";
import { cleanJdText, formatEmploymentType } from "@/domain/jd/normalize";

/**
 * HTML -> structured JD fields. Page content is untrusted: we only read text and
 * JSON-LD data; scripts are never executed and links are never followed.
 */

type DomNode = Exclude<Parameters<typeof load>[0], string | Buffer | unknown[]>;

export interface ExtractedFields {
  title?: string;
  company?: string;
  location?: string;
  employmentType?: string;
  /** Plain text with "## " heading markers and "• " bullets. */
  text: string;
  /** Which strategy produced the text. */
  strategy: "json-ld" | "linkedin" | "main-content";
}

/** Elements that never carry job content. */
const JUNK_SELECTOR = [
  "script:not([type='application/ld+json'])",
  "style",
  "noscript",
  "template",
  "svg",
  "canvas",
  "iframe",
  "object",
  "embed",
  "video",
  "audio",
  "img",
  "picture",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "nav",
  "footer",
  "header",
  "aside",
  "dialog",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  "[role='dialog']",
  "[aria-hidden='true']",
  "[hidden]",
].join(",");

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "blockquote",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "thead",
  "tfoot",
  "tr",
  "td",
  "th",
  "ul",
  "hr",
]);
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const EMPHASIS_TAGS = new Set(["strong", "b"]);

function nodeName(node: DomNode): string | undefined {
  return "name" in node && typeof node.name === "string" ? node.name.toLowerCase() : undefined;
}
function nodeChildren(node: DomNode): DomNode[] {
  return "children" in node && Array.isArray(node.children) ? (node.children as DomNode[]) : [];
}
function nodeText(node: DomNode): string {
  if (node.type === "text" && "data" in node && typeof node.data === "string") return node.data;
  return nodeChildren(node).map(nodeText).join("");
}

/**
 * Converts an HTML fragment or document into line-structured text: headings become "## X",
 * list items "• X", block elements end lines. Paragraphs that are entirely bold and short
 * ("<p><strong>Requirements</strong></p>") are promoted to headings.
 */
export function htmlToText(html: string): string {
  const $ = load(html);
  $(JUNK_SELECTOR).remove();
  $("script").remove();
  const root = $("body")[0] ?? $.root()[0];
  return root ? nodeToText(root) : "";
}

function nodeToText(root: DomNode): string {
  const lines: string[] = [];
  let buffer = "";
  let prefix = "";

  const flush = () => {
    const line = buffer.replace(/\s+/g, " ").trim();
    if (line) lines.push(prefix + line);
    buffer = "";
    prefix = "";
  };

  const walk = (node: DomNode) => {
    if (node.type === "text") {
      buffer += nodeText(node);
      return;
    }
    const name = nodeName(node);
    if (!name) {
      nodeChildren(node).forEach(walk);
      return;
    }
    if (name === "br") {
      flush();
      return;
    }
    if (HEADING_TAGS.has(name)) {
      flush();
      const text = nodeText(node).replace(/\s+/g, " ").trim();
      if (text) lines.push(`## ${text}`);
      return;
    }
    if (name === "li") {
      flush();
      prefix = "• ";
      nodeChildren(node).forEach(walk);
      flush();
      return;
    }
    if (name === "p" || name === "div") {
      const text = nodeText(node).replace(/\s+/g, " ").trim();
      if (isBoldOnlyHeading(node, text)) {
        flush();
        lines.push(`## ${text.replace(/\s*[:：]$/, "")}`);
        return;
      }
    }
    const isBlock = BLOCK_TAGS.has(name);
    if (isBlock) flush();
    nodeChildren(node).forEach(walk);
    if (isBlock) flush();
  };

  walk(root);
  flush();
  return cleanJdText(lines.join("\n"));
}

function isBoldOnlyHeading(node: DomNode, text: string): boolean {
  if (!text || text.length > 80 || /[.!?]$/.test(text)) return false;
  const meaningful = nodeChildren(node).filter((c) => !(c.type === "text" && !nodeText(c).trim()));
  if (meaningful.length !== 1) return false;
  const only = meaningful[0]!;
  const name = nodeName(only);
  return name !== undefined && EMPHASIS_TAGS.has(name);
}

/* ------------------------------------------------------------------ */
/* JSON-LD JobPosting                                                  */
/* ------------------------------------------------------------------ */

const NamedSchema = z.union([z.string(), z.object({ name: z.string().optional() }).loose()]);
const CountrySchema = z.union([z.string(), z.object({ name: z.string().optional() }).loose()]);
const AddressSchema = z.union([
  z.string(),
  z
    .object({
      streetAddress: z.string().optional(),
      addressLocality: z.string().optional(),
      addressRegion: z.string().optional(),
      addressCountry: CountrySchema.optional(),
    })
    .loose(),
]);
const PlaceSchema = z.union([
  z.string(),
  z.object({ address: AddressSchema.optional(), name: z.string().optional() }).loose(),
]);

export const JsonLdJobPostingSchema = z
  .object({
    title: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    hiringOrganization: NamedSchema.optional(),
    jobLocation: z.union([PlaceSchema, z.array(PlaceSchema)]).optional(),
    jobLocationType: z.union([z.string(), z.array(z.string())]).optional(),
    applicantLocationRequirements: z.unknown().optional(),
    employmentType: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .loose();
export type JsonLdJobPosting = z.infer<typeof JsonLdJobPostingSchema>;

function isJobPostingType(value: unknown): boolean {
  const types = Array.isArray(value) ? value : [value];
  return types.some((t) => typeof t === "string" && /(?:^|[/#:])JobPosting$/i.test(t));
}

/** Depth-first search for a JobPosting node in arbitrary JSON-LD (arrays, @graph, nesting). */
function findJobPosting(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 8 || value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (isJobPostingType(record["@type"])) return record;
  for (const key of ["@graph", "mainEntity", "itemListElement", "item"]) {
    const found = findJobPosting(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Returns the first valid JobPosting found in the page's JSON-LD scripts. */
export function findJsonLdJobPosting($: CheerioAPI): JsonLdJobPosting | null {
  const scripts = $("script[type='application/ld+json']").toArray();
  for (const script of scripts) {
    const raw = $(script).text().trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        // Some sites emit raw newlines inside JSON strings.
        parsed = JSON.parse(raw.replace(/[\r\n\t]+/g, " "));
      } catch {
        continue;
      }
    }
    const node = findJobPosting(parsed);
    if (!node) continue;
    const result = JsonLdJobPostingSchema.safeParse(node);
    if (result.success) return result.data;
  }
  return null;
}

function nameOf(value: z.infer<typeof NamedSchema> | undefined): string | undefined {
  if (!value) return undefined;
  return (typeof value === "string" ? value : value.name)?.trim() || undefined;
}

function formatPlace(place: z.infer<typeof PlaceSchema>): string | undefined {
  if (typeof place === "string") return place.trim() || undefined;
  const address = place.address;
  if (!address) return place.name?.trim() || undefined;
  if (typeof address === "string") return address.trim() || undefined;
  const parts = [address.addressLocality, address.addressRegion, nameOf(address.addressCountry)]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  return Array.from(new Set(parts)).join(", ") || place.name?.trim() || undefined;
}

export function jobPostingToFields(posting: JsonLdJobPosting): ExtractedFields {
  const places =
    posting.jobLocation === undefined
      ? []
      : Array.isArray(posting.jobLocation)
        ? posting.jobLocation
        : [posting.jobLocation];
  const locations = Array.from(new Set(places.map(formatPlace).filter((p): p is string => Boolean(p))));
  const locationTypes = [posting.jobLocationType ?? []].flat();
  if (locationTypes.some((t) => /telecommute/i.test(t))) locations.push("Remote");

  const employment = [posting.employmentType ?? []].flat().filter(Boolean);
  const descriptionHtml = posting.description ?? "";
  // Descriptions are usually HTML, sometimes entity-escaped HTML, sometimes plain text.
  const unescaped =
    /&lt;\w/.test(descriptionHtml) && !/<\w/.test(descriptionHtml) ? decodeOnce(descriptionHtml) : descriptionHtml;

  return {
    title: (posting.title ?? posting.name)?.trim() || undefined,
    company: nameOf(posting.hiringOrganization),
    location: locations.join(" · ") || undefined,
    employmentType: employment.length ? formatEmploymentType(employment.join(", ")) : undefined,
    text: /<\w/.test(unescaped) ? htmlToText(unescaped) : cleanJdText(unescaped),
    strategy: "json-ld",
  };
}

function decodeOnce(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/* ------------------------------------------------------------------ */
/* LinkedIn guest endpoint                                             */
/* ------------------------------------------------------------------ */

export function extractLinkedInGuest($: CheerioAPI): ExtractedFields | null {
  const markup = $(".show-more-less-html__markup, .description__text").first();
  if (markup.length === 0) return null;
  const text = htmlToText(markup.html() ?? "");
  const first = (selector: string) => $(selector).first().text().replace(/\s+/g, " ").trim() || undefined;

  const criteria = new Map<string, string>();
  $(".description__job-criteria-item").each((_, el) => {
    const label = $(el).find(".description__job-criteria-subheader").text().replace(/\s+/g, " ").trim().toLowerCase();
    const value = $(el).find(".description__job-criteria-text").text().replace(/\s+/g, " ").trim();
    if (label && value) criteria.set(label, value);
  });

  return {
    title: first(".top-card-layout__title, .topcard__title"),
    company: first(".topcard__org-name-link, .top-card-layout__second-subline .topcard__flavor a, .topcard__flavor"),
    location: first(".topcard__flavor--bullet"),
    employmentType: criteria.get("employment type"),
    text,
    strategy: "linkedin",
  };
}

/* ------------------------------------------------------------------ */
/* Generic main-content extraction                                     */
/* ------------------------------------------------------------------ */

const MAIN_CONTENT_SELECTORS = [
  "[itemtype*='JobPosting'] [itemprop='description']",
  "[itemtype*='JobPosting']",
  "#job-description",
  "#jobDescription",
  ".job-description",
  "[class*='job-description']",
  "[class*='jobDescription']",
  "[class*='job-details']",
  "[class*='job-detail']",
  "[data-testid*='job-description']",
  "main",
  "[role='main']",
  "article",
  "#content",
  ".content",
];

/** Minimum characters for a candidate container to count as "the" content. */
const MIN_MAIN_CONTENT = 200;

function metaContent($: CheerioAPI, selector: string): string | undefined {
  return $(selector).attr("content")?.replace(/\s+/g, " ").trim() || undefined;
}

export function extractMainContent($: CheerioAPI): ExtractedFields {
  const title =
    $("[itemtype*='JobPosting'] [itemprop='title']").first().text().trim() ||
    metaContent($, "meta[property='og:title']") ||
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $("title").first().text().replace(/\s+/g, " ").trim() ||
    undefined;
  const company =
    $("[itemprop='hiringOrganization'] [itemprop='name']").first().text().trim() ||
    metaContent($, "meta[property='og:site_name']") ||
    undefined;

  $(JUNK_SELECTOR).remove();
  $("script").remove();

  let text = "";
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const candidates = $(selector).toArray();
    for (const el of candidates) {
      const candidate = nodeToText(el);
      if (candidate.length >= MIN_MAIN_CONTENT && candidate.length > text.length) text = candidate;
    }
    if (text) break;
  }
  if (!text) {
    const body = $("body")[0];
    text = body ? nodeToText(body) : "";
  }
  if (!text)
    text = metaContent($, "meta[name='description']") ?? metaContent($, "meta[property='og:description']") ?? "";

  return { title, company, text, strategy: "main-content" };
}

/**
 * Chooses the best strategy for a fetched page: JSON-LD JobPosting first (ITviec, most ATSs),
 * then LinkedIn guest markup, then generic main-content extraction.
 */
export function extractFieldsFromHtml(html: string, opts: { linkedIn?: boolean } = {}): ExtractedFields {
  const $ = load(html);
  const posting = findJsonLdJobPosting($);
  if (posting) {
    const fields = jobPostingToFields(posting);
    if (fields.text.length >= 80) return fields;
  }
  if (opts.linkedIn) {
    const fields = extractLinkedInGuest($);
    if (fields && fields.text.length > 0) return fields;
  }
  const generic = extractMainContent($);
  // Keep JSON-LD metadata even when its description was too thin.
  if (posting) {
    const meta = jobPostingToFields(posting);
    return {
      ...generic,
      title: meta.title ?? generic.title,
      company: meta.company ?? generic.company,
      location: meta.location,
      employmentType: meta.employmentType,
    };
  }
  return generic;
}
