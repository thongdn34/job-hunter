import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPackageBySlug } from "@/server/repositories/package-repository";
import { PackageView } from "@/features/package-view/PackageView";

// Reads the local database on every request (also set on the (app) layout).
export const dynamic = "force-dynamic";

/** Deduplicates the lookup between generateMetadata and the page within one request. */
const loadPackage = cache(getPackageBySlug);

export async function generateMetadata({ params }: PageProps<"/packages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await loadPackage(slug);
  if (!pkg) return { title: "Package not found" };
  const { companyName, jobTitle, isSample } = pkg.meta;
  return {
    title: `${companyName} — ${jobTitle}`,
    description: `Run #10 interview preparation package for ${jobTitle} at ${companyName}${isSample ? " (sample)" : ""}.`,
  };
}

export default async function PackagePage({ params }: PageProps<"/packages/[slug]">) {
  const { slug } = await params;
  const pkg = await loadPackage(slug);
  if (!pkg) notFound();
  return <PackageView key={pkg.meta.slug} pkg={pkg} />;
}
