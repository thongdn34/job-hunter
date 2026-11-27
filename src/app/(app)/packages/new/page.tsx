import type { Metadata } from "next";
import { NewPackageWizard } from "@/features/generation/NewPackageWizard";

export const metadata: Metadata = {
  title: "New Run #10 package",
  description: "Create a personalized interview-preparation package from a job description.",
};

export default function NewPackagePage() {
  return <NewPackageWizard />;
}
