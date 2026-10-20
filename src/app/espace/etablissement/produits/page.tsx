"use client";

import { Suspense } from "react";
import { ProductsManager } from "@/components/products-manager";
import { useEstablishment } from "@/lib/establishment";

export default function ProductsPage() {
  const { id } = useEstablishment();
  return (
    <Suspense>
      <ProductsManager establishmentId={id} />
    </Suspense>
  );
}
