"use client";

import { Drawer } from "./dialog";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { mediaUrl } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { uploadEstablishmentImage } from "@/lib/media";
import { browserClient } from "@/lib/supabase";
import { Button, Field, fieldClass } from "./ui";

type EditableOption = { id: string; name: string; price_delta: number; is_available: boolean; position?: number };
type EditableGroup = { id: string; name: string; min_choices: number; max_choices: number; position?: number; product_options: EditableOption[] };
export type EditableProduct = {
  id?: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  photo_path: string | null;
  is_available: boolean;
  product_option_groups?: EditableGroup[];
};

const newGroup = (): EditableGroup => ({ id: crypto.randomUUID(), name: "", min_choices: 0, max_choices: 1, product_options: [newOption()] });
const newOption = (): EditableOption => ({ id: crypto.randomUUID(), name: "", price_delta: 0, is_available: true });

/** Ajout ou modification d'un produit en un seul panneau : photo, nom, prix, catégorie, disponibilité, options. */
export function ProductEditor({
  establishmentId,
  categories,
  product,
  defaultCategory,
  onClose,
  onSaved,
}: {
  establishmentId: string;
  categories: { id: string; name: string }[];
  product: EditableProduct | null;
  defaultCategory: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = browserClient();
  const [photo, setPhoto] = useState<string | null>(product?.photo_path ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [groups, setGroups] = useState<EditableGroup[]>(
    [...(product?.product_option_groups ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((g) => ({ ...g, product_options: [...g.product_options].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) })),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const updateGroup = (id: string, patch: Partial<EditableGroup>) => setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const updateOption = (groupId: string, optionId: string, patch: Partial<EditableOption>) =>
    setGroups((gs) =>
      gs.map((g) => (g.id === groupId ? { ...g, product_options: g.product_options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)) } : g)),
    );

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setError("Photo au format JPEG, PNG ou WebP.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const price = Number(String(form.get("price")).replace(/\s/g, ""));
    if (!Number.isInteger(price) || price <= 0) return setError("Prix invalide : un nombre entier de francs.");
    const cleanGroups = groups
      .map((g) => ({ ...g, name: g.name.trim(), product_options: g.product_options.filter((o) => o.name.trim()) }))
      .filter((g) => g.name || g.product_options.length);
    for (const g of cleanGroups) {
      if (!g.name) return setError("Donnez un nom à chaque groupe d'options (ex. Taille).");
      if (!g.product_options.length) return setError(`Ajoutez au moins un choix dans « ${g.name} ».`);
      if (g.min_choices > g.product_options.length) return setError(`« ${g.name} » demande plus de choix qu'il n'en propose.`);
    }
    setBusy(true);
    setError(null);
    try {
      const photoPath = file ? await uploadEstablishmentImage(establishmentId, file, "product") : photo;
      const fields = {
        restaurant_id: establishmentId,
        category_id: (form.get("category") as string) || null,
        name: String(form.get("name")).trim(),
        description: String(form.get("description")).trim() || null,
        price,
        photo_path: photoPath,
        is_available: form.get("available") === "on",
      };
      const saved = product?.id
        ? await db.from("products").update(fields).eq("id", product.id).select("id").single()
        : await db.from("products").insert(fields).select("id").single();
      if (saved.error) throw saved.error;
      await syncOptions(saved.data.id, cleanGroups);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  /** Options : groupes et choix retirés supprimés, les autres créés ou mis à jour (dans l'ordre affiché). */
  async function syncOptions(productId: string, list: EditableGroup[]) {
    const keptGroups = list.map((g) => g.id);
    const before = product?.product_option_groups ?? [];
    const removedGroups = before.filter((g) => !keptGroups.includes(g.id)).map((g) => g.id);
    if (removedGroups.length) {
      const { error } = await db.from("product_option_groups").delete().in("id", removedGroups);
      if (error) throw error;
    }
    if (!list.length) return;
    const groupsResult = await db.from("product_option_groups").upsert(
      list.map((g, i) => ({ id: g.id, product_id: productId, name: g.name, min_choices: g.min_choices, max_choices: Math.max(g.max_choices, g.min_choices, 1), position: i })),
    );
    if (groupsResult.error) throw groupsResult.error;
    const keptOptions = list.flatMap((g) => g.product_options.map((o) => o.id));
    const removedOptions = before.flatMap((g) => g.product_options).filter((o) => !keptOptions.includes(o.id)).map((o) => o.id);
    if (removedOptions.length) {
      const { error } = await db.from("product_options").delete().in("id", removedOptions);
      if (error) throw error;
    }
    const optionsResult = await db.from("product_options").upsert(
      list.flatMap((g) =>
        g.product_options.map((o, i) => ({ id: o.id, group_id: g.id, name: o.name.trim(), price_delta: Math.max(0, Math.round(o.price_delta)), is_available: o.is_available, position: i })),
      ),
    );
    if (optionsResult.error) throw optionsResult.error;
  }

  const shownPhoto = preview ?? mediaUrl(photo);

  return (
    <Drawer title={product ? "Modifier le produit" : "Nouveau produit"} onClose={onClose}>
      <form onSubmit={save} className="flex h-full flex-col">

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files[0]);
              }}
              className="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-card border-2 border-dashed border-border bg-surface-alt text-muted hover:border-primary hover:text-primary"
              aria-label="Choisir une photo"
            >
              {shownPhoto ? <Image src={shownPhoto} alt="" fill sizes="112px" className="object-cover" /> : <ImagePlus className="size-7" aria-hidden />}
            </button>
            <div className="text-sm text-muted">
              <p className="font-semibold text-ink">Photo du produit</p>
              <p>Cliquez ou déposez une image. Elle est réduite automatiquement avant l&apos;envoi.</p>
              {shownPhoto && (
                <button type="button" onClick={() => (setPhoto(null), setFile(null), setPreview(null))} className="mt-1 font-semibold text-danger">
                  Retirer la photo
                </button>
              )}
            </div>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </div>

          <Field label="Nom">
            <input name="name" required minLength={2} maxLength={80} defaultValue={product?.name} autoFocus className={fieldClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prix (FCFA)">
              <input name="price" required inputMode="numeric" defaultValue={product?.price} className={`${fieldClass} tabular`} />
            </Field>
            <Field label="Catégorie">
              <select name="category" defaultValue={product?.category_id ?? defaultCategory ?? ""} className={fieldClass}>
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description (facultatif)">
            <textarea name="description" maxLength={300} rows={2} defaultValue={product?.description ?? ""} className={`${fieldClass} h-auto py-3`} />
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" name="available" defaultChecked={product?.is_available ?? true} className="size-4 accent-[var(--primary)]" />
            Disponible à la commande
          </label>

          <section className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">Options</h3>
                <p className="text-xs text-muted">Taille, cuisson, suppléments… avec un prix ajouté si besoin.</p>
              </div>
              <Button variant="soft" onClick={() => setGroups((gs) => [...gs, newGroup()])} className="h-9 px-3 text-xs">
                <Plus className="size-4" aria-hidden /> Groupe
              </Button>
            </div>
            {groups.map((g) => (
              <div key={g.id} className="space-y-3 rounded-field border border-border p-4">
                <div className="flex items-center gap-2">
                  <input
                    value={g.name}
                    onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                    placeholder="Nom du groupe (ex. Taille)"
                    maxLength={40}
                    aria-label="Nom du groupe"
                    className={`${fieldClass} h-10`}
                  />
                  <button type="button" aria-label="Supprimer le groupe" onClick={() => setGroups((gs) => gs.filter((x) => x.id !== g.id))} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(
                    [
                      ["Un choix obligatoire", 1, 1],
                      ["Un choix facultatif", 0, 1],
                      ["Plusieurs choix facultatifs", 0, 10],
                    ] as const
                  ).map(([label, min, max]) => {
                    const on = g.min_choices === min && (max === 1 ? g.max_choices === 1 : g.max_choices > 1);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={on}
                        onClick={() => updateGroup(g.id, { min_choices: min, max_choices: max })}
                        className={`rounded-full px-3 py-1.5 font-semibold ${on ? "bg-ink text-on-ink" : "bg-surface-alt text-muted"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <ul className="space-y-2">
                  {g.product_options.map((o) => (
                    <li key={o.id} className="flex items-center gap-2">
                      <input
                        value={o.name}
                        onChange={(e) => updateOption(g.id, o.id, { name: e.target.value })}
                        placeholder="Choix (ex. Grand)"
                        maxLength={40}
                        aria-label="Nom du choix"
                        className={`${fieldClass} h-10`}
                      />
                      <input
                        value={o.price_delta || ""}
                        onChange={(e) => updateOption(g.id, o.id, { price_delta: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                        inputMode="numeric"
                        placeholder="+ 0 FCFA"
                        aria-label="Prix ajouté"
                        className={`${fieldClass} tabular h-10 w-28`}
                      />
                      <label className="flex items-center" title="Disponible">
                        <input type="checkbox" checked={o.is_available} onChange={(e) => updateOption(g.id, o.id, { is_available: e.target.checked })} className="size-4 accent-[var(--primary)]" aria-label="Choix disponible" />
                      </label>
                      <button
                        type="button"
                        aria-label="Supprimer le choix"
                        onClick={() => updateGroup(g.id, { product_options: g.product_options.filter((x) => x.id !== o.id) })}
                        className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => updateGroup(g.id, { product_options: [...g.product_options, newOption()] })} className="text-sm font-semibold text-primary">
                  + Ajouter un choix
                </button>
              </div>
            ))}
          </section>
        </div>

        <div className="space-y-2 border-t border-border p-5">
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
