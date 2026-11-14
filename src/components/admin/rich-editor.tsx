"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  Bold, ChevronsUpDown, Code, Code2, Heading2, Heading3, Highlighter, ImagePlus, Info, Italic, Link2, List, ListChecks, ListOrdered,
  Minus, Quote, Redo2, Strikethrough, Table, Underline, Undo2,
} from "lucide-react";
import { useRef, useState } from "react";
import { Tip } from "@/components/admin/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/lib/admin/upload";
import { extensions } from "@/lib/tiptap";
import { cn } from "cn";

const SAFE_LINK = /^(https?:\/\/|mailto:|\/)\S*$/;

/** The page editor. It uses the exact extension list the site renders with (lib/tiptap.ts), so anything you can
 *  write here is something the page can show. */
export function RichEditor({ value, onChange, label, invalid }: { value: JSONContent; onChange: (doc: JSONContent) => void; label: string; invalid?: boolean }) {
  const [message, setMessage] = useState("");
  const editor = useEditor({
    extensions,
    // A document with no blocks has no valid cursor position (the selection becomes "all"), so start from one empty paragraph.
    content: value.content?.length ? value : { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    editorProps: { attributes: { class: "rich min-h-80 px-4 py-3 outline-none", "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    // ProseMirror's node attrs are null-prototype objects, which React cannot send to a Server Action (they arrive as
    // undefined and headings lose their level). A JSON round trip turns them into plain objects.
    onUpdate: ({ editor: e }) => onChange(JSON.parse(JSON.stringify(e.getJSON()))),
  });
  if (!editor) return <div className="min-h-96 rounded-lg border border-input" aria-busy="true" />;

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-background", invalid ? "border-destructive" : "border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50")}>
      <Toolbar editor={editor} setMessage={setMessage} />
      <EditorContent editor={editor} />
      <p role="status" className={cn("border-t border-input px-3 py-1.5 text-xs", message ? "text-destructive" : "text-muted-foreground")}>
        {message || "Headings, lists, tables, images and callouts all appear on the page as you see them here."}
      </p>
    </div>
  );
}

/** A separate component so useEditorState starts with a real editor (it doesn't pick one up that arrives later). */
function Toolbar({ editor, setMessage }: { editor: Editor; setMessage: (m: string) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const on = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"), code: e.isActive("code"),
      highlight: e.isActive("highlight"), h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"), ordered: e.isActive("orderedList"), task: e.isActive("taskList"), quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"), link: e.isActive("link"), callout: e.isActive("callout"), details: e.isActive("details"),
      canUndo: e.can().undo(), canRedo: e.can().redo(),
      image: e.isActive("image"), imgAlt: (e.getAttributes("image").alt as string | undefined) ?? "", imgCaption: (e.getAttributes("image").caption as string | undefined) ?? "",
    }),
  });

  // A fresh chain per click: one made during render would hold the transaction of an older editor state.
  const run = () => editor.chain().focus();
  const btn = (title: string, icon: React.ReactNode, active: boolean | undefined, act: () => void, disabled?: boolean) => (
    <Tip key={title} label={title}>
      <Button type="button" variant={active ? "secondary" : "ghost"} size="icon-sm" aria-label={title} aria-pressed={active} disabled={disabled} onMouseDown={keepFocus} onClick={act}>
        {icon}
      </Button>
    </Tip>
  );
  // Pressing a toolbar button must not take focus (and the selection) away from the text.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  const sep = (k: string) => <span key={k} aria-hidden className="mx-1 h-5 w-px bg-border" />;

  // Links and image descriptions are typed into a bar under the toolbar (no browser prompt, no modal).
  const [prompt, setPrompt] = useState<{ kind: "link" | "alt"; value: string; caption?: string; src?: string; editing?: boolean } | null>(null);
  const openLink = () => setPrompt({ kind: "link", value: (editor.getAttributes("link").href as string | undefined) ?? "https://" });
  const submitPrompt = () => {
    if (!prompt) return;
    const value = prompt.value.trim();
    if (prompt.kind === "alt") {
      const caption = (prompt.caption ?? "").trim();
      if (prompt.editing) editor.chain().focus().updateAttributes("image", { alt: value, caption }).run();
      else editor.chain().focus().insertContent({ type: "image", attrs: { src: prompt.src, alt: value, caption } }).run();
    } else if (value === "") {
      run().extendMarkRange("link").unsetLink().run();
    } else if (!SAFE_LINK.test(value)) {
      return setMessage("Links must start with https://, mailto: or /.");
    } else {
      run().extendMarkRange("link").setLink({ href: value }).run();
    }
    setMessage("");
    setPrompt(null);
  };
  const editImage = () => setPrompt({ kind: "alt", value: on.imgAlt, caption: on.imgCaption, editing: true });
  const addImage = async (f: File) => {
    setMessage("Uploading…");
    try {
      const src = await uploadImage(f);
      setMessage("");
      setPrompt({ kind: "alt", value: "", caption: "", src });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  return (
    <>
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 p-1.5">
      {btn("Undo", <Undo2 />, false, () => run().undo().run(), !on.canUndo)}
      {btn("Redo", <Redo2 />, false, () => run().redo().run(), !on.canRedo)}
      {sep("a")}
      {btn("Heading", <Heading2 />, on.h2, () => run().toggleHeading({ level: 2 }).run())}
      {btn("Subheading", <Heading3 />, on.h3, () => run().toggleHeading({ level: 3 }).run())}
      {sep("b")}
      {btn("Bold", <Bold />, on.bold, () => run().toggleBold().run())}
      {btn("Italic", <Italic />, on.italic, () => run().toggleItalic().run())}
      {btn("Underline", <Underline />, on.underline, () => run().toggleUnderline().run())}
      {btn("Strikethrough", <Strikethrough />, on.strike, () => run().toggleStrike().run())}
      {btn("Highlight", <Highlighter />, on.highlight, () => run().toggleHighlight().run())}
      {btn("Inline code", <Code />, on.code, () => run().toggleCode().run())}
      {btn("Link", <Link2 />, on.link, openLink)}
      {sep("c")}
      {btn("Bulleted list", <List />, on.bullet, () => run().toggleBulletList().run())}
      {btn("Numbered list", <ListOrdered />, on.ordered, () => run().toggleOrderedList().run())}
      {btn("Checklist", <ListChecks />, on.task, () => run().toggleTaskList().run())}
      {sep("d")}
      {btn("Quote", <Quote />, on.quote, () => run().toggleBlockquote().run())}
      {btn("Code block", <Code2 />, on.codeBlock, () => run().toggleCodeBlock().run())}
      {btn("Callout", <Info />, on.callout, () => (on.callout ? run().lift("callout").run() : run().wrapIn("callout", { tone: "info" }).run()))}
      {btn("Collapsible section", <ChevronsUpDown />, on.details, () => (on.details ? run().unsetDetails().run() : run().setDetails().run()))}
      {btn("Divider", <Minus />, false, () => run().setHorizontalRule().run())}
      {btn("Table", <Table />, false, () => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
      <Tip label="Image"><Button type="button" variant="ghost" size="icon-sm" aria-label="Insert image" onClick={() => file.current?.click()}><ImagePlus /></Button></Tip>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} aria-hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void addImage(f); }} />
    </div>
    {on.image && !prompt && (
      <div role="group" aria-label="Selected image" className="flex flex-wrap items-center gap-2 border-b border-input bg-muted/30 px-3 py-2 text-sm">
        <span className={on.imgAlt ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"}>{on.imgAlt ? `Description: ${on.imgAlt}` : "No description: people using a screen reader will skip this image."}</span>
        <Button type="button" size="sm" variant="outline" onMouseDown={keepFocus} onClick={editImage}>Edit description and caption</Button>
      </div>
    )}
    {prompt && (
      <div role="group" aria-label={prompt.kind === "link" ? "Link" : "Image details"} className="flex flex-wrap items-center gap-2 border-b border-input bg-muted/30 p-2">
        <Input autoFocus aria-label={prompt.kind === "link" ? "Link address" : "Describe the image for people who can't see it"} className="min-w-48 flex-1"
          placeholder={prompt.kind === "link" ? "https://…, mailto:… or /path" : "Describe the image (alt text)"} value={prompt.value} onChange={(e) => setPrompt({ ...prompt, value: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitPrompt(); } else if (e.key === "Escape") setPrompt(null); }} />
        {prompt.kind === "alt" && (
          <Input aria-label="Caption shown under the image" className="min-w-48 flex-1" placeholder="Caption (optional)" value={prompt.caption ?? ""} onChange={(e) => setPrompt({ ...prompt, caption: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitPrompt(); } else if (e.key === "Escape") setPrompt(null); }} />
        )}
        <Button type="button" size="sm" onClick={submitPrompt}>{prompt.kind === "link" ? "Apply link" : prompt.editing ? "Save details" : "Insert image"}</Button>
        {prompt.kind === "link" && on.link && <Button type="button" size="sm" variant="outline" onClick={() => { run().extendMarkRange("link").unsetLink().run(); setPrompt(null); }}>Remove link</Button>}
        <Button type="button" size="sm" variant="ghost" onClick={() => { if (prompt.kind === "alt" && !prompt.editing) editor.chain().focus().insertContent({ type: "image", attrs: { src: prompt.src, alt: "", caption: "" } }).run(); setPrompt(null); }}>{prompt.kind === "alt" && !prompt.editing ? "Skip description" : "Cancel"}</Button>
      </div>
    )}
    </>
  );
}
