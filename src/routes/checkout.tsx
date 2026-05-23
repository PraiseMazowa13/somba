import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/money";
import { toast } from "sonner";
import { useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Commander — Zandu" }] }),
  component: CheckoutPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(60),
});

function CheckoutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", line1: "", line2: "", city: "", country: "Côte d'Ivoire" });
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ["checkout-cart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user!.id).maybeSingle();
      if (!cart) return { items: [] as any[] };
      const { data: items } = await supabase.from("cart_items").select("quantity,products(id,title,price_cents,currency,stock,shop_id)").eq("cart_id", cart.id);
      return { items: items ?? [], cart_id: cart.id };
    },
  });

  if (!user) return (
    <div className="container-zandu py-16 text-center">
      <Button asChild><Link to="/login">Se connecter pour commander</Link></Button>
    </div>
  );

  const items = data?.items ?? [];
  const total = items.reduce((s: number, it: any) => s + (it.products?.price_cents ?? 0) * it.quantity, 0);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (items.length === 0) { toast.error("Panier vide"); return; }
    setSubmitting(true);
    const { data: order, error } = await supabase.from("orders").insert({
      buyer_id: user!.id,
      total_cents: total,
      currency: items[0]?.products?.currency ?? "XOF",
      shipping_full_name: parsed.data.full_name,
      shipping_phone: parsed.data.phone,
      shipping_line1: parsed.data.line1,
      shipping_line2: parsed.data.line2 || null,
      shipping_city: parsed.data.city,
      shipping_country: parsed.data.country,
    }).select("id").single();
    if (error || !order) { setSubmitting(false); toast.error(error?.message ?? "Erreur"); return; }

    const rows = items.map((it: any) => ({
      order_id: order.id,
      product_id: it.products.id,
      shop_id: it.products.shop_id,
      title: it.products.title,
      unit_price_cents: it.products.price_cents,
      quantity: it.quantity,
    }));
    const { error: e2 } = await supabase.from("order_items").insert(rows);
    if (e2) { setSubmitting(false); toast.error(e2.message); return; }

    // empty cart
    if (data?.cart_id) await supabase.from("cart_items").delete().eq("cart_id", data.cart_id);
    setSubmitting(false);
    toast.success("Commande enregistrée ! En attente de paiement.");
    navigate({ to: "/account" });
  }

  return (
    <div className="container-zandu py-10 grid lg:grid-cols-[1fr,360px] gap-8">
      <form onSubmit={placeOrder} className="card-zandu p-6 space-y-4">
        <h1 className="text-2xl font-bold">Adresse de livraison</h1>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={100} /></div>
          <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={30} /></div>
        </div>
        <div><Label>Adresse</Label><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required maxLength={200} /></div>
        <div><Label>Complément (optionnel)</Label><Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} maxLength={200} /></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required maxLength={100} /></div>
          <div><Label>Pays</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required maxLength={60} /></div>
        </div>
        <Button size="lg" className="w-full" disabled={submitting}>{submitting ? "Validation…" : "Valider la commande"}</Button>
        <p className="text-xs text-muted-foreground text-center">Le paiement en ligne sera disponible prochainement. Votre commande sera enregistrée et le vendeur vous contactera.</p>
      </form>

      <div className="card-zandu p-6 h-fit">
        <h3 className="font-semibold mb-4">Récapitulatif</h3>
        <div className="space-y-2 text-sm mb-4 max-h-60 overflow-auto">
          {items.map((it: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span className="truncate pr-2">{it.products?.title} × {it.quantity}</span>
              <span>{formatPrice((it.products?.price_cents ?? 0) * it.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-bold text-lg border-t border-border pt-4"><span>Total</span><span>{formatPrice(total)}</span></div>
      </div>
    </div>
  );
}
