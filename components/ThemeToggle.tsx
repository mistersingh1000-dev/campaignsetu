"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="grid h-10 w-10 place-items-center rounded-full border transition-colors hover:border-emerald/50"
      style={{ borderColor: "var(--line)" }}
    >
      {dark ? <Icon.sun className="h-[18px] w-[18px]" /> : <Icon.moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
