import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/money";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Package, ShieldCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/products/$id")({
  head: () => ({ meta: [{ title: "Produit — Zandu" }] }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, shops(id,name,slug,description,logo_url)")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  async function addToCart() {
    if (!user) { toast.error("Connectez-vous pour ajouter au panier"); navigate({ to: "/login" }); return; }
    if (!p) return;
    setAdding(true);
    // ensure cart
    let { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
    if (!cart) {
      const inserted = await supabase.from("carts").insert({ user_id: user.id }).select("id").single();
      cart = inserted.data;
    }
    if (!cart) { setAdding(false); toast.error("Erreur panier"); return; }

    const { data: existing } = await supabase.from("cart_items").select("id,quantity").eq("cart_id", cart.id).eq("product_id", p.id).maybeSingle();
    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + qty }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ cart_id: cart.id, product_id: p.id, quantity: qty });
    }
    setAdding(false);
    toast.success("Ajouté au panier");
  }

  if (isLoading) return <div className="container-zandu py-16">Chargement…</div>;
  if (!p) return <div className="container-zandu py-16">Produit introuvable.</div>;

  const img = p.images?.[0];
  return (
    <div className="container-zandu py-10 grid md:grid-cols-2 gap-10">
      <div className="card-zandu aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {img ? <img src={img} alt={p.title} className="h-full w-full object-cover" /> : <Package className="h-24 w-24 text-muted-foreground" />}
      </div>
      <div>
        {p.shops && (
          <Link to="/shops/$slug" params={{ slug: p.shops.slug }} className="text-sm text-brand hover:underline">
            {p.shops.name}
          </Link>
        )}
        <h1 className="mt-2 text-3xl md:text-4xl font-bold">{p.title}</h1>
        <div className="mt-4 text-3xl font-bold text-primary">{formatPrice(p.price_cents, p.currency)}</div>
        <p className="mt-1 text-sm text-muted-foreground">{p.stock > 0 ? `${p.stock} en stock` : "Rupture de stock"}</p>

        <div className="mt-6 flex items-center gap-3">
          <input type="number" min={1} max={Math.max(1, p.stock)} value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(p.stock || 1, Number(e.target.value) || 1)))}
            className="w-20 rounded-md border border-input bg-surface px-3 py-2 text-sm" />
          <Button size="lg" onClick={addToCart} disabled={adding || p.stock <= 0}>
            {p.stock <= 0 ? "Indisponible" : adding ? "Ajout…" : "Ajouter au panier"}
          </Button>
        </div>

        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-brand" /> Achat sécurisé — protection acheteur
        </div>

        {p.description && (
          <div className="mt-8">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
