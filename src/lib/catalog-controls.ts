export type ProductFilter = "all" | "visible" | "hidden" | "stock" | "featured";
export type ProductSort = "recent" | "name" | "price-up" | "price-down" | "stock" | "featured";
type CatalogProduct = { title: string; category_id: string | null; currency: string; price_cents: number; stock: number; is_active: boolean; is_featured: boolean; status: string; created_at: string };
export function filterProducts<T extends CatalogProduct>(products: T[], q: string, filter: ProductFilter, category: string, currency: string, sort: ProductSort): T[] {
  const needle = q.trim().toLocaleLowerCase("fr");
  return products.filter(p => (!needle || p.title.toLocaleLowerCase("fr").includes(needle)) && (!category || p.category_id === category) && (!currency || p.currency === currency) &&
    (filter === "all" || (filter === "visible" && p.is_active && p.status === "active") || (filter === "hidden" && (!p.is_active || p.status !== "active")) || (filter === "stock" && p.stock <= 0) || (filter === "featured" && p.is_featured)))
    .sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title, "fr");
      if (sort === "stock") return a.stock - b.stock;
      if (sort === "featured") return Number(b.is_featured) - Number(a.is_featured) || b.created_at.localeCompare(a.created_at);
      if (sort === "price-up" || sort === "price-down") return a.currency.localeCompare(b.currency) || (sort === "price-up" ? a.price_cents - b.price_cents : b.price_cents - a.price_cents);
      return b.created_at.localeCompare(a.created_at);
    });
}
export function shopShareUrl(slug: string) {
  return `https://somba.lovable.app/shops/${encodeURIComponent(slug)}`;
}