import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Store } from "lucide-react";

export const Route = createFileRoute("/shops/$slug")({
  head: () => ({ meta: [{ title: "Boutique — Zandu" }] }),
  component: ShopPage,
});

function ShopPage() {
  const { slug } = Route.useParams();
  const { data: shop } = useQuery({
    queryKey: ["shop", slug],
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
      return data;
    },
  });
  const { data: products } = useQuery({
    queryKey: ["shop-products", shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,title,price_cents,currency,images").eq("shop_id", shop!.id).eq("status", "active").order("created_at", { ascending: false });
      return (data ?? []) as unknown as ProductCardData[];
    },
  });

  if (!shop) return <div className="container-zandu py-16">Boutique introuvable.</div>;

  return (
    <div>
      <div className="gradient-hero text-white">
        <div className="container-zandu py-14 flex items-center gap-5">
          <div className="h-20 w-20 rounded-xl bg-white/15 flex items-center justify-center overflow-hidden">
            {shop.logo_url ? <img src={shop.logo_url} className="h-full w-full object-cover" alt={shop.name} /> : <Store className="h-8 w-8" />}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{shop.name}</h1>
            {shop.description && <p className="text-white/80 mt-2 max-w-2xl">{shop.description}</p>}
          </div>
        </div>
      </div>
      <div className="container-zandu py-10">
        <h2 className="text-xl font-semibold mb-6">Produits</h2>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : <div className="card-zandu p-12 text-center text-muted-foreground">Pas encore de produit.</div>}
      </div>
    </div>
  );
}
