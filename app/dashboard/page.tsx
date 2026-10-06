import { redirect } from "next/navigation";
import { getStudentUser } from "../lib/auth";
import { parseMatchFilters } from "../lib/match-filters";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

const tabs = new Set(["overview", "account", "documents", "profile", "matches", "applications", "consultant"]);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getStudentUser();
  if (!user) redirect("/login?next=/dashboard");
  const params = await searchParams;
  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab ?? "overview";
  const initialTab = tabs.has(requested) ? requested : "overview";
  return <DashboardClient key={initialTab} user={{ name: user.displayName, email: user.email }} signOutPath="/auth/signout" initialTab={initialTab} initialMatchFilters={parseMatchFilters(params)} />;
}
