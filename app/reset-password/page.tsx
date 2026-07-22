/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentUser } from "../lib/auth";
import { getSupabaseConfig } from "../lib/supabase";
import ResetPasswordClient from "./ResetPasswordClient";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getStudentUser();
  if (!user) redirect("/login?next=/reset-password");

  return <main className="auth-shell">
    <Link className="brand auth-brand" href="/"><img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" /><span><strong>EG Scholarships</strong><small>by Excellence Global Consultancy</small></span></Link>
    <section className="auth-card reset-password-card">
      <div className="auth-copy"><span className="section-kicker">SECURE ACCOUNT ACCESS</span><h1>Create a password you can use next time.</h1><p>Your secure email link has verified your identity. Choose a private password for future sign-ins.</p><ul><li>Use at least 8 characters</li><li>Do not reuse a shared password</li><li>EG staff will never ask for your password</li></ul></div>
      <div className="auth-form"><span className="eyebrow">PASSWORD SETUP</span><h2>Set your account password</h2><p>Enter the same new password twice, then continue to your student dashboard.</p><ResetPasswordClient config={getSupabaseConfig()} /></div>
    </section>
    <p className="auth-foot">Signed in as {user.email}. Your password is handled securely by the authentication service.</p>
  </main>;
}
