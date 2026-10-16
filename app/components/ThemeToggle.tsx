"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem("eg-theme", theme);
  } catch {}
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || "";
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("eg-theme");
    } catch {}
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = current === "dark" || current === "light"
      ? current
      : saved === "dark" || saved === "light"
        ? saved
        : preferred;
    applyTheme(initial);
    queueMicrotask(() => setTheme(initial));
  }, []);

  function toggle() {
    const current = (document.documentElement.dataset.theme as Theme) || theme;
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? "compact" : ""}`}
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
    >
      <span className="theme-dark-only" aria-hidden="true">☀</span>
      <span className="theme-light-only" aria-hidden="true">☾</span>
      {!compact && (
        <b>
          <span className="theme-dark-only">Light mode</span>
          <span className="theme-light-only">Dark mode</span>
        </b>
      )}
    </button>
  );
}
