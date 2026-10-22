"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PAGE, Pager } from "@/components/pager";
import { StatusBadge } from "@/components/order-parts";
import { useAccount } from "@/components/space-shell";
import { ButtonLink } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { closedStatuses, type Order } from "@/lib/orders";
import { browserClient } from "@/lib/supabase";

export default function MyOrdersPage() {
  const { session } = useAccount();
  const [active, setActive] = useState<Order[] | null>(null);
  const [page, setPage] = useState(0);
  const [past, setPast] = useState<{ page: number; rows: Order[]; total: number } | null>(null);
  const closed = `(${closedStatuses.join(",")})`;

  useEffect(() => {
    let alive = true;
    browserClient()
      .from("orders")
      .select("*")
      .eq("customer_id", session.user.id)
      .not("status", "in", closed)
      .order("created_at", { ascending: false })
      .then(({ data }) => alive && setActive((data ?? []) as Order[]));
    return () => {
      alive = false;
    };
  }, [session.user.id, closed]);

  useEffect(() => {
    let alive = true;
    browserClient()
      .from("orders")
      .select("*", { count: "exact" })
      .eq("customer_id", session.user.id)
      .in("status", closedStatuses)
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
      .then(({ data, count }) => alive && setPast({ page, rows: (data ?? []) as Order[], total: count ?? 0 }));
    return () => {
      alive = false;
    };
  }, [session.user.id, page]);

  const history = past?.page === page ? past : null;

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Mes commandes</h1>
      {!active || !history ? (
        <div className="mt-8 h-48 animate-pulse rounded-card bg-surface-alt" />
      ) : active.length + history.total === 0 ? (
        <div className="mt-8">
          <EmptyState icon={ShoppingBag} title="Aucune commande pour l'instant" action={<ButtonLink href="/#restaurants">Commander</ButtonLink>} />
        </div>
      ) : (
        <>
          {active.length > 0 && <List title="En cours" orders={active} />}
          {history.rows.length > 0 && <List title="Historique" orders={history.rows} />}
          <Pager page={page} total={history.total} onChange={setPage} />
        </>
      )}
    </>
  );
}

function List({ title, orders }: { title: string; orders: Order[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/espace/commandes/${o.id}`} className="flex items-center gap-4 p-4 hover:bg-surface-alt">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {o.type === "parcel" ? "Colis" : o.pickup_name} · {o.number}
                </p>
                <p className="text-xs text-muted">{formatDateTime(o.created_at)}</p>
              </div>
              <StatusBadge order={o} />
              <span className="tabular hidden w-24 text-right font-bold sm:block">{formatMoney(o.total)}</span>
              <ChevronRight className="size-4 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
