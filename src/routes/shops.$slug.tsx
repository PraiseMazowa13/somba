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
      const { data } = await supabase
        .from("products")
        .select("id,title,price_cents,currency,images")
        .eq("shop_id", shop!.id)
        .eq("status", "active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ProductCardData[];
    },
  });

  if (!shop) return <div className="container-zandu py-16">Boutique introuvable.</div>;

  return (
    <div>
      {/* Bannière */}
      <div className="relative h-48 md:h-64 bg-secondary overflow-hidden">
        {shop.banner_url ? (
          <img src={shop.banner_url} alt={`${shop.name} bannière`} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="container-zandu -mt-16 relative z-10">
        <div className="card-zandu p-6 flex flex-col md:flex-row md:items-center gap-5">
          <div className="h-24 w-24 rounded-xl bg-secondary border-4 border-background flex items-center justify-center overflow-hidden flex-shrink-0">
            {shop.logo_url ? <img src={shop.logo_url} className="h-full w-full object-cover" alt={shop.name} /> : <Store className="h-10 w-10 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">{shop.name}</h1>
            {shop.description && <p className="text-muted-foreground mt-2">{shop.description}</p>}
          </div>
        </div>
      </div>

      <div className="container-zandu py-10">
        <h2 className="text-xl font-semibold mb-6">Produits</h2>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={{ ...p, shops: { name: shop.name, slug: shop.slug } }} />)}
          </div>
        ) : <div className="card-zandu p-12 text-center text-muted-foreground">Pas encore de produit.</div>}
      </div>
    </div>
  );
}
