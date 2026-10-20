"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useSession } from "@/lib/use-session";

export function AccountButton() {
  const session = useSession();
  const signedIn = Boolean(session);
  return (
    <Link
      href={signedIn ? "/espace" : "/connexion"}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink transition hover:opacity-90"
    >
      <UserRound className="size-4" aria-hidden />
      {signedIn ? "Mon espace" : "Se connecter"}
    </Link>
  );
}
