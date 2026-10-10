/**
 * The shop's own details, read from Store Settings (ADR-017).
 *
 * Every page that prints the address, the phone number, the email or the opening hours gets them from here,
 * so the owner editing Store Settings changes the whole site. The call is a cached GET with no cookies, so
 * the pages that use it stay statically rendered with a 60-second revalidate (ADR-011).
 *
 * When the API cannot be reached the pages still render: callers are handed `null` and show what they can.
 * There is deliberately no hard-coded fallback address or account number — a stale address in the markup is
 * worse than none, and a wrong account number is money gone.
 */

import type { PublicSettings } from "@aib/shared";
import { getPublicSettings } from "@/lib/catalog";

export type StoreDetails = PublicSettings;

export async function getStoreDetails(): Promise<StoreDetails | null> {
  try {
    return await getPublicSettings();
  } catch {
    return null;
  }
}
