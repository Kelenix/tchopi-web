"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { dialog, orThrow } from "./dialog";
import { Badge, Button, Card } from "./ui";
import { browserClient } from "@/lib/supabase";

type Status = "pending" | "approved" | "rejected" | "suspended" | "ended";
type Affiliation = { restaurant_id: string; status: Status; restaurant: { name: string } | null };
type Restaurant = { id: string; name: string; category: string | null; district: string };
const label: Record<Status, [string, "success" | "warning" | "danger" | "neutral"]> = {
  pending: ["Candidature envoyée", "warning"],
  approved: ["Affilié", "success"],
  rejected: ["Refusée", "neutral"],
  suspended: ["Suspendue", "danger"],
  ended: ["Terminée", "neutral"],
};

/** Affiliations du livreur (ADR-050) : candidature auprès des restaurants de sa ville, suivi des réponses. */
export function CourierAffiliations({ userId, approved }: { userId: string; approved: boolean }) {
  const [data, setData] = useState<{ mine: Affiliation[]; restaurants: Restaurant[] } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    const db = browserClient();
    (async () => {
      const [{ data: courier }, { data: mine }] = await Promise.all([
        db.from("couriers").select("zone_id").eq("user_id", userId).single(),
        db.from("restaurant_couriers").select("restaurant_id, status, restaurant:restaurants(name)").eq("courier_id", userId).order("updated_at", { ascending: false }),
      ]);
      const { data: restaurants } = courier ? await db.rpc("public_establishments", { p_zone_id: courier.zone_id }) : { data: [] };
      if (alive) setData({ mine: (mine ?? []) as unknown as Affiliation[], restaurants: (restaurants ?? []) as Restaurant[] });
    })();
    return () => {
      alive = false;
    };
  }, [userId, version]);

  if (!data) return <div className="h-32 animate-pulse rounded-card bg-surface-alt" />;
  const status = (id: string) => data.mine.find((a) => a.restaurant_id === id)?.status;
  const open = data.restaurants.filter((r) => !["pending", "approved", "suspended"].includes(status(r.id) ?? ""));

  async function apply(r: Restaurant) {
    const done = await dialog.prompt({
      title: `Travailler avec ${r.name}`,
      body: "Le restaurant reçoit votre candidature et vous répond ; vous êtes prévenu.",
      confirmLabel: "Envoyer",
      fields: [{ name: "message", label: "Message (facultatif)", type: "textarea", placeholder: "Disponibilités, quartiers que vous connaissez…" }],
      action: (v) => orThrow(browserClient().rpc("courier_request_affiliation", { p_restaurant_id: r.id, p_message: v.message || null })),
    });
    if (done) setVersion((n) => n + 1);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="font-bold">Mes restaurants</h3>
        {data.mine.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {data.mine.map((a) => (
              <li key={a.restaurant_id} className="flex items-center justify-between gap-3">
                <span className="font-semibold">{a.restaurant?.name ?? "Restaurant"}</span>
                <Badge tone={label[a.status][1]}>{label[a.status][0]}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Aucune affiliation : vous recevez les commandes des restaurants de votre ville sans livreur attitré.</p>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-bold">Postuler auprès d&apos;un restaurant</h3>
        {!approved ? (
          <p className="mt-3 text-sm text-muted">Disponible dès que votre dossier est validé par l&apos;équipe Tchopi.</p>
        ) : open.length ? (
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm">
            {open.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <Store className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="text-xs text-muted">{[r.category, r.district].filter(Boolean).join(" · ")}</span>
                </span>
                <Button variant="soft" className="h-8 px-3 text-xs" onClick={() => apply(r)}>
                  Postuler
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Aucun autre restaurant dans votre ville pour le moment.</p>
        )}
      </Card>
    </div>
  );
}
