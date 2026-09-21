import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { runtimeValue } from "./runtime-env";

export function getSupabaseConfig() {
  const url = runtimeValue("SUPABASE_URL");
  const anonKey = runtimeValue("SUPABASE_ANON_KEY");
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
