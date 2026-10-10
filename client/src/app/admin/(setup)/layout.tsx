import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getAdminSession } from "@/lib/admin";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The two pages that stand between signing in and using the dashboard: choosing a real password, and setting
 * a payment PIN. Deliberately without the shell — there is one thing to do here, and a sidebar full of pages
 * the server would refuse is not help.
 */
export default async function AdminSetupLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession().catch(() => null);

  if (!session?.admin) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-grey-50 px-4 py-8 sm:px-10">
      <header className="mb-10">
        <Logo variant="primary" width={120} priority />
      </header>

      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="rounded-lg border border-grey-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      </main>

      <footer className="mt-10 text-center text-caption text-text-muted">
        © {new Date().getFullYear()} {SITE.legalName}
      </footer>
    </div>
  );
}
