import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

/** Anonymous client for public reads only. No cookies, so it is safe inside cached data queries. */
export const publicClient = () =>
  createClient(supabaseUrl!, supabaseKey!, { auth: { persistSession: false, autoRefreshToken: false } });
