/**
 * Idempotent seed: `pnpm db:seed` (= `prisma db seed` -> tsx --conditions=react-server prisma/seed.ts).
 *
 * 1. Ensures the default candidate profile exists (profile repository creates it on first access).
 * 2. Upserts the singleton UserPreference "default".
 * 3. Upserts the curated ISB sample package (company, application, seed JD, sections, normalized
 *    rows, research sources). Whatever sections currently exist in src/content/samples/isb are
 *    seeded; missing ones stay pending, invalid ones are stored as failed and reported.
 */
import { isbSamplePackage } from "@/content/samples/isb";
import { prisma } from "@/server/db";
import { upsertFullPackage } from "@/server/repositories/package-repository";
import { getProfile } from "@/server/repositories/profile-repository";

async function main(): Promise<void> {
  const started = Date.now();
  const lines: string[] = [];

  const profile = await getProfile();
  const profileRows = await prisma.candidateProfile.count();
  lines.push(`profile        "${profile.headline}" — ${profileRows} row(s) in CandidateProfile`);

  await prisma.userPreference.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
  lines.push('preferences    UserPreference "default" ensured');

  const result = await upsertFullPackage(isbSamplePackage);
  const c = result.counts;
  lines.push(
    `package        ${result.slug} (${result.packageId})`,
    `  sections     ${result.readySections.length} ready, ${result.emptySections.length} empty, ${result.failedSections.length} failed`,
    `  rows         ${c.topics} topics, ${c.questions} questions, ${c.followUps} follow-ups, ${c.systemDesigns} system designs, ` +
      `${c.codingExercises} coding, ${c.behavioral} behavioral, ${c.flashcards} flashcards, ${c.studyPlans} study plans`,
    `  sources      ${c.researchSources} research source(s)`,
  );
  if (result.emptySections.length) lines.push(`  empty        ${result.emptySections.join(", ")}`);
  for (const failed of result.failedSections) lines.push(`  FAILED       ${failed.key}: ${failed.error}`);

  console.log(`\nSeed complete in ${Date.now() - started} ms\n${lines.map((l) => `  ${l}`).join("\n")}\n`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
