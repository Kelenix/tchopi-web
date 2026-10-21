"use client";

import { dialog } from "./dialog";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { EstablishmentDetail, Product } from "@/lib/catalog";
import { cart, cartCount, cartSubtotal, useCart, type CartOption } from "@/lib/cart";
import { mediaUrl } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { productAnchor, uniqueAnchors } from "@/lib/slug";
import { Button } from "./ui";

/** Produits d'un établissement par catégorie, choix des options et ajout au panier. */
export function Menu({ establishment }: { establishment: EstablishmentDetail }) {
  const current = useCart();
  const [picked, setPicked] = useState<Product | null>(null);
  const sections = useMemo(() => {
    const byCategory = establishment.categories
      .map((c) => ({ id: c.id, name: c.name, products: establishment.products.filter((p) => p.category_id === c.id) }))
      .filter((s) => s.products.length);
    const others = establishment.products.filter(
      (p) => !p.category_id || !establishment.categories.some((c) => c.id === p.category_id),
    );
    const all = others.length ? [...byCategory, { id: "autres", name: byCategory.length ? "Autres" : "Produits", products: others }] : byCategory;
    // Ancres lisibles (#boissons, #plat-garba) ; les anciennes (#cat-<uuid>, #produit-<uuid>) restent posées.
    const anchors = uniqueAnchors(all.map((s) => s.name));
    const products = uniqueAnchors(all.flatMap((s) => s.products.map((p) => productAnchor(p.name))));
    let i = 0;
    return all.map((s, k) => ({ ...s, anchor: anchors[k], products: s.products.map((p) => ({ ...p, anchor: products[i++] })) }));
  }, [establishment]);

  const count = current?.establishmentId === establishment.id ? cartCount(current) : 0;

  return (
    <>
      {sections.length > 1 && (
        <nav aria-label="Catégories du menu" className="glass-nav sticky top-[5rem] z-30 mb-8 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1.5">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.anchor}`} className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink">
              {s.name}
            </a>
          ))}
        </nav>
      )}
      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.id} id={s.anchor} className="scroll-mt-32">
            <span id={`cat-${s.id}`} className="block scroll-mt-32" aria-hidden />
            <h2 className="mb-5 font-display text-4xl">{s.name}</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {s.products.map((p) => (
                <li key={p.id} id={p.anchor} className="scroll-mt-32">
                  <span id={`produit-${p.id}`} className="block scroll-mt-32" aria-hidden />
                  <ProductRow
                    product={p}
                    disabled={!establishment.is_open || !p.is_available}
                    onAdd={() => (p.option_groups.length ? setPicked(p) : add(p, []))}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {picked && <OptionsDialog product={picked} onClose={() => setPicked(null)} onConfirm={(q, o) => (add(picked, o, q), setPicked(null))} />}
      {count > 0 && current && (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <Link
            href="/espace/panier"
            className="mx-auto flex h-14 max-w-md items-center justify-between rounded-full bg-primary px-6 font-semibold text-on-primary shadow-float"
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="size-5" aria-hidden /> Voir le panier ({count})
            </span>
            <span className="tabular">{formatMoney(cartSubtotal(current))}</span>
          </Link>
        </div>
      )}
    </>
  );

  async function add(p: Product, options: CartOption[], quantity = 1) {
    if (
      current &&
      current.establishmentId !== establishment.id &&
      current.lines.length &&
      !(await dialog.confirm({
        title: "Remplacer votre panier ?",
        body: `Votre panier contient des produits de ${current.establishmentName}. Une commande ne concerne qu'un restaurant.`,
        confirmLabel: "Remplacer",
      }))
    ) {
      return;
    }
    cart.add(
      { id: establishment.id, name: establishment.name },
      {
        productId: p.id,
        name: p.name,
        unitPrice: p.price + options.reduce((n, o) => n + o.price_delta, 0),
        quantity,
        options,
      },
    );
  }
}

