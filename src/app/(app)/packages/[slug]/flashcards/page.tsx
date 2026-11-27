import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPackageBySlug } from "@/server/repositories/package-repository";
import { sectionAnchorId } from "@/domain/package/bookmarks";
import { FlashcardDeck } from "@/features/flashcards/FlashcardDeck";
import { FlashcardShortcutsToggle } from "@/features/flashcards/FlashcardShortcutsToggle";
import { ProgressSync } from "@/features/study/ProgressSync";

// Reads the local database on every request.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  return { title: pkg ? `Flashcards · ${pkg.meta.companyName} — ${pkg.meta.jobTitle}` : "Flashcards" };
}

const SHORTCUTS: Array<[keys: string[], action: string]> = [
  [["←", "→"], "Previous / next card"],
  [["Space", "Enter"], "Flip card"],
  [["S"], "Shuffle deck"],
  [["K"], "Mark known"],
  [["R"], "Mark for review"],
];

export default async function FlashcardsPage({ params }: Props) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  const cards = pkg.sections.cheatsheet?.flashcards ?? [];
  const backHref = `/packages/${pkg.meta.slug}#${sectionAnchorId(pkg.meta.companyCode, "cheatsheet")}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <ProgressSync slug={pkg.meta.slug} />

      <header className="flex flex-col gap-2">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1.5 rounded-md text-sm outline-none focus-visible:ring-3"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to cheat sheet
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Flashcards</h1>
        <p className="text-muted-foreground text-sm">
          {pkg.meta.companyName} · {pkg.meta.jobTitle} · {cards.length} {cards.length === 1 ? "card" : "cards"}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
        {cards.length > 0 ? (
          <FlashcardDeck packageSlug={pkg.meta.slug} cards={cards} globalShortcuts />
        ) : (
          <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
            Flashcards for this package have not been generated yet.{" "}
            <Link href={`/packages/${pkg.meta.slug}`} className="hover:text-foreground underline underline-offset-4">
              Open the package
            </Link>
            .
          </div>
        )}

        <aside aria-labelledby="flashcard-shortcuts" className="bg-card h-fit rounded-xl border p-4 text-sm">
          <h2 id="flashcard-shortcuts" className="mb-3 font-semibold">
            Keyboard shortcuts
          </h2>
          <dl className="flex flex-col gap-2">
            {SHORTCUTS.map(([keys, action]) => (
              <div key={action} className="flex items-center justify-between gap-3">
                <dt className="flex gap-1">
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className="bg-muted text-foreground inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 font-mono text-xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </dt>
                <dd className="text-muted-foreground text-right">{action}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 border-t pt-3">
            <FlashcardShortcutsToggle />
          </div>
        </aside>
      </div>
    </div>
  );
}
