"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CandidateProfile } from "@/domain/profile/schema";
import type { ProfilePayload } from "@/domain/profile/form";
import { PROFILE_QUERY_KEY, deleteCv, fetchProfile, updateProfile, uploadCv, type CvUploadResult } from "./api";

/** The local candidate profile (GET /api/profile). */
export function useProfileQuery() {
  return useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: fetchProfile });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation<CandidateProfile, Error, ProfilePayload>({
    mutationFn: updateProfile,
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_QUERY_KEY, profile),
  });
}

export function useUploadCv() {
  const queryClient = useQueryClient();
  return useMutation<CvUploadResult, Error, File>({
    mutationFn: uploadCv,
    onSuccess: ({ profile }) => queryClient.setQueryData(PROFILE_QUERY_KEY, profile),
  });
}

export function useRemoveCv() {
  const queryClient = useQueryClient();
  return useMutation<CandidateProfile, Error, void>({
    mutationFn: () => deleteCv(),
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_QUERY_KEY, profile),
  });
}
