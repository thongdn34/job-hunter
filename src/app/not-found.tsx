import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Page not found" };

/** Root 404 (rendered inside the root layout, outside the AppShell). */
export default function NotFound() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <BriefcaseBusiness className="text-primary size-10" aria-hidden />
      <p className="text-muted-foreground mt-4 font-mono text-sm">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        The page you are looking for does not exist. Head back to the dashboard to open an interview package.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-6")}>
        Go to dashboard
      </Link>
    </main>
  );
}
