import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Primitives d'interface communes (jetons du design system). */

const buttonStyles = {
  primary: "bg-primary text-on-primary hover:brightness-110",
  ink: "bg-ink text-on-ink hover:opacity-90",
  soft: "bg-surface-alt text-ink hover:bg-border",
  outline: "border border-border bg-surface text-ink hover:bg-surface-alt",
  danger: "bg-danger text-white hover:brightness-110",
  ghost: "text-muted hover:bg-surface-alt hover:text-ink",
};
type Variant = keyof typeof buttonStyles;

const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={clsx(base, buttonStyles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={clsx(base, buttonStyles[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-card border border-border bg-surface", className)} {...props} />;
}

const badgeStyles = {
  success: "bg-primary-soft text-primary",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-alt text-muted",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeStyles; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-xs font-semibold", badgeStyles[tone])}>
      {children}
    </span>
  );
}

export const fieldClass =
  "h-11 w-full rounded-field border border-border bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs font-medium text-danger">{error}</span>
      ) : (
        hint && <span className="block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

export function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-4xl leading-[1.05] sm:text-[3.4rem]">{title}</h2>
      {body && <p className="mt-3 text-muted">{body}</p>}
    </div>
  );
}
