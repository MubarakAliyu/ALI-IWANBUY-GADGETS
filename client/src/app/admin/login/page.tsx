import type { Metadata } from "next";
import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Logo } from "@/components/brand/logo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dashboard sign-in",
  description: "Staff sign-in for the ALI_IWANBUY Gadgets dashboard.",
  robots: { index: false, follow: false },
};

/**
 * The dashboard's front door (A-1). A navy panel rather than the storefront's photograph: this is the shop's
 * back office, and it should not look like the shop. The panel is gone below `lg` — staff confirm payments
 * from a phone at the counter, and that screen is for the form alone.
 */
export default function AdminLoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <header className="mb-10">
          <Link href="/" aria-label={`${SITE.name} home`}>
            <Logo variant="primary" width={120} priority />
          </Link>
        </header>

        <main id="main" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <AdminLoginForm />
        </main>

        <footer className="mt-10 text-caption text-text-muted">
          © {new Date().getFullYear()} {SITE.legalName}
        </footer>
      </div>

      <div
        data-surface="dark"
        className="relative hidden flex-col justify-between bg-brand-navy p-12 lg:flex"
      >
        <Logo variant="horizontalWhite" width={200} decorative />

        <div className="grid gap-4">
          <p className="max-w-md text-h1 text-on-dark">The shop, from the inside.</p>
          <p className="max-w-md text-body text-on-dark-muted">
            Orders, payments, stock and customers — one place, with every change recorded against the person
            who made it.
          </p>
        </div>

        <p className="text-caption text-on-dark-muted">Clean. Modern. Reliable.</p>
      </div>
    </div>
  );
}