function ProductRow({ product: p, disabled, onAdd }: { product: Product; disabled: boolean; onAdd: () => void }) {
  const url = mediaUrl(p.photo_path);
  return (
    <div className="flex h-full gap-4 rounded-[24px] border border-border bg-surface p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-float">
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-bold">{p.name}</h3>
        {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
        <div className="mt-auto flex items-center gap-3 pt-3">
          <span className="tabular font-bold">{formatMoney(p.price)}</span>
          {p.option_groups.length > 0 && <span className="text-xs text-muted">Options disponibles</span>}
          {!p.is_available && <span className="text-xs font-semibold text-danger">Indisponible</span>}
        </div>
      </div>
      <div className="relative shrink-0">
        <div className="relative size-24 overflow-hidden rounded-field bg-surface-alt sm:size-28">
          {url && <Image src={url} alt={p.name} fill sizes="112px" className="object-cover" />}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          aria-label={`Ajouter ${p.name}`}
          className="absolute -bottom-2 -right-2 grid size-10 place-items-center rounded-full bg-primary text-on-primary shadow-float transition hover:brightness-110 disabled:bg-surface-alt disabled:text-muted"
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function OptionsDialog({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (quantity: number, options: CartOption[]) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const chosen: CartOption[] = product.option_groups.flatMap((g) =>
    g.options
      .filter((o) => selected[g.id]?.includes(o.id))
      .map((o) => ({ id: o.id, name: o.name, group: g.name, price_delta: o.price_delta })),
  );
  const valid = product.option_groups.every((g) => {
    const n = selected[g.id]?.length ?? 0;
    return n >= g.min_choices && n <= g.max_choices;
  });
  const unit = product.price + chosen.reduce((n, o) => n + o.price_delta, 0);

  function toggle(groupId: string, optionId: string, max: number) {
    setSelected((s) => {
      const list = s[groupId] ?? [];
      if (list.includes(optionId)) return { ...s, [groupId]: list.filter((id) => id !== optionId) };
      if (max === 1) return { ...s, [groupId]: [optionId] };
      return list.length >= max ? s : { ...s, [groupId]: [...list, optionId] };
    });
  }

  return (
    <dialog
      ref={(el) => {
        ref.current = el;
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-card bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 className="text-lg font-bold">{product.name}</h2>
          <p className="tabular text-sm text-muted">{formatMoney(product.price)}</p>
        </div>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Fermer" className="grid size-9 place-items-center rounded-full hover:bg-surface-alt">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="max-h-[60vh] space-y-6 overflow-y-auto p-5">
        {product.option_groups.map((g) => (
          <fieldset key={g.id}>
            <legend className="flex w-full items-center justify-between font-semibold">
              {g.name}
              <span className="text-xs font-medium text-muted">
                {g.min_choices > 0 ? "Obligatoire" : "Facultatif"}
                {g.max_choices > 1 ? ` · jusqu'à ${g.max_choices}` : ""}
              </span>
            </legend>
            <div className="mt-3 space-y-2">
              {g.options.map((o) => {
                const on = selected[g.id]?.includes(o.id) ?? false;
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-field border px-4 py-3 text-sm ${on ? "border-primary bg-primary-soft" : "border-border"} ${o.is_available ? "" : "cursor-not-allowed opacity-50"}`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type={g.max_choices === 1 ? "radio" : "checkbox"}
                        name={g.id}
                        checked={on}
                        disabled={!o.is_available}
                        onChange={() => toggle(g.id, o.id, g.max_choices)}
                        className="accent-[var(--primary)]"
                      />
                      {o.name}
                    </span>
                    <span className="tabular text-muted">{o.price_delta ? `+ ${formatMoney(o.price_delta)}` : ""}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-border p-5">
        <div className="flex items-center gap-1 rounded-full bg-surface-alt p-1">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Moins" className="grid size-9 place-items-center rounded-full hover:bg-surface">
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="tabular w-6 text-center font-semibold">{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(50, q + 1))} aria-label="Plus" className="grid size-9 place-items-center rounded-full hover:bg-surface">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <Button disabled={!valid} onClick={() => onConfirm(quantity, chosen)} className="flex-1">
          Ajouter · <span className="tabular">{formatMoney(unit * quantity)}</span>
        </Button>
      </div>
    </dialog>
  );
}
