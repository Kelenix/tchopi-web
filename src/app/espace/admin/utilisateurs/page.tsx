"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge, Button, Card, fieldClass } from "@/components/ui";
import { errorMessage, functionErrorMessage } from "@/lib/errors";
import { browserClient } from "@/lib/supabase";

type Profile = { id: string; first_name: string | null; last_name: string | null; phone: string | null; city: string | null; is_suspended: boolean };

export default function AdminUsersPage() {
  const db = browserClient();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    let request = db.from("profiles").select("id, first_name, last_name, phone, city, is_suspended").is("deleted_at", null);
    const q = query.trim().replace(/[%,()]/g, "");
    if (q) request = request.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q.replace(/\s/g, "")}%`);
    request
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => alive && setUsers((data ?? []) as Profile[]));
    return () => {
      alive = false;
    };
  }, [db, query, version]);

  async function toggle(u: Profile) {
    const reason = u.is_suspended ? null : prompt("Motif de la suspension")?.trim();
    if (!u.is_suspended && !reason) return;
    // Blocage de connexion compris : fonction serveur admin-users (vérifie le rôle admin et trace l'action).
    const { error } = await db.functions.invoke("admin-users", { body: { action: u.is_suspended ? "reactivate" : "suspend", user_id: u.id, reason } });
    setError(error ? errorMessage(error) : null);
    setVersion((v) => v + 1);
  }

  async function rename(u: Profile) {
    const first = prompt("Prénom", u.first_name ?? "");
    if (first === null) return;
    const last = prompt("Nom", u.last_name ?? "");
    if (last === null) return;
    const { error } = await db.rpc("admin_update_profile", { p_user_id: u.id, p_first_name: first, p_last_name: last });
    setError(error ? errorMessage(error) : null);
    setVersion((v) => v + 1);
  }

  async function remove(u: Profile) {
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "ce compte";
    if (!confirm(`Supprimer ${name} ? Ses données personnelles sont effacées, l'historique des commandes est conservé sans nom. Action définitive.`)) return;
    const { error } = await db.functions.invoke("admin-users", { body: { action: "delete", user_id: u.id } });
    setError(error ? await functionErrorMessage(error) : null);
    setVersion((v) => v + 1);
  }

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Utilisateurs</h1>
      <form
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          setQuery(String(new FormData(e.currentTarget).get("q")));
        }}
        className="mt-6 flex max-w-md gap-2"
      >
        <label className="relative flex-1">
          <Search className="absolute left-4 top-3.5 size-4 text-muted" aria-hidden />
          <span className="sr-only">Rechercher</span>
          <input name="q" placeholder="Nom ou téléphone" className={`${fieldClass} pl-10`} />
        </label>
        <Button type="submit" variant="ink">
          Chercher
        </Button>
      </form>
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
                  <span className="block font-semibold">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "Sans nom"}</span>
                  <span className="text-xs text-muted">
                    {u.phone ?? "—"}
                    {u.city ? ` · ${u.city}` : ""}
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
    </>
  );
}
