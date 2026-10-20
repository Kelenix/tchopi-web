import type { Metadata } from "next";
import { LegalPending } from "@/components/legal-pending";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function Page() {
  return <LegalPending title="Conditions d'utilisation" />;
}
