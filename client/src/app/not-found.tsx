import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { NotFoundContent } from "@/components/shared/not-found-content";

export const metadata = { title: "Page not found" };

/**
 * The 404 for a URL that matches no route at all. It carries its own slim chrome, because it renders outside
 * the storefront layout.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-grey-200">
        <Container className="flex h-16 items-center">
          <Link href="/" aria-label="ALI_IWANBUY Gadgets home">
            <Logo variant="primary" width={104} />
          </Link>
        </Container>
      </header>
      <main className="flex-1">
        <NotFoundContent />
      </main>
    </div>
  );
}
