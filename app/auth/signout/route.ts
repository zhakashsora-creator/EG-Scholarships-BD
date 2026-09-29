import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { publicRequestOrigin } from "../../lib/request-origin";
import { createSupabaseServerClient } from "../../lib/supabase";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.auth.signOut();
  }
  const origin = publicRequestOrigin(request);
  if (await getChatGPTUser()) return NextResponse.redirect(new URL("/signout-with-chatgpt?return_to=/", origin));
  return NextResponse.redirect(new URL("/", origin));
}
