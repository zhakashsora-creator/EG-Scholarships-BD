import { headers } from "next/headers";
import { getChatGPTUser } from "../chatgpt-auth";
import { createSupabaseServerClient } from "./supabase";

export type StudentUser = {
  displayName: string;
  email: string;
  fullName: string;
};

export async function getStudentUser(): Promise<StudentUser | null> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) {
      const fullName = String(
        data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email.split("@")[0],
      );
      return { displayName: fullName, fullName, email: data.user.email };
    }
  }

  // Retain Sites authentication as an administrator recovery path.
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) return chatGPTUser;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
    return {
      displayName: "Demo Student",
      email: "demo.student@egscholarships.local",
      fullName: "Demo Student",
    };
  }

  return null;
}
