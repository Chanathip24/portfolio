import Details, { DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import Highlight from "@tiptap/extension-highlight";
import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { Callout } from "@/lib/tiptap-callout";

/** The one Tiptap schema for project pages. Rendering (RichContent) and the future editor (CRUD)
 *  must both use this list, so what can be written is exactly what can be shown.
 *  StarterKit brings paragraphs, headings, bold/italic/strike/underline/code, links, lists, quotes,
 *  code blocks and rules; the rest is added below. */
/** An image with alt text and an optional caption. With a caption it is written as <figure><img><figcaption>, otherwise as a plain <img>. */
const CaptionedImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), caption: { default: "", parseHTML: (el) => el.closest("figure")?.querySelector("figcaption")?.textContent ?? "", renderHTML: () => ({}) } };
  },
  parseHTML() {
    return [
      { tag: "figure", getAttrs: (el) => { const img = (el as HTMLElement).querySelector("img"); return img ? { src: img.getAttribute("src"), alt: img.getAttribute("alt") ?? "", title: img.getAttribute("title"), caption: (el as HTMLElement).querySelector("figcaption")?.textContent ?? "" } : false; } },
      ...(this.parent?.() ?? []),
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    const img = ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)] as const;
    return node.attrs.caption ? ["figure", { class: "rich-figure" }, img, ["figcaption", {}, node.attrs.caption as string]] : img;
  },
});

export const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] }, // the page title is the only h1
    link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } },
  }),
  CaptionedImage,
  Highlight,
  Subscript,
  Superscript,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TableKit.configure({ table: { resizable: false } }),
  Details,
  DetailsSummary,
  DetailsContent,
  Callout,
];
