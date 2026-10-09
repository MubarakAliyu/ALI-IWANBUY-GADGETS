"use client";

import { useState } from "react";
import type { ProductImage } from "@aib/shared";
import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The product gallery (S-5): thumbnails on the side, zoom on hover for a mouse, and a swipeable row of full
 * images on a phone. Only one image is ever the "main" one, and the thumbnails are real buttons so the
 * gallery works from the keyboard.
 */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  if (!main) {
    return <div className="aspect-square rounded-md border border-grey-200 bg-grey-50" />;
  }

  return (
    <div className="grid gap-3">
      {/* Phone: swipe through the full-size images. */}
      <ul className="scroll-slim -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:hidden">
        {images.map((image, index) => (
          <li
            key={image.url}
            className="relative aspect-square w-[85%] shrink-0 snap-center overflow-hidden rounded-md border border-grey-200 bg-grey-50"
          >
            <Image
              src={image.url}
              alt={index === 0 ? image.alt || name : `${name} — view ${index + 1}`}
              fill
              priority={index === 0}
              sizes="85vw"
              className="object-contain p-4"
            />
          </li>
        ))}
      </ul>

      {/* Tablet and up: one main image that magnifies on hover, with thumbnails under it. */}
      <div className="hidden sm:block">
        <div className="group relative aspect-square overflow-hidden rounded-md border border-grey-200 bg-grey-50">
          <Image
            src={main.url}
            alt={main.alt || name}
            fill
            // Eager, but not `priority`: the phone layout above already preloads this image at the size it
            // needs, and a second preload for a copy that is hidden below `sm` would be bytes wasted on the
            // critical path.
            loading="eager"
            sizes="(max-width: 1024px) 50vw, 600px"
            className="object-contain p-6 transition-transform duration-200 ease-out group-hover:scale-125"
          />
        </div>

        {images.length > 1 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {images.map((image, index) => (
              <li key={image.url}>
                <button
                  type="button"
                  aria-label={`Show view ${index + 1} of ${name}`}
                  aria-current={index === active}
                  onClick={() => setActive(index)}
                  className={cn(
                    "relative size-16 overflow-hidden rounded-sm border bg-grey-50 transition-colors duration-150 ease-out",
                    index === active ? "border-brand-primary" : "border-grey-200 hover:border-grey-300",
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="64px" className="object-contain p-1" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
