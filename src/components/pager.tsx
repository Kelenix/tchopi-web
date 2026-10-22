import { Button } from "./ui";

/** Taille d'une page de liste (commandes, transactions…). */
export const PAGE = 20;

/** Navigation entre pages d'une liste ; rien quand tout tient sur une page. */
export function Pager({ page, total, size = PAGE, onChange }: { page: number; total: number; size?: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-3 text-sm">
      <Button variant="outline" className="h-9 px-4" disabled={page === 0} onClick={() => onChange(page - 1)}>
        Précédentes
      </Button>
      <span className="tabular text-muted">
        Page {page + 1} / {pages}
      </span>
      <Button variant="outline" className="h-9 px-4" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>
        Suivantes
      </Button>
    </nav>
  );
}
