import { z } from "@builder.io/qwik-city";
import { serverSupabase$ } from "~/lib/qwik-supabase";

export const {
  getSupabaseInstance,
  onRequest,
  useSupabaseSetSession,
  useSupabaseSignInWithPassword,
  useSupabaseSignOut,
  useSupabaseUser,
} = serverSupabase$(async (event) => {
  const parsed = await z
    .object({ supabaseKey: z.string(), supabaseUrl: z.string() })
    .parseAsync({
      supabaseKey: event.env.get("PUBLIC_SUPABASE_ANON_KEY"),
      supabaseUrl: event.env.get("PUBLIC_SUPABASE_URL"),
    });

  return {
    supabaseKey: parsed.supabaseKey,
    supabaseUrl: parsed.supabaseUrl,
  };
});
