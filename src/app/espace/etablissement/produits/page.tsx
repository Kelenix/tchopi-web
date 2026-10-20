"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Archive, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ProductEditor, type EditableProduct } from "@/components/product-editor";
import { Button, Card, fieldClass } from "@/components/ui";
import { useEstablishment } from "@/lib/establishment";
import { mediaUrl } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { browserClient } from "@/lib/supabase";

type Category = { id: string; name: string; position: number };

export default function ProductsPage() {
  return (
    <Suspense>
      <Products />
    </Suspense>
  );
}

function Products() {
  const { id: establishmentId } = useEstablishment();
  const db = browserClient();
  const openNew = useSearchParams().has("nouveau");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<EditableProduct[] | null>(null);
  const [filter, setFilter] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditableProduct | "new" | null>(openNew ? "new" : null);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const load = useCallback(async () => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      db.from("categories").select("id, name, position").eq("restaurant_id", establishmentId).order("position").order("name"),
      db
        .from("products")
        .select("id, category_id, name, description, price, photo_path, is_available, product_option_groups(id, name, min_choices, max_choices, position, product_options(id, name, price_delta, is_available, position))")
        .eq("restaurant_id", establishmentId)
        .is("archived_at", null)
        .order("name"),
    ]).then(([c, p]) => {
      if (!alive) return;
      if (c.error || p.error) setError(errorMessage(c.error ?? p.error));
      setCategories((c.data ?? []) as Category[]);
      setProducts((p.data ?? []) as unknown as EditableProduct[]);
    });
    return () => {
      alive = false;
    };
  }, [db, establishmentId, version]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter(
      (p) => (filter === "all" || p.category_id === filter || (filter === "none" && !p.category_id)) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, filter, query]);

  async function run(action: PromiseLike<{ error: unknown }>) {
    const { error } = await action;
    setError(error ? errorMessage(error) : null);
    await load();
  }

  async function addCategory() {
    const name = prompt("Nom de la nouvelle catégorie (ex. Boissons, Plats, Épicerie)")?.trim();
    if (!name) return;
    await run(db.from("categories").insert({ restaurant_id: establishmentId, name, position: (categories?.length ?? 0) }));
  }

  async function moveCategory(index: number, delta: number) {
    if (!categories) return;
    const list = [...categories];
    const [moved] = list.splice(index, 1);
    list.splice(index + delta, 0, moved);
    await run(db.from("categories").upsert(list.map((c, i) => ({ id: c.id, restaurant_id: establishmentId, name: c.name, position: i }))));
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">Produits</h1>
          <p className="mt-1 text-sm text-muted">
            {products ? `${products.length} produit${products.length > 1 ? "s" : ""} · ${products.filter((p) => !p.is_available).length} indisponible(s)` : " "}
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> Ajouter un produit
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Card className="h-fit p-3">
          <div className="flex items-center justify-between px-2 py-1">
            <h2 className="text-sm font-bold">Catégories</h2>
            <button type="button" onClick={addCategory} aria-label="Ajouter une catégorie" className="grid size-8 place-items-center rounded-full text-primary hover:bg-primary-soft">
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <ul className="mt-1 space-y-0.5">
            {[{ id: "all", name: "Tous les produits" }, ...(categories ?? []), { id: "none", name: "Sans catégorie" }].map((c, i) => {
              const real = c.id !== "all" && c.id !== "none";
              const index = i - 1;
              return (
                <li key={c.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilter(c.id)}
                    className={`min-w-0 flex-1 truncate rounded-field px-3 py-2 text-left text-sm font-semibold ${filter === c.id ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-alt"}`}
                  >
                    {c.name}
                  </button>
                  {real && categories && (
                    <span className="hidden gap-0.5 group-hover:flex">
                      <IconButton label="Monter" disabled={index === 0} onClick={() => moveCategory(index, -1)} icon={ArrowUp} />
                      <IconButton label="Descendre" disabled={index === categories.length - 1} onClick={() => moveCategory(index, 1)} icon={ArrowDown} />
                      <IconButton
                        label="Renommer"
                        icon={Pencil}
                        onClick={() => {
                          const name = prompt("Nouveau nom", c.name)?.trim();
                          if (name) run(db.from("categories").update({ name }).eq("id", c.id));
                        }}
                      />
                      <IconButton
                        label="Supprimer"
                        icon={Trash2}
                        onClick={() => {
                          if (confirm(`Supprimer la catégorie « ${c.name} » ? Ses produits passent « Sans catégorie ».`)) {
                            if (filter === c.id) setFilter("all");
                            run(db.from("categories").delete().eq("id", c.id));
                          }
                        }}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div>
          <label className="relative block max-w-sm">
            <Search className="absolute left-4 top-3.5 size-4 text-muted" aria-hidden />
            <span className="sr-only">Rechercher un produit</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit" className={`${fieldClass} pl-10`} />
          </label>
          <div className="mt-4">
            {!products ? (
              <div className="h-64 animate-pulse rounded-card bg-surface-alt" />
            ) : shown.length === 0 ? (
              <EmptyState
                icon={Package}
                title={products.length ? "Aucun produit ici" : "Ajoutez votre premier produit"}
                body={products.length ? "Changez de catégorie ou de recherche." : "Nom, prix et photo suffisent : les options peuvent venir ensuite."}
                action={<Button onClick={() => setEditing("new")}>Ajouter un produit</Button>}
              />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
                {shown.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    category={categories?.find((c) => c.id === p.category_id)?.name}
                    onEdit={() => setEditing(p)}
                    onToggle={() => run(db.from("products").update({ is_available: !p.is_available }).eq("id", p.id!))}
                    onArchive={() => {
                      if (confirm(`Retirer « ${p.name} » de la carte ? Il reste dans l'historique des commandes.`)) {
                        run(db.from("products").update({ archived_at: new Date().toISOString() }).eq("id", p.id!));
                      }
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {editing && categories && (
        <ProductEditor
          establishmentId={establishmentId}
          categories={categories}
          product={editing === "new" ? null : editing}
          defaultCategory={filter !== "all" && filter !== "none" ? filter : null}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function IconButton({ label, icon: Icon, onClick, disabled }: { label: string; icon: typeof Pencil; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface-alt hover:text-ink disabled:opacity-30">
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}

function ProductRow({
  product: p,
  category,
  onEdit,
  onToggle,
  onArchive,
}: {
  product: EditableProduct;
  category?: string;
  onEdit: () => void;
  onToggle: () => void;
  onArchive: () => void;
}) {
  const url = mediaUrl(p.photo_path);
  const options = p.product_option_groups?.length ?? 0;
  return (
    <li className="flex items-center gap-4 p-4">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-field bg-surface-alt">
        {url && <Image src={url} alt="" fill sizes="56px" className="object-cover" />}
      </div>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate font-semibold">{p.name}</p>
        <p className="truncate text-xs text-muted">
          {category ?? "Sans catégorie"}
          {options ? ` · ${options} groupe${options > 1 ? "s" : ""} d'options` : ""}
        </p>
      </button>
      <span className="tabular hidden font-bold sm:block">{formatMoney(p.price)}</span>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
        <input type="checkbox" checked={p.is_available} onChange={onToggle} className="peer sr-only" />
        <span className="relative h-6 w-11 rounded-full bg-border transition peer-checked:bg-primary peer-focus-visible:outline-2 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
        <span className="hidden w-20 md:block">{p.is_available ? "Disponible" : "Indisponible"}</span>
      </label>
      <button type="button" onClick={onEdit} aria-label={`Modifier ${p.name}`} className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-alt hover:text-ink">
        <Pencil className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={onArchive} aria-label={`Retirer ${p.name}`} className="grid size-9 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
        <Archive className="size-4" aria-hidden />
      </button>
    </li>
  );
}
