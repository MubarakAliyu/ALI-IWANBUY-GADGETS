import type * as React from "react";
import { Container } from "@/components/shared/container";

/**
 * The shell every written page shares (S-13): a heading, an optional standfirst, and a measured column of
 * text. Headings and lists inside are styled here, so each page file holds only its words.
 */
export function Article({
  title,
  standfirst,
  children,
}: {
  title: string;
  standfirst?: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="py-10">
      <header className="mb-8 grid max-w-prose gap-2">
        <h1 className="text-h1 text-brand-navy">{title}</h1>
        {standfirst ? <p className="text-body text-text-muted">{standfirst}</p> : null}
      </header>
      <div className="grid max-w-prose gap-5 text-body text-brand-navy [&_a]:text-brand-primary [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-4 [&_h2]:text-h3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-2">
        {children}
      </div>
    </Container>
  );
}
