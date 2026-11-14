import type { JSONContent } from "@tiptap/core";
import { useState } from "react";
import { DateTimeField } from "@/components/admin/date-time-field";
import { OptionSelect } from "@/components/admin/option-select";
import { RichEditor } from "@/components/admin/rich-editor";
import { Tip } from "@/components/admin/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";

// Small stateful wrappers: the components under test are controlled, so something has to hold their value. Each one prints
// what it holds into the page, which is what the tests read.

export const OPTIONS = [
  { value: "engineering", label: "Engineering" },
  { value: "design", label: "Design" },
  { value: "data", label: "Data" },
];

export function SelectHarness({ initial = "engineering", invalid = false }: { initial?: string; invalid?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="p-6">
      <label htmlFor="cat">Category</label>
      <OptionSelect id="cat" value={value} onChange={setValue} options={OPTIONS} invalid={invalid} />
      <output data-testid="value">{value}</output>
    </div>
  );
}

export function DateHarness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="w-80 p-6">
      <label htmlFor="when">Publish date</label>
      <DateTimeField id="when" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </div>
  );
}

export function EditorHarness({ initial }: { initial?: JSONContent }) {
  const [doc, setDoc] = useState<JSONContent>(initial ?? { type: "doc", content: [] });
  return (
    <TooltipProvider>
      <div className="p-6">
        <RichEditor label="Content" value={doc} onChange={setDoc} />
        <pre data-testid="json">{JSON.stringify(doc)}</pre>
        <output data-testid="plain">{String(Object.getPrototypeOf(doc.content?.[0]?.attrs ?? {}) === Object.prototype)}</output>
      </div>
    </TooltipProvider>
  );
}

export function ControlsHarness() {
  return (
    <TooltipProvider>
      <div className="flex w-96 flex-col gap-4 p-6">
        <Input aria-label="Name" placeholder="Your name" />
        <Textarea aria-label="About" placeholder="Tell us" />
        <Tip label="Say hello"><Button aria-label="Hello">Hi</Button></Tip>
      </div>
    </TooltipProvider>
  );
}
