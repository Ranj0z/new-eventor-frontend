import { useEffect, useState } from "react";

export type Theme = "eventor-light" | "eventor-dark";

const STORAGE_KEY = "eventor-theme";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "eventor-light" || stored === "eventor-dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "eventor-dark"
    : "eventor-light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "eventor-light" ? "eventor-dark" : "eventor-light"));

  return { theme, toggleTheme };
}
