import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/money";
import { Package } from "lucide-react";

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
      className="card-zandu group overflow-hidden flex flex-col transition hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5"
    >
      <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {img ? (
          <img src={img} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition" loading="lazy" />
        ) : (
          <Package className="h-12 w-12 text-muted-foreground" />
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="text-sm font-medium line-clamp-2">{p.title}</div>
        {p.shops && <div className="text-xs text-muted-foreground">par {p.shops.name}</div>}
        <div className="mt-auto pt-2 font-semibold text-primary">{formatPrice(p.price_cents, p.currency)}</div>
      </div>
    </Link>
  );
}
