import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { z } from "zod";

const search = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Produits — Zandu" }, { name: "description", content: "Découvrez tous les produits de la marketplace Zandu." }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { category, q } = Route.useSearch();

  const { data: cat } = useQuery({
    queryKey: ["cat", category],
    enabled: !!category,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug").eq("slug", category!).maybeSingle();
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", category, q, cat?.id],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id,title,price_cents,currency,images,shops!inner(name,slug,status)")
        .eq("status", "active")
        .eq("shops.status", "approved")
        .order("created_at", { ascending: false })
        .limit(60);
      if (cat?.id) query = query.eq("category_id", cat.id);
      if (q && q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      const { data } = await query;
      return (data ?? []) as unknown as ProductCardData[];
    },
  });

  return (
    <div className="container-zandu py-10">
      <h1 className="text-3xl font-bold">
        {cat ? cat.name : q ? `Recherche : "${q}"` : "Tous les produits"}
      </h1>
      <p className="text-muted-foreground mt-2">{products?.length ?? 0} produit(s)</p>

      <div className="mt-8">
        {isLoading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="card-zandu p-12 text-center text-muted-foreground">Aucun produit trouvé.</div>
        )}
      </div>
    </div>
  );
}
