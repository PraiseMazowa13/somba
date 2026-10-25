import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { ShoppingBag, Search, SlidersHorizontal, LayoutGrid, Store, ArrowUpRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zandu — Marketplace de confiance" },
      { name: "description", content: "La marketplace multi-vendeurs où acheter et vendre en toute sécurité." },
      { property: "og:title", content: "Zandu — Marketplace de confiance" },
      { property: "og:description", content: "La marketplace multi-vendeurs où acheter et vendre en toute sécurité." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const { data: products } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,title,price_cents,currency,images,shops(name,slug,logo_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);
      return (data ?? []) as unknown as ProductCardData[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name").limit(12);
      return data ?? [];
    },
  });

  const { data: shops } = useQuery({
    queryKey: ["home-shops"],
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,name,slug,logo_url").eq("status", "approved").limit(10);
      return data ?? [];
    },
  });

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/products", search: { q, category: undefined } as any });
  };

  return (
    <div className="container-zandu py-4 md:py-8 space-y-6">
      {/* Search */}
      <form onSubmit={go} className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-2xl bg-card border border-border px-4 h-12 shadow-[var(--shadow-soft)]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder="Que recherchez-vous ?" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <Link to="/products" aria-label="Filtres" className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center text-primary shadow-[var(--shadow-soft)]">
          <SlidersHorizontal className="h-5 w-5" />
        </Link>
      </form>

      {/* Category chips */}
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        <Link to="/products" className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-sm font-semibold">
          <LayoutGrid className="h-4 w-4" /> Tout
        </Link>
        {categories?.map((c) => (
          <Link key={c.id} to="/products" search={{ category: c.slug, q: undefined } as any}
            className="shrink-0 rounded-xl bg-card border border-border px-3.5 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors">
            {c.name}
          </Link>
        ))}
      </div>

      {/* Promo banner */}
      <section className="gradient-hero relative overflow-hidden rounded-3xl p-5 md:p-10 text-primary-foreground">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary-foreground/10" />
        <div className="absolute right-16 -bottom-16 h-40 w-40 rounded-full bg-primary-foreground/10" />
        <div className="relative max-w-md">
          <span className="inline-block rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-semibold">Offre limitée</span>
          <h1 className="mt-2 text-xl md:text-4xl font-extrabold leading-tight">Des milliers de produits de vendeurs vérifiés</h1>
          <p className="mt-1 text-sm opacity-80">Paiement sécurisé · Livraison suivie</p>
          <Link to="/products" className="mt-4 inline-flex items-center gap-2 rounded-full bg-promo text-promo-foreground px-4 py-2 text-sm font-bold shadow">
            <ShoppingBag className="h-4 w-4" /> Acheter <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Shops */}
      {shops && shops.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-2xl font-bold">Boutiques</h2>
            <Link to="/shops" className="text-sm font-semibold text-primary">Voir tout</Link>
          </div>
          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar">
            {shops.map((s) => (
              <Link key={s.id} to="/shops/$slug" params={{ slug: s.slug }} className="shrink-0 w-[72px] flex flex-col items-center gap-1.5">
                <div className="h-16 w-16 rounded-2xl bg-card border border-border overflow-hidden grid place-items-center shadow-[var(--shadow-soft)]">
                  {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" loading="lazy" /> : <Store className="h-6 w-6 text-muted-foreground" />}
                </div>
                <span className="text-[11px] font-medium text-center line-clamp-1 w-full">{s.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg md:text-2xl font-bold">Nouveautés</h2>
          <Link to="/products" className="text-sm font-semibold text-primary">Voir tout</Link>
        </div>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="card-zandu p-12 text-center text-muted-foreground">Aucun produit pour l'instant.</div>
        )}
      </section>

      <section className="card-zandu p-6 md:p-10 text-center">
        <h3 className="text-lg md:text-2xl font-bold">Vous avez quelque chose à vendre ?</h3>
        <p className="mt-2 text-sm text-muted-foreground">Ouvrez votre boutique gratuitement.</p>
        <Link to="/seller" className="mt-4 inline-flex rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">Ouvrir ma boutique</Link>
      </section>
    </div>
  );
}
