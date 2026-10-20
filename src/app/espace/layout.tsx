import type { Metadata } from "next";
import { SpaceShell } from "@/components/space-shell";

export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };

export default function SpaceLayout({ children }: LayoutProps<"/espace">) {
  return <SpaceShell>{children}</SpaceShell>;
}
