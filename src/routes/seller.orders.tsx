import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/money";

export const Route = createFileRoute("/seller/orders")({
  head: () => ({ meta: [{ title: "Commandes vendeur — Zandu" }, { name: "description", content: "Consultez les commandes reçues par votre boutique Zandu." }, { property: "og:title", content: "Commandes vendeur — Zandu" }, { property: "og:description", content: "Consultez les commandes reçues par votre boutique Zandu." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SellerOrders,
});

function SellerOrders() {
  const { user } = useAuth();
  const { data: shop } = useQuery({
    queryKey: ["my-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("shops").select("*").eq("owner_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["seller-orders", shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => {
      if (!shop) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("id,title,quantity,unit_price_cents,created_at,order_id,orders(status,currency,shipping_full_name,shipping_city,created_at)")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!shop) return <div className="card-zandu p-6">Créez d'abord votre boutique.</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Commandes reçues</h1>
      {!items || items.length === 0 ? (
        <div className="card-zandu p-12 text-center text-muted-foreground">Aucune commande pour l'instant.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="card-zandu p-4 flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-medium">{it.title} × {it.quantity}</div>
                <div className="text-xs text-muted-foreground">
                  Client : {it.orders?.shipping_full_name} · {it.orders?.shipping_city} · {new Date(it.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatPrice(it.unit_price_cents * it.quantity, it.orders?.currency ?? "CDF")}</div>
                <div className="text-xs text-muted-foreground">{it.orders?.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
