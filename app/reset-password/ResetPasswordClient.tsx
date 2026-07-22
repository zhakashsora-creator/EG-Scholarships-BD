"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useMemo, useState } from "react";

export default function ResetPasswordClient({ config }: { config: { url: string; anonKey: string } | null }) {
  const supabase = useMemo(() => config ? createBrowserClient(config.url, config.anonKey) : null, [config]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    if (password.length < 8) {
      setMessage("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The two passwords do not match. Please enter them again.");
      return;
    }

    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.assign("/dashboard");
  }

  if (!supabase) return <div className="auth-setup"><strong>Password setup is temporarily unavailable.</strong><p>Please contact EG Scholarships support for help accessing your student account.</p></div>;

  return <div className="auth-actions">
    <form onSubmit={updatePassword}>
      <label>New password <span className="field-hint">(minimum 8 characters)</span><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a secure password" required minLength={8} autoComplete="new-password" /></label>
      <label>Confirm new password<input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the same password again" required minLength={8} autoComplete="new-password" /></label>
      <label className="show-password"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password</label>
      <button className="button primary" disabled={busy}>{busy ? "Saving password..." : "Save password and continue"}</button>
    </form>
    {message && <p className="auth-message error" role="alert">{message}</p>}
    <small>After saving, you will enter your dashboard and can use this email-and-password combination for future sign-ins.</small>
  </div>;
}
