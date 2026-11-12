import { Node } from "@tiptap/core";
import { CalloutTone, NodeType } from "@/lib/enums";

/** A highlighted aside: `{ type: "callout", attrs: { tone }, content: [blocks] }`. */
export const Callout = Node.create({
  name: NodeType.Callout,
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      tone: {
        default: CalloutTone.Info,
        parseHTML: (el) => el.getAttribute("data-tone"),
        renderHTML: (attrs) => ({ "data-tone": attrs.tone }),
      },
    };
  },
  parseHTML: () => [{ tag: "aside[data-callout]" }],
  renderHTML: ({ HTMLAttributes }) => ["aside", { ...HTMLAttributes, "data-callout": "" }, 0],
});
