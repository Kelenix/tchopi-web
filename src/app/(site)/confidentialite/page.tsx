import type { Metadata } from "next";
import { LegalPending } from "@/components/legal-pending";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Page() {
  return <LegalPending title="Politique de confidentialité" />;
}
