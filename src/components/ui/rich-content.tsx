import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import { extensions } from "@/lib/tiptap";

/** Renders Tiptap JSON to HTML on the server (no editor, no client JS). generateHTML only emits what the
 *  schema in lib/tiptap.ts allows, so stored content can't inject other tags or attributes. */
export function RichContent({ doc, className }: { doc: JSONContent; className?: string }) {
  return <div className={`rich ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: generateHTML(doc, extensions) }} />;
}
