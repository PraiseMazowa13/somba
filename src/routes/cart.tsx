import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/money";
import { Trash2, Package } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Panier — Zandu" }] }),
  component: CartPage,
});

function CartPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user!.id).maybeSingle();
      if (!cart) return { items: [] as any[] };
      const { data: items } = await supabase
        .from("cart_items")
        .select("id,quantity,products(id,title,price_cents,currency,images,stock,shops(id,name,slug))")
        .eq("cart_id", cart.id);
      return { items: items ?? [] };
    },
  });

  if (loading) return <div className="container-zandu py-16">Chargement…</div>;
  if (!user) return (
    <div className="container-zandu py-16 text-center">
      <h1 className="text-2xl font-bold mb-4">Votre panier</h1>
      <p className="text-muted-foreground mb-6">Connectez-vous pour voir votre panier.</p>
      <Button asChild><Link to="/login">Se connecter</Link></Button>
    </div>
  );

  const items = data?.items ?? [];
  const total = items.reduce((sum: number, it: any) => sum + (it.products?.price_cents ?? 0) * it.quantity, 0);

  async function setQty(id: string, q: number) {
    if (q <= 0) { await supabase.from("cart_items").delete().eq("id", id); }
    else { await supabase.from("cart_items").update({ quantity: q }).eq("id", id); }
    qc.invalidateQueries({ queryKey: ["cart"] });
  }

  return (
    <div className="container-zandu py-10">
      <h1 className="text-3xl font-bold mb-8">Mon panier</h1>
      {isLoading ? <div>Chargement…</div> : items.length === 0 ? (
        <div className="card-zandu p-12 text-center">
          <p className="text-muted-foreground mb-4">Votre panier est vide.</p>
          <Button asChild><Link to="/products">Voir les produits</Link></Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr,360px] gap-8">
          <div className="space-y-3">
            {items.map((it: any) => (
              <div key={it.id} className="card-zandu p-4 flex gap-4">
                <div className="h-20 w-20 bg-secondary rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                  {it.products?.images?.[0] ? <img src={it.products.images[0]} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{it.products?.title}</div>
                  <div className="text-xs text-muted-foreground">par {it.products?.shops?.name}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="number" min={1} value={it.quantity}
                      onChange={(e) => setQty(it.id, Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 rounded-md border border-input bg-surface px-2 py-1 text-sm" />
                    <Button variant="ghost" size="sm" onClick={() => setQty(it.id, 0)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="font-semibold text-right">{formatPrice((it.products?.price_cents ?? 0) * it.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="card-zandu p-6 h-fit">
            <h3 className="font-semibold mb-4">Récapitulatif</h3>
            <div className="flex justify-between text-sm mb-2"><span>Sous-total</span><span>{formatPrice(total)}</span></div>
            <div className="flex justify-between text-sm mb-4 text-muted-foreground"><span>Livraison</span><span>Calculée à l'étape suivante</span></div>
            <div className="flex justify-between font-bold text-lg border-t border-border pt-4"><span>Total</span><span>{formatPrice(total)}</span></div>
            <Button className="w-full mt-6" size="lg" onClick={() => navigate({ to: "/checkout" })}>Passer la commande</Button>
          </div>
        </div>
      )}
    </div>
  );
}
