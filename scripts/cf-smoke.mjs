#!/usr/bin/env node
/**
 * Smoke test for the Cloudflare build running in workerd (`pnpm cf:preview`, or any deployment
 * reachable without Access). Exercises D1, the Workflow-based generation, the internal-route
 * guard, the SSRF guard and server rendering. Needs AI_PROVIDER=mock on the target.
 *
 *   node scripts/cf-smoke.mjs [baseUrl=http://localhost:8787] [--slow]
 *
 * --slow additionally checks liveness + cancellation of a long job; start the target with a slow
 * mock first so a job takes well over 20 s, e.g. `wrangler dev --var MOCK_DELAY_MS:3000`.
 */
const SAMPLE_JD =
  "Senior Frontend Engineer\nRequirements\n- 5+ years of React and TypeScript\n- Real-time dashboards with WebSockets\n- Testing with Playwright\nNice to have\n- Cloudflare Workers";
const args = process.argv.slice(2);
const slow = args.includes("--slow");
const base = (args.find((a) => !a.startsWith("--")) ?? process.env.SMOKE_BASE_URL ?? "http://localhost:8787").replace(
  /\/$/,
  "",
);
const results = [];

async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name} (${Date.now() - started} ms)${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.error(`✗ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function json(path, init) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await step("AI status reports the mock provider", async () => {
  const { status, body } = await json("/api/ai/status");
  expect(status === 200 && body.provider === "mock" && body.configured, `got ${status} ${JSON.stringify(body)}`);
});

await step("profile is read from D1 (default profile created on first read)", async () => {
  const { status, body } = await json("/api/profile");
  expect(status === 200 && body.profile?.headline, `got ${status} ${JSON.stringify(body).slice(0, 200)}`);
});

await step("internal routes are not reachable from outside", async () => {
  const { status } = await json("/api/internal/generation/run", { method: "POST", body: "{}" });
  expect(status === 404, `expected 404, got ${status}`);
});

await step("ISB sample package page renders on the server", async () => {
  const res = await fetch(`${base}/packages/isb-vietnam-senior-frontend-developer`);
  const html = await res.text();
  expect(res.status === 200 && html.includes("BOOKMARK_ISB_JD"), `got ${res.status}, ${html.length} bytes`);
  return `${Math.round(html.length / 1024)} KB`;
});

await step("job URL extraction refuses private addresses", async () => {
  const { status, body } = await json("/api/jd/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "http://169.254.169.254/latest/meta-data" }),
  });
  expect(status === 422 && body.code === "BLOCKED_HOST", `got ${status} ${JSON.stringify(body)}`);
});

/** Minimal one-page PDF containing `text` (valid xref offsets), for the CV upload check. */
function tinyPdf(text) {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}

await step("standalone HTML export renders sanitized Markdown", async () => {
  const res = await fetch(`${base}/api/packages/isb-vietnam-senior-frontend-developer/export?format=html`);
  const html = await res.text();
  expect(res.status === 200 && html.includes("<details") && !/<script>alert/i.test(html), `got ${res.status}`);
  return `${Math.round(html.length / 1024)} KB`;
});

await step("profile save round-trips through D1 (batched writes)", async () => {
  const { body } = await json("/api/profile");
  const original = body.profile;
  const put = (profile) =>
    json("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile),
    });
  const saved = await put({ ...original, headline: "Smoke headline" });
  expect(saved.status === 200 && saved.body.profile.headline === "Smoke headline", `PUT: ${saved.status}`);
  expect(saved.body.profile.experiences.length === original.experiences.length, "experiences were not kept");
  const restored = await put(original);
  expect(restored.status === 200 && restored.body.profile.headline === original.headline, "restore failed");
});

await step("PDF CV upload is parsed on the Worker (unpdf)", async () => {
  const form = new FormData();
  form.append("file", tinyPdf("Senior Frontend Engineer with React"), "cv.pdf");
  const res = await json("/api/profile/cv", { method: "POST", body: form });
  expect(res.status === 200, `upload: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
  expect(JSON.stringify(res.body).includes("Senior Frontend Engineer"), "extracted text missing");
  const removed = await fetch(`${base}/api/profile/cv`, { method: "DELETE" });
  expect(removed.ok, `delete: ${removed.status}`);
});

