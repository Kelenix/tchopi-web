"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ProductsManager } from "@/components/products-manager";
import { browserClient } from "@/lib/supabase";

/** Carte d'un établissement gérée par un admin (mêmes écrans que l'établissement ; RLS : admin autorisé). */
export default function AdminMenuPage() {
  return (
    <Suspense>
      <AdminMenu />
    </Suspense>
  );
}

function AdminMenu() {
  const id = useSearchParams().get("id") ?? "";
  const [name, setName] = useState<{ id: string; name: string | null }>();
  useEffect(() => {
    let alive = true;
    browserClient()
      .from("restaurants")
      .select("name")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => alive && setName({ id, name: data?.name ?? null }));
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <>
      <Link href="/espace/admin/etablissements" className="text-sm font-semibold text-muted hover:text-ink">
        ← Restaurants
      </Link>
      <p className="mt-2 text-sm font-semibold text-muted">{name?.id === id ? (name.name ?? "Établissement introuvable") : " "}</p>
      {id && <ProductsManager establishmentId={id} />}
    </>
  );
}
