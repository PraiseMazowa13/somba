import { Link, useNavigate } from "@tanstack/react-router";
import { formatPrice } from "@/lib/money";
import { Package, Plus, Store } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export type ProductCardData = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  images: string[] | null;
  shops?: { name: string; slug: string; logo_url?: string | null } | null;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const img = p.images?.[0];
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Connectez-vous pour ajouter au panier");
      navigate({ to: "/login" });
      return;
    }
    setAdding(true);
    try {
      await addToCart(user.id, p.id, 1);
      toast.success("Ajouté au panier");
      qc.invalidateQueries({ queryKey: ["cart"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'ajout");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link
      to="/products/$id"
      params={{ id: p.id }}
      className="card-zandu group relative overflow-hidden flex flex-col transition-all duration-300 ease-out hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5"
    >
      <div className="relative aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground" />
        )}

        {/* Floating + button */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          aria-label="Ajouter au panier"
          className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-md grid place-items-center transition-all hover:scale-110 active:scale-95 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="p-2 flex-1 flex flex-col gap-0.5">
        <div className="text-xs font-medium line-clamp-2 leading-tight">{p.title}</div>
        {p.shops && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
            {p.shops.logo_url ? (
              <img src={p.shops.logo_url} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
            ) : (
              <Store className="h-3 w-3" />
            )}
            <span className="truncate">{p.shops.name}</span>
          </div>
        )}
        <div className="mt-1 font-semibold text-primary text-sm">{formatPrice(p.price_cents, p.currency)}</div>
      </div>
    </Link>
  );
}
