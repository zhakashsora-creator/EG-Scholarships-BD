import { createServerClient } from "@supabase/ssr";
import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export function getSupabaseConfig() {
  const runtime = env as unknown as { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };
  const url = runtime.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = runtime.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components can read cookies but cannot always refresh them.
        }
      },
    },
  });
}
