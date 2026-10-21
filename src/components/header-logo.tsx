"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";

/** Logo de la barre du haut : sur l'accueil, masqué tant que le grand logo de la photo est visible. */
export function HeaderLogo() {
  const home = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!home) return;
    const update = () => setScrolled(window.scrollY > window.innerHeight * 0.45);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [home]);
  const hidden = home && !scrolled;
  return (
    <span aria-hidden={hidden} className={`transition duration-300 ${hidden ? "pointer-events-none -translate-y-1 opacity-0" : "opacity-100"}`}>
      <Logo height={52} />
    </span>
  );
}
