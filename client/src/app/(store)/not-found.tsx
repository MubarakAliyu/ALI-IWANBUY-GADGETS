import { NotFoundContent } from "@/components/shared/not-found-content";

export const metadata = { title: "Page not found" };

/** A 404 raised inside the storefront — an unknown product or category — keeps the header and footer. */
export default function StoreNotFound() {
  return <NotFoundContent />;
}
