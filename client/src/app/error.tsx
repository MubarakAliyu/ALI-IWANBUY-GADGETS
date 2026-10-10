"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

/**
 * Something failed while rendering (S-14). The customer gets a way forward and the shop's phone number; the
 * detail goes to the console, never onto the page.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="grid justify-items-center gap-5 py-20 text-center">
      <h1 className="text-h1 text-brand-navy">Something went wrong</h1>
      <p className="max-w-md text-body text-text-muted">
        The page could not be loaded. Try again — if it keeps happening,{" "}
        <Link href="/contact" className="font-semibold text-brand-primary">
          call or message the shop
        </Link>{" "}
        and we will take your order by hand.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go to the home page</Link>
        </Button>
      </div>
      {error.digest ? <p className="text-caption numeric text-text-muted">Reference {error.digest}</p> : null}
    </Container>
  );
}
