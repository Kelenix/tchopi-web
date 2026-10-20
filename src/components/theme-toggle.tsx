"use client";

import { Moon, Sun } from "lucide-react";

/** Bascule clair / sombre, mémorisée un an dans un cookie lu avant l'affichage (layout racine). */
export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer de thème"
      className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-alt hover:text-ink"
    >
      <Sun className="hidden size-5 [[data-theme=dark]_&]:block" />
      <Moon className="size-5 [[data-theme=dark]_&]:hidden" />
    </button>
  );
}
