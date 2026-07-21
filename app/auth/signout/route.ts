import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { createSupabaseServerClient } from "../../lib/supabase";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.auth.signOut();
  }
  if (await getChatGPTUser()) return NextResponse.redirect(new URL("/signout-with-chatgpt?return_to=/", request.url));
  return NextResponse.redirect(new URL("/", request.url));
}
