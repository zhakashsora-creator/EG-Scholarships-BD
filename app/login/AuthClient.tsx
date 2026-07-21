"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useMemo, useState } from "react";

export default function AuthClient({ config, next }: { config: { url: string; anonKey: string } | null; next: string }) {
  const supabase = useMemo(() => config ? createBrowserClient(config.url, config.anonKey) : null, [config]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [message, setMessage] = useState("");

  async function signInWithGoogle() {
    if (!supabase) return;
    setBusy("google");
    setMessage("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) { setMessage(error.message); setBusy(null); }
  }

  async function sendEmailLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy("email");
    setMessage("");
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo, shouldCreateUser: true },
    });
    setBusy(null);
    setMessage(error ? error.message : "Check your email for a secure sign-in link. You can close this tab after opening it.");
  }

  if (!supabase) {
    return <div className="auth-setup"><strong>Student sign-in is being connected.</strong><p>The dashboard is available to the pilot owner while Google and email authentication is configured.</p><a className="button primary" href="/signin-with-chatgpt?return_to=/dashboard">Continue as pilot owner</a></div>;
  }

  return <div className="auth-actions">
    <button className="google-button" type="button" onClick={signInWithGoogle} disabled={Boolean(busy)}>
      <span className="google-mark">G</span>{busy === "google" ? "Opening Google..." : "Continue with Google"}
    </button>
    <div className="auth-divider"><span>or continue with email</span></div>
    <form onSubmit={sendEmailLink}>
      <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" required autoComplete="email" /></label>
      <button className="button primary" disabled={Boolean(busy)}>{busy === "email" ? "Sending secure link..." : "Email me a sign-in link"}</button>
    </form>
    {message && <p className="auth-message" role="status">{message}</p>}
    <small>By continuing, you agree to use accurate information and keep your account access private.</small>
  </div>;
}
