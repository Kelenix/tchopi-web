import type { Metadata } from "next";
import { LegalPending } from "@/components/legal-pending";

// Navigation instantanée vérifiée en développement (catalogue public).
export const instant = true;

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function Page() {
  return <LegalPending title="Conditions d'utilisation" />;
}
