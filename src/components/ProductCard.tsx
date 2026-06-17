import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/money";
import { Package, Eye, ArrowRight } from "lucide-react";

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
        {/* Overlay CTA */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
          <div className="flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg">
            <Eye className="h-4 w-4" />
            Voir le produit
          </div>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="text-sm font-medium line-clamp-2">{p.title}</div>
        {p.shops && <div className="text-xs text-muted-foreground">par {p.shops.name}</div>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-semibold text-primary">{formatPrice(p.price_cents, p.currency)}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </div>
    </Link>
  );
}
