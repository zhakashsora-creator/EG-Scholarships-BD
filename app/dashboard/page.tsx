import { redirect } from "next/navigation";
import { getStudentUser } from "../lib/auth";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

const tabs = new Set(["overview", "account", "documents", "profile", "matches", "applications", "consultant"]);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getStudentUser();
  if (!user) redirect("/login?next=/dashboard");
  const requested = (await searchParams).tab ?? "overview";
  const initialTab = tabs.has(requested) ? requested : "overview";
  return <DashboardClient user={{ name: user.displayName, email: user.email }} signOutPath="/auth/signout" initialTab={initialTab} />;
}
