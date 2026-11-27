import type { Metadata } from "next";
import { GroundingCallout, ProfileScreen } from "@/features/profile/ProfileScreen";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your candidate profile, skills, work experience and CV — the only facts used for generated content.",
};

export default function ProfilePage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile &amp; CV</h1>
        <p className="text-muted-foreground text-sm">
          Keep your experience, skills and CV up to date — every interview package is tailored from them.
        </p>
      </header>
      <GroundingCallout />
      <ProfileScreen />
    </div>
  );
}
