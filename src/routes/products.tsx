import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

const search = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  shop: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  sort: z.enum(["recent", "price_asc", "price_desc"]).optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Produits — Zandu" }, { name: "description", content: "Recherchez et filtrez les produits de la marketplace Zandu." }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const sp = Route.useSearch();
  const navigate = useNavigate({ from: "/products" });

  // Local form state, synced with URL
  const [q, setQ] = useState(sp.q ?? "");
  const [minP, setMinP] = useState(sp.min ? String(sp.min) : "");
  const [maxP, setMaxP] = useState(sp.max ? String(sp.max) : "");
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    setQ(sp.q ?? "");
    setMinP(sp.min ? String(sp.min) : "");
    setMaxP(sp.max ? String(sp.max) : "");
  }, [sp.q, sp.min, sp.max]);

  const { data: cats } = useQuery({
    queryKey: ["all-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name,slug").order("name")).data ?? [],
  });

  const { data: shops } = useQuery({
    queryKey: ["approved-shops"],
    queryFn: async () => (await supabase.from("shops").select("id,name,slug").eq("status", "approved").order("name").limit(100)).data ?? [],
  });

  const cat = cats?.find((c) => c.slug === sp.category);
  const shop = shops?.find((s) => s.slug === sp.shop);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", sp.q, sp.category, sp.shop, sp.min, sp.max, sp.sort, cat?.id, shop?.id],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id,title,price_cents,currency,images,shops!inner(name,slug,logo_url,status)")
        .eq("status", "active")
        .eq("shops.status", "approved")
        .limit(60);

      if (cat?.id) query = query.eq("category_id", cat.id);
      if (shop?.id) query = query.eq("shop_id", shop.id);
      if (sp.q && sp.q.trim()) query = query.ilike("title", `%${sp.q.trim()}%`);
      if (sp.min !== undefined) query = query.gte("price_cents", Math.round(sp.min * 100));
      if (sp.max !== undefined) query = query.lte("price_cents", Math.round(sp.max * 100));

      const sort = sp.sort ?? "recent";
      if (sort === "price_asc") query = query.order("price_cents", { ascending: true });
      else if (sort === "price_desc") query = query.order("price_cents", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const { data } = await query;
      return (data ?? []) as unknown as ProductCardData[];
    },
  });

  function update(patch: Partial<z.infer<typeof search>>) {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) as any });
  }

  function applyPriceAndQuery(e?: React.FormEvent) {
    e?.preventDefault();
    update({
      q: q.trim() || undefined,
      min: minP ? Number(minP) : undefined,
      max: maxP ? Number(maxP) : undefined,
    });
    setOpenMobile(false);
  }

  function reset() {
    navigate({ search: {} as any });
    setQ(""); setMinP(""); setMaxP("");
  }

  const activeCount =
    (sp.q ? 1 : 0) + (sp.category ? 1 : 0) + (sp.shop ? 1 : 0) +
    (sp.min !== undefined ? 1 : 0) + (sp.max !== undefined ? 1 : 0) +
    (sp.sort && sp.sort !== "recent" ? 1 : 0);

  const Filters = (
    <form onSubmit={applyPriceAndQuery} className="card-zandu p-5 space-y-5">
      <div>
        <Label className="mb-1.5 block">Recherche</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom du produit…" maxLength={120} />
      </div>

      <div>
        <Label className="mb-1.5 block">Catégorie</Label>
        <select
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
          value={sp.category ?? ""}
          onChange={(e) => update({ category: e.target.value || undefined })}
        >
          <option value="">Toutes les catégories</option>
          {cats?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <Label className="mb-1.5 block">Boutique</Label>
        <select
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
          value={sp.shop ?? ""}
          onChange={(e) => update({ shop: e.target.value || undefined })}
        >
          <option value="">Toutes les boutiques</option>
          {shops?.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <Label className="mb-1.5 block">Prix (XOF)</Label>
        <div className="flex items-center gap-2">
          <Input type="number" min="0" placeholder="Min" value={minP} onChange={(e) => setMinP(e.target.value)} />
          <span className="text-muted-foreground">—</span>
          <Input type="number" min="0" placeholder="Max" value={maxP} onChange={(e) => setMaxP(e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block">Trier par</Label>
        <select
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
          value={sp.sort ?? "recent"}
          onChange={(e) => update({ sort: e.target.value as any })}
        >
          <option value="recent">Plus récents</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">Appliquer</Button>
        {activeCount > 0 && <Button type="button" variant="outline" onClick={reset}>Effacer</Button>}
      </div>
    </form>
  );

  return (
    <div className="container-zandu py-10 grid lg:grid-cols-[280px,1fr] gap-8">
      {/* Desktop filters */}
      <aside className="hidden lg:block sticky top-20 self-start">{Filters}</aside>

      <div>
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {cat ? cat.name : sp.q ? `« ${sp.q} »` : "Tous les produits"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isLoading ? "Chargement…" : `${products?.length ?? 0} résultat(s)`}
              {activeCount > 0 && ` · ${activeCount} filtre(s) actif(s)`}
            </p>
          </div>
          <Button variant="outline" className="lg:hidden" onClick={() => setOpenMobile(true)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />Filtres
          </Button>
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : !isLoading ? (
          <div className="card-zandu p-12 text-center text-muted-foreground">
            Aucun produit ne correspond à vos critères.
            {activeCount > 0 && <div className="mt-3"><Button variant="outline" size="sm" onClick={reset}>Réinitialiser les filtres</Button></div>}
          </div>
        ) : null}
      </div>

      {/* Mobile filters drawer */}
      {openMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpenMobile(false)} />
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-background p-4 overflow-auto shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Filtres</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpenMobile(false)}><X className="h-4 w-4" /></Button>
            </div>
            {Filters}
          </div>
        </div>
      )}
    </div>
  );
}
