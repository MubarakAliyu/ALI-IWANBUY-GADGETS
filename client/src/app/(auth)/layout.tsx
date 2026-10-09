import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SITE } from "@/lib/site";

/**
 * The sign-in and registration shell (S-8): the form on the left, an approved brand photograph on the right
 * from `lg` up. On a phone the panel is gone entirely — a customer signing in on 4G should download a form,
 * not a photograph.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <header className="mb-10">
          <Link href="/" aria-label={`${SITE.name} home`}>
            <Logo variant="primary" width={120} priority />
          </Link>
        </header>

        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          {children}
        </main>

        <footer className="mt-10 text-caption text-text-muted">
          © {new Date().getFullYear()} {SITE.legalName} · RC {SITE.rcNumber}
        </footer>
      </div>

      <div data-surface="dark" className="relative hidden bg-brand-navy lg:block">
        <Image
          src="/images/apple-devices.webp"
          alt=""
          fill
          sizes="(max-width: 1024px) 0px, 50vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(21,111,191,0.85)_0%,rgba(13,68,117,0.95)_100%)]" />
        <div className="absolute inset-0 flex flex-col justify-end gap-3 p-12 text-on-dark">
          <Logo variant="markWhite" width={64} decorative />
          <p className="max-w-sm text-h2">Genuine devices, honest prices, warranty on every sale.</p>
          <p className="text-body-sm text-on-dark-muted">
            Order online, collect at the shop in {SITE.city}, or have it delivered.
          </p>
        </div>
      </div>
    </div>
  );
}
