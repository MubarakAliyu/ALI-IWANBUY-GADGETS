"use client";

import { useEffect } from "react";

/**
 * Warns before the tab is closed or reloaded with unsaved work in it (A-5).
 *
 * This is the browser's own dialog, which is all `beforeunload` can do — the wording is the browser's and
 * cannot be changed. It does not catch an in-app navigation; the save bar's "Unsaved changes" label is what
 * covers that, and the editor's Cancel link is explicit about leaving.
 */
export function useUnsavedGuard(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Some browsers still require a returned value for the dialog to appear.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
