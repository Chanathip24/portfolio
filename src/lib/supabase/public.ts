import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

/** Anonymous client for public reads (and the page-view log). No cookies, so it is safe inside `use cache`. */
export const publicClient = () =>
  createClient(supabaseUrl!, supabaseKey!, { auth: { persistSession: false, autoRefreshToken: false } });
