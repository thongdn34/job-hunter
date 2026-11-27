import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PackageNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <FileQuestion className="text-muted-foreground size-10" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Package not found</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        This interview package does not exist or was deleted. Pick another package from the dashboard or create a new
        one.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to dashboard
        </Link>
        <Link href="/packages/new" className={cn(buttonVariants())}>
          New Run #10 package
        </Link>
      </div>
    </div>
  );
}
