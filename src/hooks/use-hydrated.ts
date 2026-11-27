"use client";

import { useSyncExternalStore } from "react";
import { useProgressStore } from "@/stores/progress-store";

const subscribe = (cb: () => void) => useProgressStore.persist.onFinishHydration(cb);
const getSnapshot = () => useProgressStore.persist.hasHydrated();
const getServerSnapshot = () => false;

/** True once persisted progress has been restored from localStorage. */
export function useProgressHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
