import Image from "next/image";
import Link from "next/link";
import logo from "../../public/brand/logo.png";

/** Logo officiel Tchopi (livreur à moto et nom), lien vers l'accueil. Lisible sur fond clair comme sombre (contour noir). */
export function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <Link href="/" aria-label="Tchopi, accueil" className={`inline-flex shrink-0 items-center ${className}`}>
      <Image src={logo} alt="Tchopi" priority style={{ height, width: "auto" }} sizes={`${Math.round(height * 1.5) * 2}px`} />
    </Link>
  );
}
