import { AppShell } from "@/features/app-shell/AppShell";
import { listPackages } from "@/server/repositories/package-repository";

// Reads the local database on every request.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const packages = await listPackages();
  return <AppShell packages={packages}>{children}</AppShell>;
}
