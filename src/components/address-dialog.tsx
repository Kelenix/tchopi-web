"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { errorMessage } from "@/lib/errors";
import { browserClient } from "@/lib/supabase";
import { MapPicker, type Point } from "./map-picker";
import { Button, Field, fieldClass } from "./ui";

/** Nouvelle adresse : point sur la carte + quartier et repère (la zone est déduite par le serveur). */
export function AddressDialog({ center, onClose, onSaved }: { center: Point; onClose: () => void; onSaved: (id: string) => void }) {
  const [point, setPoint] = useState(center);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await browserClient()
      .from("addresses")
      .insert({
        label: String(form.get("label")).trim() || "Maison",
        district: String(form.get("district")).trim(),
        landmark: String(form.get("landmark")).trim(),
        instructions: String(form.get("instructions")).trim() || null,
        latitude: point.lat,
        longitude: point.lng,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      setError(/address_out_of_zone/.test(error.message) ? "Ce point n'est dans aucune ville desservie par Tchopi." : errorMessage(error));
      return;
    }
    onSaved(data.id);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form onSubmit={save} className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-card bg-surface p-6 shadow-float">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Nouvelle adresse</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-9 place-items-center rounded-full hover:bg-surface-alt">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <MapPicker initial={center} onChange={setPoint} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Quartier">
            <input name="district" required minLength={2} maxLength={80} placeholder="Riviera 2" className={fieldClass} />
          </Field>
          <Field label="Nom de l'adresse">
            <input name="label" maxLength={30} placeholder="Maison, Bureau…" className={fieldClass} />
          </Field>
          <Field label="Point de repère" hint="Ce qui aide le livreur à trouver : pharmacie, carrefour, couleur du portail…">
            <input name="landmark" required minLength={3} maxLength={160} className={fieldClass} />
          </Field>
          <Field label="Instructions (facultatif)">
            <input name="instructions" maxLength={300} placeholder="Appeler en arrivant" className={fieldClass} />
          </Field>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="mt-5 w-full">
          {busy ? "Enregistrement…" : "Enregistrer l'adresse"}
        </Button>
      </form>
    </div>
  );
}
