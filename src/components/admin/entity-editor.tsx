"use client";

import { useRouter } from "next/navigation";
import { EntityForm } from "@/components/admin/entity-form";
import type { EntityName, Option } from "@/lib/admin/fields";

/** The page-level form for one post, project or the profile. Creating goes on to the new item's edit page;
 *  saving an existing one re-reads the page so lists and facts stay in step. */
export function EntityEditor({ entity, id, initial, basePath, submitLabel, options }: {
  entity: EntityName; id: string | null; initial: Record<string, unknown>; basePath?: string; submitLabel?: string; options?: Record<string, Option[]>;
}) {
  const router = useRouter();
  return (
    <EntityForm entity={entity} id={id} initial={initial} submitLabel={submitLabel} options={options}
      onSaved={(saved) => { if (!id && basePath) router.push(`${basePath}/${saved}`); else router.refresh(); }} />
  );
}
