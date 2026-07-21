import { redirect } from "next/navigation";
import { chatGPTSignInPath, chatGPTSignOutPath } from "../chatgpt-auth";
import { getStudentUser } from "../lib/auth";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getStudentUser();
  if (!user) redirect(chatGPTSignInPath("/dashboard"));
  return <DashboardClient user={{ name: user.displayName, email: user.email }} signOutPath={chatGPTSignOutPath("/")} />;
}
