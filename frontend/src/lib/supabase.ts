import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || "";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_KEY || import.meta.env.SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase URL or Key is missing. Please check your frontend .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
