"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useMemo, useState } from "react";

export default function AuthClient({ config, next }: { config: { url: string; anonKey: string } | null; next: string }) {
  const supabase = useMemo(() => config ? createBrowserClient(config.url, config.anonKey) : null, [config]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"email" | null>(null);
  const [message, setMessage] = useState("");

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
    return <div className="auth-setup"><strong>Secure student sign-in is temporarily unavailable.</strong><p>The authentication service needs administrator attention. No student account can be created until it is restored.</p><a className="button primary" href="mailto:ceo.egconsulting@gmail.com?subject=EG%20Scholarships%20sign-in%20support">Contact EG support</a></div>;
  }

  return <div className="auth-actions">
    <form onSubmit={sendEmailLink}>
      <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" required autoComplete="email" /></label>
      <button className="button primary" disabled={Boolean(busy)}>{busy === "email" ? "Sending secure link..." : "Email me a sign-in link"}</button>
    </form>
    {message && <p className="auth-message" role="status">{message}</p>}
    <small>By continuing, you agree to use accurate information and keep your account access private.</small>
  </div>;
}
