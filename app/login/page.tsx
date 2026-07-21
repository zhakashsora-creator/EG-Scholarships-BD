/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentUser } from "../lib/auth";
import { getSupabaseConfig } from "../lib/supabase";
import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getStudentUser();
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/dashboard";
  if (user) redirect(next);
  const config = getSupabaseConfig();

  return <main className="auth-shell">
    <Link className="brand auth-brand" href="/"><img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" /><span><strong>EG Scholarships</strong><small>by Excellence Global Consultancy</small></span></Link>
    <section className="auth-card">
      <div className="auth-copy"><span className="section-kicker">SECURE STUDENT ACCESS</span><h1>One profile. One workspace. A clearer scholarship plan.</h1><p>Sign in to store documents, build an evidence-led profile, review your Top Five options and track consultant next steps.</p><ul><li>Private document storage</li><li>Google or passwordless email access</li><li>Official sources retained with every match</li></ul></div>
      <div className="auth-form"><span className="eyebrow">WELCOME TO YOUR WORKSPACE</span><h2>Sign in or create your student account</h2><p>No password to remember. We use Google or a secure link sent to your email.</p><AuthClient config={config} next={next} /></div>
    </section>
    <p className="auth-foot">Your information is used only for your scholarship and admission support workflow. Matches are guidance, not guarantees.</p>
  </main>;
}
