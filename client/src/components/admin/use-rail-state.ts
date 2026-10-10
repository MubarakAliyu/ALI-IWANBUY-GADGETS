"use client";

import { useCallback, useSyncExternalStore } from "react";

const COLLAPSED_KEY = "aib-admin-rail";

/**
 * Whether the sidebar is collapsed to its rail, remembered per browser (A-2).
 *
 * `localStorage` is an external store, so this reads it with `useSyncExternalStore` rather than copying it
 * into state inside an effect. The server snapshot is "expanded", which is also what the first client render
 * uses — so the markup matches, and React swaps in the remembered value right after hydration without a
 * cascading re-render.
 */
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab of the dashboard collapsing its sidebar should collapse this one too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStored(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    // Storage blocked: the sidebar is simply expanded every time, which is the safe default.
    return false;
  }
}

export function useRailState(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribe,
    readStored,
    // On the server there is no browser to ask, so the markup is always the expanded sidebar.
    () => false,
  );

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, readStored() ? "0" : "1");
    } catch {
      // Not being able to remember the choice is not a reason to refuse it — but then there is nothing to
      // emit either, since nothing changed.
      return;
    }
    emit();
  }, []);

  return [collapsed, toggle];
}
