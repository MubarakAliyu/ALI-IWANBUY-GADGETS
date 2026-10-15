"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/admin";

const MAX_IMAGES = 6;

export type EditorImage = { url: string; alt: string };

/**
 * The media section of the product editor (A-5).
 *
 * The first image is the one the storefront shows everywhere, so it is labelled as such and moved with arrow
 * buttons rather than dragged: a shop assistant on a phone can press a button, and a keyboard user can reach
 * one. Alt text is asked for per image, because a product photo with no description is a product nobody using
 * a screen reader can shop for.
 */
export function ProductImages({
  images,
  onChange,
}: {
  images: EditorImage[];
  onChange: (next: EditorImage[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function add(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Six images is the limit. Remove one first.`);
      return;
    }

    setUploading(true);
    const added: EditorImage[] = [];
    try {
      for (const file of [...files].slice(0, room)) {
        const result = await uploadImage(file, "products");
        added.push({ url: result.url, alt: "" });
      }
      onChange([...images, ...added]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That image could not be uploaded.");
      // Whatever did upload is kept — losing four good uploads because the fifth failed helps nobody.
      if (added.length > 0) {
        onChange([...images, ...added]);
      }
    } finally {
      setUploading(false);
      if (input.current) {
        input.current.value = "";
      }
    }
  }

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= images.length) {
      return;
    }
    const next = [...images];
    const moved = next[index] as EditorImage;
    next[index] = next[target] as EditorImage;
    next[target] = moved;
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {images.length > 0 ? (
        <ul className="grid gap-3">
          {images.map((image, index) => (
            <li
              key={image.url}
              className="flex flex-wrap items-start gap-3 rounded-md border border-grey-200 p-3"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-grey-100">
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" unoptimized />
                {index === 0 ? (
                  <span className="absolute inset-x-0 bottom-0 bg-brand-navy/85 py-0.5 text-center text-[10px] font-semibold text-white">
                    MAIN
                  </span>
                ) : null}
              </div>

              <div className="grid min-w-48 flex-1 gap-1.5">
                <Label htmlFor={`alt-${index}`} className="text-caption">
                  What is in this picture?
                </Label>
                <Input
                  id={`alt-${index}`}
                  value={image.alt}
                  maxLength={160}
                  placeholder="iPhone 15 in blue, front and back"
                  onChange={(event) => {
                    const next = [...images];
                    next[index] = { ...image, alt: event.target.value };
                    onChange(next);
                  }}
                />
              </div>

              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move image ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowLeftIcon aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move image ${index + 1} later`}
                  disabled={index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => onChange(images.filter((_, at) => at !== index))}
                >
                  <Trash2Icon aria-hidden="true" className="size-4 text-danger-text" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-grey-200 bg-grey-50 px-4 py-8 text-center text-body-sm text-text-muted">
          No pictures yet. The first one you add is the one customers see in the shop.
        </p>
      )}

      <div className="flex items-center gap-3">
        {/* Visually hidden rather than `hidden`, so it stays in the accessibility tree and can be reached —
            which means it needs its own name, since the button beside it is what people actually click. */}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          id="product-images"
          aria-label="Choose pictures to upload"
          onChange={(event) => void add(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading || images.length >= MAX_IMAGES}
          loading={uploading}
          loadingLabel="Uploading…"
          onClick={() => input.current?.click()}
        >
          <ImagePlusIcon aria-hidden="true" className="size-4" />
          Add pictures
        </Button>
        <p className="text-caption text-text-muted">
          {images.length} of {MAX_IMAGES} · JPEG, PNG or WebP, up to 8MB each
        </p>
      </div>
    </div>
  );
}
