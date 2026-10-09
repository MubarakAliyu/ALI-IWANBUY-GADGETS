"use client";

import { create } from "zustand";

/**
 * Which overlays are open. Kept out of the cart store so that adding a product and opening the mini-cart stay
 * separate concerns, and nothing here is persisted — a reload should never reopen a panel.
 */
type UiState = {
  miniCartOpen: boolean;
  /** Stays true after the first open, so the drawer is not torn down and re-fetched each time it closes. */
  miniCartEverOpened: boolean;
  mobileNavOpen: boolean;
  setMiniCartOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  miniCartOpen: false,
  miniCartEverOpened: false,
  mobileNavOpen: false,
  setMiniCartOpen: (open) =>
    set(open ? { miniCartOpen: true, miniCartEverOpened: true } : { miniCartOpen: false }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
