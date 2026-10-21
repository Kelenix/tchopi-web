"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button, Card, fieldClass } from "./ui";
import { errorMessage } from "@/lib/errors";
import { browserClient } from "@/lib/supabase";

const good: [string, string][] = [
  ["fast", "Rapide"],
  ["friendly", "Aimable"],
  ["careful", "Commande intacte"],
  ["on_time", "À l'heure"],
];
const bad: [string, string][] = [
  ["late", "En retard"],
  ["damaged", "Commande abîmée"],
  ["rude", "Peu aimable"],
];

/** Évaluation du livreur après la livraison (ADR-061) : étoiles, mots rapides, commentaire ; une seule fois. */
export function RateCourier({ orderId, courierName }: { orderId: string; courierName: string }) {
  const db = browserClient();
  const [rated, setRated] = useState<{ id: string; stars: number | null } | null>(null);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    db.from("courier_ratings")
      .select("stars")
      .eq("order_id", orderId)
      .maybeSingle()
      .then(({ data }) => alive && setRated({ id: orderId, stars: (data?.stars as number | undefined) ?? null }));
    return () => {
      alive = false;
    };
  }, [db, orderId]);

  const current = rated?.id === orderId ? rated : null;
  if (!current) return null;
  if (current.stars) {
    return (
      <Card className="bg-primary-soft p-5">
        <p className="font-bold">Merci pour votre note !</p>
        <div className="mt-2 flex gap-1 text-primary" aria-label={`${current.stars} étoiles sur 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`size-6 ${i <= current.stars! ? "fill-current" : ""}`} aria-hidden />
          ))}
        </div>
      </Card>
    );
  }

  const choices = stars >= 4 ? good : bad;
  async function submit() {
    setBusy(true);
    setError(null);
    const { error } = await db.rpc("rate_courier", { p_order_id: orderId, p_stars: stars, p_tags: tags, p_comment: comment.trim() || null });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setRated({ id: orderId, stars });
  }

  return (
    <Card className="bg-primary-soft p-5">
      <p className="font-bold">Comment était {courierName} ?</p>
      <p className="text-sm text-muted">Touchez une étoile pour noter la livraison.</p>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={stars === i}
            aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
            onClick={() => {
              setStars(i);
              setTags((t) => t.filter((x) => (i >= 4 ? good : bad).some(([k]) => k === x)));
            }}
            className="text-primary transition hover:scale-110"
          >
            <Star className={`size-9 ${i <= stars ? "fill-current" : ""}`} aria-hidden />
          </button>
        ))}
      </div>
      {stars > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {choices.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTags((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${tags.includes(k) ? "bg-ink text-on-ink" : "bg-surface text-muted ring-1 ring-border"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Un mot pour le livreur (facultatif)"
            className={`${fieldClass} h-auto py-3`}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={submit} disabled={busy}>
            {busy ? "Envoi…" : "Envoyer ma note"}
          </Button>
        </div>
      )}
    </Card>
  );
}
