"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useMemo, useState } from "react";

type AuthMode = "signin" | "signup";
type BusyAction = AuthMode | "google" | "reset" | null;

export default function AuthClient({ config, next }: { config: { url: string; anonKey: string; googleAuthEnabled: boolean } | null; next: string }) {
  const supabase = useMemo(() => config ? createBrowserClient(config.url, config.anonKey) : null, [config]);
  const googleAuthEnabled = config?.googleAuthEnabled ?? false;
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setMessage("");
  }

  async function signInWithGoogle() {
    if (!supabase || busy) return;

    setBusy("google");
    setMessage("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      setBusy(null);
      setMessageTone("error");
      setMessage("Google sign-in could not start. Use email and password below or try again.");
    }
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 8) {
      setMessageTone("error");
      setMessage("Enter a valid email ID and a password of at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setMessageTone("error");
      setMessage("The two passwords do not match. Please enter them again.");
      return;
    }

    setBusy(mode);
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      setBusy(null);
      if (error) {
        setMessageTone("error");
        setMessage(error.message === "Invalid login credentials"
          ? "The email ID or password is incorrect. Check both entries or reset your password."
          : error.message);
        return;
      }
      window.location.assign(next);
      return;
    }

    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { emailRedirectTo },
    });
    setBusy(null);
    if (error) {
      setMessageTone("error");
      setMessage(error.message);
      return;
    }
    if (data.session) {
      window.location.assign(next);
      return;
    }
    setMessageTone("success");
    setMessage("Account created. Check your email and open the confirmation link to enter your student workspace.");
  }

  async function sendPasswordReset() {
    if (!supabase || busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessageTone("error");
      setMessage("Enter your email ID above first, then choose Set or reset password.");
      return;
    }

    setBusy("reset");
    setMessage("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    setBusy(null);
    setMessageTone(error ? "error" : "success");
    setMessage(error ? error.message : "Check your email for a secure password setup link. The link returns you to EG Scholarships.");
  }

  if (!supabase) {
    return <div className="auth-setup"><strong>Secure student sign-in is temporarily unavailable.</strong><p>The authentication service needs administrator attention. No student account can be created until it is restored.</p><a className="button primary" href="mailto:ceo.egconsulting@gmail.com?subject=EG%20Scholarships%20sign-in%20support">Contact EG support</a></div>;
  }

  return <div className="auth-actions">
    {googleAuthEnabled && <>
      <button type="button" className="button google-auth-button" onClick={signInWithGoogle} disabled={Boolean(busy)} aria-label="Continue with Google">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.94A6.02 6.02 0 0 1 6.1 12c0-.67.12-1.33.31-1.94V7.44H3.07A10 10 0 0 0 2 12c0 1.64.39 3.2 1.07 4.56l3.34-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5L18.7 4.56A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.93 5.44l3.34 2.62C7.2 7.7 9.4 5.94 12 5.94Z"/></svg>
        {busy === "google" ? "Opening Google..." : "Continue with Google"}
      </button>
      <div className="auth-divider"><span>or use email and password</span></div>
    </>}

    <div className="auth-mode-switch" role="tablist" aria-label="Choose account access">
      <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => switchMode("signin")}>Sign In</button>
      <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Sign Up</button>
    </div>

    <div className="auth-mode-intro">
      <strong>{mode === "signin" ? "Welcome back" : "Create your student account"}</strong>
      <span>{mode === "signin" ? "Use the email ID and password already connected to your account." : "Choose an email ID and password. You will confirm your email before entering the dashboard."}</span>
    </div>

    <form onSubmit={submitCredentials}>
      <label>Email ID <span className="field-hint">(your account username)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" required autoComplete={mode === "signin" ? "username" : "email"} /></label>
      <label>Password <span className="field-hint">(minimum 8 characters)</span><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signin" ? "Enter your password" : "Create a secure password"} required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
      {mode === "signup" && <label>Confirm password<input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the same password again" required minLength={8} autoComplete="new-password" /></label>}
      <label className="show-password"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password</label>
      <button className="button primary" disabled={Boolean(busy)}>{busy === mode ? (mode === "signin" ? "Signing in..." : "Creating account...") : (mode === "signin" ? "Sign in to my account" : "Create my account")}</button>
    </form>

    {mode === "signin" && <button type="button" className="auth-text-button" onClick={sendPasswordReset} disabled={Boolean(busy)}>{busy === "reset" ? "Sending password link..." : "Set or reset password"}</button>}
    {message && <p className={`auth-message ${messageTone === "error" ? "error" : ""}`} role={messageTone === "error" ? "alert" : "status"}>{message}</p>}
    <small>{mode === "signin" ? "Previously used an email sign-in link? Use Set or reset password once to create a password." : "By creating an account, you agree to use accurate information and keep your login private."}</small>
  </div>;
}
