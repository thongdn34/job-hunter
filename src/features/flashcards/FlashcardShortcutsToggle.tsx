"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { useFlashcardShortcutsEnabled, useFlashcardShortcutsStore } from "./shortcuts-store";

/** On/off switch for the flashcards page's keyboard shortcuts (WCAG 2.1.4). */
export function FlashcardShortcutsToggle() {
  const enabled = useFlashcardShortcutsEnabled();
  const id = useId();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={enabled}
          aria-describedby={hintId}
          onCheckedChange={(on) => useFlashcardShortcutsStore.getState().setEnabled(on)}
          nativeButton
          render={<button type="button" />}
        />
        <label htmlFor={id} className="text-sm select-none">
          Keyboard shortcuts
        </label>
      </div>
      <p id={hintId} className="text-muted-foreground text-xs">
        {enabled
          ? "Work anywhere on this page (not inside menus or dialogs)."
          : "Off: use the on-screen buttons; ←/→ and Space still work while focus is in the deck."}
      </p>
    </div>
  );
}