await step("mock interview session starts for the sample", async () => {
  const { status, body } = await json("/api/mock/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ packageSlug: "isb-vietnam-senior-frontend-developer" }),
  });
  expect(status === 201 || status === 200, `got ${status} ${JSON.stringify(body).slice(0, 200)}`);
});

let slug;
await step("new package generates all 16 sections through the Workflow", async () => {
  const created = await json("/api/packages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      companyName: "Smoke Test Co",
      jobTitle: "Senior Frontend Engineer",
      rawText: SAMPLE_JD,
    }),
  });
  expect(created.status === 201 && created.body.slug, `create: ${created.status} ${JSON.stringify(created.body)}`);
  slug = created.body.slug;
  let job;
  for (let i = 0; i < 120; i += 1) {
    job = (await json(`/api/packages/${slug}/jobs/latest`)).body.job;
    if (job && !["queued", "running"].includes(job.status)) break;
    await sleep(1000);
  }
  expect(job?.status === "succeeded", `job ended as ${job?.status}: ${job?.error ?? ""}`);
  const pkg = (await json(`/api/packages/${slug}`)).body.package;
  const ready = Object.values(pkg.sectionStates).filter((s) => s.status === "ready").length;
  expect(ready === 16, `${ready}/16 sections ready`);
  return `job ${job.id}`;
});

await step("study progress is stored in D1", async () => {
  expect(slug, "no package was created");
  const progress = {
    studied: ["x-q01"],
    favorites: [],
    completedTopics: [],
    flashcards: { known: [], review: [], reviewedCount: 0 },
    studyPlanTasks: [],
    projectChecklist: [],
    updatedAt: new Date().toISOString(),
  };
  const put = await json(`/api/progress/${slug}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(progress),
  });
  expect(put.status === 200, `PUT: ${put.status} ${JSON.stringify(put.body).slice(0, 200)}`);
  const got = await json(`/api/progress/${slug}`);
  expect(JSON.stringify(got.body).includes("x-q01"), "progress not persisted");
});

if (slow) {
  await step("long job stays alive past the 15 s grace period and can be cancelled", async () => {
    const created = await json("/api/packages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyName: "Slow Co", jobTitle: "Senior Frontend Engineer", rawText: SAMPLE_JD }),
    });
    expect(created.status === 201, `create: ${created.status} ${JSON.stringify(created.body)}`);
    const slowSlug = created.body.slug;
    await sleep(20_000);
    let job = (await json(`/api/packages/${slowSlug}/jobs/latest`)).body.job;
    expect(job.status === "running", `after 20 s the job is ${job.status} (${job.error ?? ""})`);
    const cancel = await json(`/api/generation-jobs/${job.id}/cancel`, { method: "POST" });
    expect(cancel.status === 200, `cancel: ${cancel.status}`);
    for (let i = 0; i < 60 && ["queued", "running"].includes(job.status); i += 1) {
      await sleep(1000);
      job = (await json(`/api/packages/${slowSlug}/jobs/latest`)).body.job;
    }
    expect(job.status === "cancelled", `job ended as ${job.status}`);
    const pkg = (await json(`/api/packages/${slowSlug}`)).body.package;
    const stuck = Object.values(pkg.sectionStates).filter((s) => s.status === "generating").length;
    expect(stuck === 0, `${stuck} sections left "generating"`);
    await fetch(`${base}/api/packages/${slowSlug}`, { method: "DELETE" });
  });
}

await step("generated package can be deleted", async () => {
  expect(slug, "no package was created");
  const res = await fetch(`${base}/api/packages/${slug}`, { method: "DELETE" });
  expect(res.status === 204, `got ${res.status}`);
  const after = await json(`/api/packages/${slug}`);
  expect(after.status === 404, `still there: ${after.status}`);
});

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} smoke checks passed against ${base}`);
process.exit(failed ? 1 : 0);
