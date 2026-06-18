import { Link, useNavigate } from "@tanstack/react-router";
import { formatPrice } from "@/lib/money";
import { Package, ShoppingCart, ArrowRight } from "lucide-react";
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
  shops?: { name: string; slug: string } | null;
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
      className="card-zandu group relative overflow-hidden flex flex-col transition-all duration-300 ease-out hover:shadow-[var(--shadow-elevated)] hover:-translate-y-1"
    >
      <div className="relative aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <Package className="h-12 w-12 text-muted-foreground" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="text-sm font-medium line-clamp-2">{p.title}</div>
        {p.shops && <div className="text-xs text-muted-foreground">par {p.shops.name}</div>}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="font-semibold text-primary">{formatPrice(p.price_cents, p.currency)}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
        >
          <ShoppingCart className="h-4 w-4" />
          {adding ? "Ajout…" : "Ajouter au panier"}
        </button>
      </div>
    </Link>
  );
}
