import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./env";

/** Browser client, used only to upload images straight to Storage (RLS still requires an MFA-verified admin). */
export const browserClient = () => createBrowserClient(supabaseUrl!, supabaseKey!);
