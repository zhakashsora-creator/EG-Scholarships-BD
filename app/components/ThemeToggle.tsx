"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem("eg-theme", theme);
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("eg-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = saved === "dark" || saved === "light" ? saved : preferred;
    applyTheme(initial);
    queueMicrotask(() => setTheme(initial));
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? "compact" : ""}`}
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-pressed={theme === "dark"}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      {!compact && <b>{theme === "dark" ? "Light mode" : "Dark mode"}</b>}
    </button>
  );
}
