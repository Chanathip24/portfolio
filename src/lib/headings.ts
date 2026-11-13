import type { JSONContent } from "@tiptap/core";

export type Heading = { id: string; text: string; level: 2 | 3 };

const textOf = (node: JSONContent): string => node.text ?? node.content?.map(textOf).join("") ?? "";
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";

/** The h2/h3 headings of a Tiptap document, in order, each with a unique id. RichContent puts the same ids on the
 *  rendered headings (by position), and the contents list links to them, so the two always agree. */
export function headingsOf(doc: JSONContent): Heading[] {
  const found: Heading[] = [];
  const seen = new Map<string, number>();
  const walk = (node: JSONContent) => {
    if (node.type === "heading" && (node.attrs?.level === 2 || node.attrs?.level === 3)) {
      const text = textOf(node);
      const base = slugify(text);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      found.push({ id: n === 1 ? base : `${base}-${n}`, text, level: node.attrs.level });
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return found;
}
