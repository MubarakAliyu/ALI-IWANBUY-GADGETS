import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

/**
 * The home hero (S-2), built to the "NEW ARRIVALS" panel in the Brand Guidelines' Application Layouts: a
 * `#156FBF → #0D4475` gradient, the white AB mark, an uppercase display headline and a white pill CTA. The
 * approved product photograph sits beside it from `lg` up.
 */
export function Hero() {
  return (
    <section
      data-surface="dark"
      className="relative overflow-hidden bg-[linear-gradient(160deg,var(--color-brand-primary)_0%,var(--color-primary-700)_100%)] text-on-dark"
    >
      <Container className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div className="grid justify-items-center gap-5 text-center lg:justify-items-start lg:text-left">
          <Logo variant="markWhite" width={88} decorative />
          <h1 className="text-h1 uppercase sm:text-display">New arrivals</h1>
          <p className="max-w-md text-body text-on-dark-muted">
            The latest tech at your fingertips. Phones, laptops, watches and audio — in stock in Birnin Kebbi,
            with warranty and a receipt.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild variant="onDark" size="hero" className="rounded-full px-8">
              <Link href="/shop">SHOP NOW</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="hero"
              className="rounded-full text-on-dark hover:bg-white/10 active:bg-white/20"
            >
              <Link href="/category/phones">Browse phones</Link>
            </Button>
          </div>
        </div>

        <div className="relative hidden aspect-[4/3] overflow-hidden rounded-lg lg:block">
          <Image
            src="/images/gadgets.webp"
            alt="Headphones, a speaker and a smartphone arranged on a pale background"
            fill
            priority
            sizes="(max-width: 1024px) 0px, 560px"
            className="object-cover"
          />
        </div>
      </Container>
    </section>
  );
}
