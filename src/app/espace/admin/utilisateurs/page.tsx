"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge, Button, Card, fieldClass } from "@/components/ui";
import { dialog, orThrow } from "@/components/dialog";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { browserClient } from "@/lib/supabase";

type Role = "admin" | "restaurant" | "courier" | "client";
type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  email: string | null;
  created_at: string;
  is_suspended: boolean;
  role: Role;
  courier_status: string | null;
  restaurants: string[];
};
type Result = { counts: Record<Role | "all", number>; total: number; rows: Profile[] };
const roleTabs: [Role | "all", string][] = [
  ["all", "Tous"],
  ["client", "Clients"],
  ["restaurant", "Établissements"],
  ["courier", "Livreurs"],
  ["admin", "Admins"],
];
const courierLabel: Record<string, string> = { pending: "dossier à valider", approved: "validé", rejected: "refusé", suspended: "suspendu" };
const PAGE = 50;

/** Badge du rôle : qui est ce compte, d'un coup d'œil. */
function RoleBadge({ u }: { u: Profile }) {
  if (u.role === "admin") return <Badge tone="danger">Admin</Badge>;
  if (u.role === "restaurant") return <Badge tone="warning">Établissement · {u.restaurants.join(", ")}</Badge>;
  if (u.role === "courier") return <Badge tone={u.courier_status === "approved" ? "success" : "warning"}>Livreur · {courierLabel[u.courier_status ?? ""] ?? u.courier_status}</Badge>;
  return <Badge tone="neutral">Client</Badge>;
}

export default function AdminUsersPage() {
  const db = browserClient();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Result } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const key = JSON.stringify([query.trim(), role, page, version]);
  useEffect(() => {
    let alive = true;
    const [q, r, pg] = JSON.parse(key) as [string, Role | "all", number];
    // Recherche, filtre par rôle et pages calculés par le serveur (admin_users_list).
    db.rpc("admin_users_list", { p_query: q || null, p_role: r === "all" ? null : r, p_limit: PAGE, p_offset: pg * PAGE })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(errorMessage(error));
        else setResult({ key, data: data as Result });
      });
    return () => {
      alive = false;
    };
  }, [db, key]);
  const current = result?.key === key ? result.data : null;
  const users = current?.rows ?? null;
  const pages = Math.max(1, Math.ceil((current?.total ?? 0) / PAGE));

  async function toggle(u: Profile) {
    const reason = u.is_suspended
      ? null
      : (await dialog.prompt({ title: "Suspendre ce compte", body: "La connexion est bloquée jusqu'à réactivation.", tone: "danger", confirmLabel: "Suspendre", fields: [{ name: "v", label: "Motif", type: "textarea", required: true }] }))?.v;
    if (!u.is_suspended && !reason) return;
    // Blocage de connexion compris : fonction serveur admin-users (vérifie le rôle admin et trace l'action).
    const { error } = await db.functions.invoke("admin-users", { body: { action: u.is_suspended ? "reactivate" : "suspend", user_id: u.id, reason } });
    setError(error ? errorMessage(error) : null);
    setVersion((v) => v + 1);
  }

  async function rename(u: Profile) {
    const v = await dialog.prompt({
      title: "Modifier le compte",
      fields: [
        { name: "first", label: "Prénom", defaultValue: u.first_name ?? "" },
        { name: "last", label: "Nom", defaultValue: u.last_name ?? "" },
      ],
      action: (v) => orThrow(db.rpc("admin_update_profile", { p_user_id: u.id, p_first_name: v.first, p_last_name: v.last })),
    });
    if (v) setVersion((n) => n + 1);
  }
  async function remove(u: Profile) {
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "ce compte";
    await dialog.confirm({
      title: `Supprimer ${name} ?`,
      body: "Ses données personnelles sont effacées ; l'historique des commandes est conservé sans nom. Action définitive.",
      tone: "danger",
      confirmLabel: "Supprimer",
      action: () => orThrow(db.functions.invoke("admin-users", { body: { action: "delete", user_id: u.id } })),
    });
    setVersion((v) => v + 1);
  }

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Utilisateurs</h1>
      <form
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          setQuery(String(new FormData(e.currentTarget).get("q")));
          setPage(0);
        }}
        className="mt-6 flex max-w-md gap-2"
      >
        <label className="relative flex-1">
          <Search className="absolute left-4 top-3.5 size-4 text-muted" aria-hidden />
          <span className="sr-only">Rechercher</span>
          <input name="q" placeholder="Nom, téléphone ou e-mail" className={`${fieldClass} pl-10`} />
        </label>
        <Button type="submit" variant="ink">
          Chercher
        </Button>
      </form>
      <div role="tablist" aria-label="Rôle" className="mt-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surface-alt p-1">
        {roleTabs.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={role === k}
            onClick={() => {
              setRole(k);
              setPage(0);
            }}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${role === k ? "bg-surface shadow-float" : "text-muted"}`}
          >
            {label}
            {current ? ` (${current.counts[k]})` : ""}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-6">
        {!users ? (
          <div className="h-48 animate-pulse rounded-card bg-surface-alt" />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="Aucun utilisateur trouvé" />
        ) : (
          <Card className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "Sans nom"}</span>
                    <RoleBadge u={u} />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {[u.email, u.phone, u.city].filter(Boolean).join(" · ") || "—"} · inscrit le {formatDate(u.created_at)}
                  </span>
                </span>
                {u.is_suspended && <Badge tone="danger">Suspendu</Badge>}
                <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => rename(u)}>
                  Modifier
                </Button>
                <Button variant={u.is_suspended ? "soft" : "outline"} className="h-9 px-3 text-xs" onClick={() => toggle(u)}>
                  {u.is_suspended ? "Réactiver" : "Suspendre"}
                </Button>
                <Button variant="outline" className="h-9 px-3 text-xs text-danger" onClick={() => remove(u)}>
                  Supprimer
                </Button>
              </div>
            ))}
          </Card>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" className="h-9 px-4" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Précédents
          </Button>
          <span className="tabular text-muted">
            Page {page + 1} / {pages}
          </span>
          <Button variant="outline" className="h-9 px-4" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
            Suivants
          </Button>
        </nav>
      )}
    </>
  );
}
