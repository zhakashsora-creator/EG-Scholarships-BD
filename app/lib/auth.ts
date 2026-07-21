import { headers } from "next/headers";
import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

export async function getStudentUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  if (user) return user;

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
