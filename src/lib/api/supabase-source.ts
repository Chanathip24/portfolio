import { publicClient } from "@/lib/supabase/public";

const PROJECT_LIST = "id,slug,title,client,tags,status,is_signature,sort_order,image_url,summary,live_url,preview_url,created_at";
const POST_LIST = "id,slug,title,excerpt,category,status,reading_minutes,image_url,published_at,updated_at,author_id,views,author:authors(*)";
const lists: Record<string, [table: string, columns: string]> = {
  "/projects": ["projects", PROJECT_LIST],
  "/posts": ["posts", POST_LIST],
  "/skills": ["skills", "*"],
  "/tools": ["tools", "*"],
  "/career": ["career", "*"],
  "/testimonials": ["testimonials", "*"],
  "/post-categories": ["post_categories", "*"],
  "/project-categories": ["project_categories", "*"],
  "/skill-groups": ["skill_groups", "*"],
};

type Result = { status: number; data: unknown };

/** Answers the same routes as the mock adapter, from Supabase, in the same `{ data, count }` shapes.
 *  Anonymous reads only: RLS already hides drafts and archived rows from this client. */
export async function fromSupabase(url: string): Promise<Result> {
  const sb = publicClient();
  const fail = (error: { message: string }): Result => ({ status: 500, data: { error: error.message } });

  if (url in lists) {
    const [table, columns] = lists[url];
    const { data, error } = await sb.from(table).select(columns);
    return error ? fail(error) : { status: 200, data: { data, count: data.length } };
  }
  if (url === "/profile") {
    const { data, error } = await sb.from("profile").select("*, socials(*)").limit(1).maybeSingle();
    return error ? fail(error) : data ? { status: 200, data: { data } } : { status: 404, data: { error: "Not found" } };
  }
  const [, kind, slug] = /^\/(projects|posts)\/([^/]+)$/.exec(url) ?? [];
  if (kind) {
    const select = kind === "posts" ? "*, author:authors(*)" : "*";
    const { data, error } = await sb.from(kind).select(select).eq("slug", decodeURIComponent(slug)).maybeSingle();
    return error ? fail(error) : data ? { status: 200, data: { data } } : { status: 404, data: { error: "Not found" } };
  }
  return { status: 404, data: { error: "Not found" } };
}
