"use client";

import dynamic from "next/dynamic";
import { useUiStore } from "@/stores/ui";

/**
 * The mini-cart drawer is never on screen when a page first paints, so its panel — and the dialog primitive
 * it is built from — is fetched the first time someone opens the cart rather than with every page.
 */
const MiniCart = dynamic(() => import("./mini-cart").then((module) => module.MiniCart), { ssr: false });

export function MiniCartMount() {
  const open = useUiStore((state) => state.miniCartOpen);
  const opened = useUiStore((state) => state.miniCartEverOpened);

  if (!open && !opened) {
    return null;
  }
  return <MiniCart />;
}
