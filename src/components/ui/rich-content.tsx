import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import { headingsOf } from "@/lib/headings";
import { extensions } from "@/lib/tiptap";

/** Renders Tiptap JSON to HTML on the server (no editor, no client JS). generateHTML only emits what the
 *  schema in lib/tiptap.ts allows, so stored content can't inject other tags or attributes. Headings get ids
 *  (see headingsOf) so a contents list can link to them. */
export function RichContent({ doc, className }: { doc: JSONContent; className?: string }) {
  const ids = headingsOf(doc).map((h) => h.id);
  let i = 0;
  const html = generateHTML(doc, extensions)
    .replace(/<h([23])>/g, (_, level) => `<h${level} id="${ids[i++]}">`)
    // A published task list is read-only, and its checkboxes need a name: the label around them holds no text.
    .replace(/<input type="checkbox"( checked="checked")?>/g, (_, checked) => `<input type="checkbox"${checked ?? ""} disabled aria-label="${checked ? "Done" : "To do"}">`);
  return <div className={`rich ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
