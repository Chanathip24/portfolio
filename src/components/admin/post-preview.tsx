"use client";

import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import { useMemo } from "react";
import { extensions } from "@/lib/tiptap";

/** The post as a visitor will read it, drawn from what is in the form right now (saved or not). The body goes through the same
 *  Tiptap schema as the public page, so only the tags and attributes it allows are ever produced. */
export function PostPreview({ title, excerpt, image, imageAlt, category, minutes, note, doc }: {
  title: string; excerpt: string; image: string; imageAlt: string; category: string; minutes: number; note: string; doc: JSONContent;
}) {
  const html = useMemo(() => {
    try { return generateHTML(doc, extensions); } catch { return ""; }
  }, [doc]);
  return (
    <section aria-label="Preview of the post" className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-xl border border-border bg-card p-5 sm:p-10">
      <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Preview: this is how visitors will read it. {note}</p>
      <header className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{[category, `${minutes} min read`].filter(Boolean).join(" · ")}</p>
        <h1 className="text-4xl leading-tight font-medium tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>{title || "Untitled post"}</h1>
        {excerpt && <p className="text-lg text-muted-foreground">{excerpt}</p>}
      </header>
      {image && (
        // A plain img: a preview of an address typed in the form, not a page image that needs optimising.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={imageAlt} className="aspect-video w-full rounded-xl object-cover" />
      )}
      {html ? <div className="rich" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="text-sm text-muted-foreground">The body is empty. Write something in the Edit tab.</p>}
    </section>
  );
}
