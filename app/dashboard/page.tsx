import { redirect } from "next/navigation";
import { getStudentUser } from "../lib/auth";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getStudentUser();
  if (!user) redirect("/login?next=/dashboard");
  return <DashboardClient user={{ name: user.displayName, email: user.email }} signOutPath="/auth/signout" />;
}
