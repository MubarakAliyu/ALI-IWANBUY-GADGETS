import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

/** The 404 body, shared by the root boundary and the storefront one (S-14). */
export function NotFoundContent() {
  return (
    <Container className="grid justify-items-center gap-5 py-20 text-center">
      <p className="text-display numeric text-primary-200">404</p>
      <h1 className="text-h1 text-brand-navy">We cannot find that page</h1>
      <p className="max-w-md text-body text-text-muted">
        The link may be old, or the product may have been taken off sale. The shop is still here.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to the home page</Link>
        </Button>
      </div>
    </Container>
  );
}
