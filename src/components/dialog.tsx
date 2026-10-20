"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Button, Field, fieldClass } from "./ui";
import { errorMessage } from "@/lib/errors";

/**
 * Boîtes de dialogue de Tchopi (système de design) : confirmation, saisie, information, et panneau latéral pour les
 * formulaires. Appel impératif sans état local : `await dialog.confirm({...})`. Élément <dialog> natif (focus piégé,
 * Échap, retour du focus), thèmes clair et sombre, bouton bloqué pendant l'action (pas de double validation).
 */
type Tone = "default" | "danger";
type FieldSpec = {
  name: string;
  label: string;
  defaultValue?: string;
  type?: "text" | "number" | "textarea";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
};
type Request = {
  id: number;
  kind: "confirm" | "prompt" | "alert";
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  tone?: Tone;
  fields?: FieldSpec[];
  /** Action exécutée dans la boîte : chargement affiché, erreur affichée sans fermer. */
  action?: (values: Record<string, string>) => Promise<unknown>;
  resolve: (value: Record<string, string> | boolean | null) => void;
};

let current: Request | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function open<T>(r: Omit<Request, "id" | "resolve">): Promise<T> {
  current?.resolve(null);
  return new Promise<T>((resolve) => {
    current = { ...r, id: ++seq, resolve: resolve as Request["resolve"] };
    emit();
  });
}
function close(value: Record<string, string> | boolean | null) {
  current?.resolve(value);
  current = null;
  emit();
}

type Common = { title: string; body?: ReactNode; confirmLabel?: string; tone?: Tone };
export const dialog = {
  /** true si l'utilisateur confirme (après l'action éventuelle réussie). */
  confirm: (o: Common & { action?: () => Promise<unknown> }) => open<boolean>({ kind: "confirm", ...o }).then(Boolean),
  /** Valeurs saisies, ou null si annulé. */
  prompt: (o: Common & { fields: FieldSpec[]; action?: (v: Record<string, string>) => Promise<unknown> }) =>
    open<Record<string, string> | null>({ kind: "prompt", ...o }),
  alert: (o: Common) => open<boolean>({ kind: "alert", ...o }).then(() => undefined),
};

/** Lève l'erreur Supabase éventuelle pour qu'elle s'affiche dans la boîte. */
export async function orThrow<T extends { error: unknown }>(p: PromiseLike<T>): Promise<T> {
  const r = await p;
  if (r.error) throw r.error;
  return r;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Point de montage unique (racine du site). */
export function DialogHost() {
  const r = useSyncExternalStore(subscribe, () => current, () => null);
  return r ? <DialogView key={r.id} r={r} /> : null;
}

function DialogView({ r }: { r: Request }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const Icon = r.tone === "danger" ? (r.kind === "confirm" ? Trash2 : AlertTriangle) : Info;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const values = Object.fromEntries([...new FormData(e.currentTarget)].map(([k, v]) => [k, String(v).trim()]));
    if (r.action) {
      setBusy(true);
      setError(null);
      try {
        await r.action(values);
      } catch (err) {
        setBusy(false);
        const code = (err as { context?: Response })?.context;
        const body = code?.json ? await code.json().catch(() => null) : null;
        return setError(errorMessage(body?.code ? { message: body.code } : err));
      }
    }
    close(r.kind === "prompt" ? values : true);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`dlg-${r.id}`}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close(r.kind === "prompt" ? null : false);
      }}
      onClick={(e) => e.target === ref.current && !busy && close(r.kind === "prompt" ? null : false)}
      className="m-auto w-[min(92vw,28rem)] rounded-[28px] border border-border bg-surface p-0 text-ink shadow-float backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} className="space-y-5 p-6">
        <div className="flex gap-4">
          <span className={clsx("grid size-11 shrink-0 place-items-center rounded-2xl", r.tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary")}>
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 pt-1">
            <h2 id={`dlg-${r.id}`} className="text-lg font-extrabold leading-snug">
              {r.title}
            </h2>
            {r.body && <div className="mt-1 text-sm text-muted">{r.body}</div>}
          </div>
        </div>
        {r.fields?.map((f, i) => (
          <Field key={f.name} label={f.label} hint={f.hint}>
            {f.type === "textarea" ? (
              <textarea name={f.name} defaultValue={f.defaultValue} required={f.required} placeholder={f.placeholder} autoFocus={i === 0} rows={3} maxLength={300} className={`${fieldClass} h-auto py-3`} />
            ) : (
              <input
                name={f.name}
                type={f.type ?? "text"}
                defaultValue={f.defaultValue}
                required={f.required}
                placeholder={f.placeholder}
                min={f.min}
                max={f.max}
                step={f.type === "number" ? "any" : undefined}
                autoFocus={i === 0}
                className={fieldClass}
              />
            )}
          </Field>
        ))}
        {error && (
          <p role="alert" className="rounded-field bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {r.kind !== "alert" && (
            <Button variant="ghost" disabled={busy} onClick={() => close(r.kind === "prompt" ? null : false)}>
              Annuler
            </Button>
          )}
          <Button type="submit" variant={r.tone === "danger" ? "danger" : "primary"} disabled={busy} autoFocus={!r.fields?.length}>
            {busy ? "Un instant…" : (r.confirmLabel ?? (r.kind === "alert" ? "Compris" : "Confirmer"))}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

/** Panneau latéral des formulaires (édition d'un produit, d'un restaurant…) : même comportement que les boîtes. */
export function Drawer({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:w-auto"
    >
      <AnimatePresence>
        <motion.div
          initial={reduce ? false : { x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={clsx("flex h-full w-screen flex-col overflow-y-auto border-l border-border bg-surface text-ink shadow-float", wide ? "sm:w-[42rem]" : "sm:w-[34rem]")}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-6 py-4 backdrop-blur">
            <h2 className="min-w-0 truncate text-xl font-extrabold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-alt">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1">{children}</div>
        </motion.div>
      </AnimatePresence>
    </dialog>
  );
}
