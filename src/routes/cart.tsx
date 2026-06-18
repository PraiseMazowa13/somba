import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/money";
import { Trash2, Package, MessageCircle } from "lucide-react";
import { useState } from "react";
import { buildWhatsAppMessage, normalizeWhatsApp } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Panier — Zandu" }] }),
  component: CartPage,
});

function CartPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user!.id).maybeSingle();
      if (!cart) return { items: [] as any[], cart_id: null as string | null };
      const { data: items } = await supabase
        .from("cart_items")
        .select("id,quantity,products(id,title,price_cents,currency,images,stock,shops(id,name,slug,whatsapp_number))")
        .eq("cart_id", cart.id);
      return { items: items ?? [], cart_id: cart.id };
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

  // Grouper par boutique
  const byShop = new Map<string, { shop: any; items: any[] }>();
  for (const it of items) {
    const shop = it.products?.shops;
    if (!shop) continue;
    if (!byShop.has(shop.id)) byShop.set(shop.id, { shop, items: [] });
    byShop.get(shop.id)!.items.push(it);
  }

  async function setQty(id: string, q: number) {
    if (q <= 0) { await supabase.from("cart_items").delete().eq("id", id); }
    else { await supabase.from("cart_items").update({ quantity: q }).eq("id", id); }
    qc.invalidateQueries({ queryKey: ["cart"] });
  }

  async function sendWhatsApp() {
    if (!customerName.trim() || !customerCity.trim()) {
      toast.error("Renseignez votre nom et votre ville");
      return;
    }
    const groups = Array.from(byShop.values());
    const missing = groups.filter((g) => !normalizeWhatsApp(g.shop.whatsapp_number));
    if (missing.length > 0) {
      toast.error(`Numéro WhatsApp manquant pour : ${missing.map((m) => m.shop.name).join(", ")}`);
      return;
    }

    setSending(true);
    try {
      // Créer une commande par boutique (statut pending_whatsapp)
      for (const g of groups) {
        const orderTotal = g.items.reduce((s, it) => s + (it.products?.price_cents ?? 0) * it.quantity, 0);
        const currency = g.items[0]?.products?.currency ?? "CDF";
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            buyer_id: user!.id,
            shop_id: g.shop.id,
            total_cents: orderTotal,
            currency,
            status: "pending",
            channel: "whatsapp",
          })
          .select("id")
          .single();
        if (orderErr) {
          console.error(orderErr);
          continue;
        }
        // Insérer les items
        await supabase.from("order_items").insert(
          g.items.map((it) => ({
            order_id: order!.id,
            product_id: it.products.id,
            quantity: it.quantity,
            unit_price_cents: it.products.price_cents,
            currency: it.products.currency,
          }))
        );

        // Ouvrir WhatsApp
        const phone = normalizeWhatsApp(g.shop.whatsapp_number)!;
        const msg = buildWhatsAppMessage({
          shopName: g.shop.name,
          items: g.items.map((it) => ({
            title: it.products.title,
            quantity: it.quantity,
            price_cents: it.products.price_cents,
            currency: it.products.currency,
          })),
          customerName: customerName.trim(),
          customerCity: customerCity.trim(),
        });
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
      }

      // Vider le panier
      if (data?.cart_id) {
        await supabase.from("cart_items").delete().eq("cart_id", data.cart_id);
      }
      toast.success("Commandes envoyées via WhatsApp");
      qc.invalidateQueries({ queryKey: ["cart"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setSending(false);
    }
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
        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
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
                <div className="font-semibold text-right">{formatPrice((it.products?.price_cents ?? 0) * it.quantity, it.products?.currency)}</div>
              </div>
            ))}
          </div>
          <div className="card-zandu p-6 h-fit space-y-4">
            <h3 className="font-semibold">Récapitulatif</h3>
            <div className="flex justify-between text-sm"><span>Sous-total</span><span>{formatPrice(total)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t border-border pt-3"><span>Total</span><span>{formatPrice(total)}</span></div>

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium">Finaliser via WhatsApp</p>
              <p className="text-xs text-muted-foreground">Vous discuterez directement avec {byShop.size > 1 ? "chaque vendeur" : "le vendeur"} pour la livraison et le paiement (Mobile Money, cash).</p>
              <div>
                <Label className="text-xs">Votre nom</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nom complet" maxLength={80} />
              </div>
              <div>
                <Label className="text-xs">Votre ville</Label>
                <Input value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} placeholder="Kinshasa, Lubumbashi…" maxLength={60} />
              </div>
              <Button
                className="w-full bg-[#25D366] hover:bg-[#1ebe5b] text-white"
                size="lg"
                onClick={sendWhatsApp}
                disabled={sending}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                {sending ? "Envoi…" : `Commander via WhatsApp${byShop.size > 1 ? ` (${byShop.size} boutiques)` : ""}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
