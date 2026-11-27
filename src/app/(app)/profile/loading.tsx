import { ProfileSkeleton } from "@/features/profile/ProfileScreen";

export default function ProfileLoading() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <ProfileSkeleton />
    </div>
  );
}
