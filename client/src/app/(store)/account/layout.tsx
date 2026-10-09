import type { Metadata } from "next";
import { AccountNav } from "@/components/account/account-nav";
import { Container } from "@/components/shared/container";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/**
 * The account area (S-12). A side navigation from `lg` up, a row of tabs below it — the same three
 * destinations either way, so the shape of the area never changes under a customer.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-8">
      <h1 className="mb-6 text-h1 text-brand-navy">Your account</h1>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
