import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-lg text-on-primary">t</span>
      <span className="text-xl">tchopi</span>
    </Link>
  );
}