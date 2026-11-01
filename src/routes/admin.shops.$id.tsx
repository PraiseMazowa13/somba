import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShopShareButton } from "@/components/ShopShareButton";
import { pageMeta } from "@/lib/page-meta";
import { sellerStats } from "@/lib/seller-stats";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store, Package, ShoppingBag, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shops/$id")({
  head: () => pageMeta("Gestion boutique — Zandu", "Modifiez les informations, la visibilité et la mise en vedette de cette boutique Zandu."),
  component: AdminShopDetail,
});

function AdminShopDetail() {
  const { id } = Route.useParams();
  const { roles, loading } = useAuth();
  const qc = useQueryClient();

  const { data: shop, isLoading, error: shopError, refetch } = useQuery({
    queryKey: ["admin-shop", id],
    enabled: roles.includes("admin"),
    queryFn: async () => { const { data, error } = await supabase.from("shops").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data; },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-shop-stats", id],
    enabled: roles.includes("admin") && !!shop,
    queryFn: async () => {
      const [products, items] = await Promise.all([
        supabase.from("products").select("*").eq("shop_id", id),
        supabase.from("order_items").select("*,orders(status,currency,shipping_full_name,shipping_city,created_at)").eq("shop_id", id),
      ]);
      if (products.error) throw products.error;
      if (items.error) throw items.error;
      return sellerStats(products.data ?? [], items.data ?? []);
    },
  });

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", whatsapp_number: "", logo_url: "", banner_url: "" });
  useEffect(() => { if (shop) setForm({ name: shop.name, description: shop.description ?? "", whatsapp_number: shop.whatsapp_number ?? "", logo_url: shop.logo_url ?? "", banner_url: shop.banner_url ?? "" }); }, [shop]);
  async function update(values: { status?: "approved" | "pending" | "suspended"; is_featured?: boolean; deletion_requested_at?: null; deletion_reason?: null; name?: string; description?: string; whatsapp_number?: string; logo_url?: string; banner_url?: string }) {
    setBusy(true);
    const { error } = await supabase.from("shops").update(values).eq("id", id).select("id").single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Boutique mise à jour");
    await Promise.all([qc.invalidateQueries({ queryKey: ["admin-shop", id] }), qc.invalidateQueries({ queryKey: ["admin-shops"] }), qc.invalidateQueries({ queryKey: ["shops-approved"] }), qc.invalidateQueries({ queryKey: ["home-shops"] }), qc.invalidateQueries({ queryKey: ["shop"] })]);
  }
  if (loading || isLoading) return <div className="container-zandu py-16">Chargement…</div>;
  if (!roles.includes("admin")) return <div className="container-zandu py-16 text-center"><h1 className="text-2xl font-bold">Accès réservé</h1></div>;
  if (shopError) return <div role="alert" className="container-zandu py-16"><p>Impossible de charger la boutique.</p><Button onClick={() => refetch()}>Réessayer</Button></div>;
  if (!shop) return <div className="container-zandu py-16">Boutique introuvable.</div>;


  return (
    <div className="container-zandu py-10 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour à l'admin
      </Link>

      <div className="flex flex-wrap items-center gap-5">
        <div className="h-20 w-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
          {shop.logo_url ? <img src={shop.logo_url} className="h-full w-full object-cover" /> : <Store className="h-8 w-8 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          <div className="text-sm text-muted-foreground">/{shop.slug} · Créée le {new Date(shop.created_at).toLocaleDateString("fr-FR")}</div>
          {shop.description && <p className="text-sm mt-2">{shop.description}</p>}
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full ${
          shop.status === "approved" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
          shop.status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
          "bg-red-500/10 text-red-700 dark:text-red-400"
        }`}>{shop.status}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-zandu p-5 flex items-center gap-4">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <div className="text-2xl font-bold">{stats?.productCount ?? "…"}</div>
            <div className="text-sm text-muted-foreground">Produits</div>
          </div>
        </div>
        <div className="card-zandu p-5 flex items-center gap-4">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <div>
            <div className="text-2xl font-bold">{stats?.orderCount ?? "…"}</div>
            <div className="text-sm text-muted-foreground">Commandes</div>
          </div>
        </div>
        <div className="card-zandu p-5 flex items-center gap-4">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <div className="text-2xl font-bold">{stats ? stats.totals.map(t => formatPrice(t.cents, t.currency)).join(" · ") || "0" : "…"}</div>
            <div className="text-sm text-muted-foreground">Chiffre d'affaires</div>
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="card-zandu p-6 space-y-2 text-sm">
        <h2 className="font-semibold text-base mb-3">Informations</h2>
        <div><span className="text-muted-foreground">WhatsApp :</span> {(shop as any).whatsapp_number || <span className="italic text-muted-foreground">non renseigné</span>}</div>
        <div><span className="text-muted-foreground">Bannière :</span> {shop.banner_url ? "✓" : "—"}</div>
        <div><span className="text-muted-foreground">Zones de livraison :</span> {Array.isArray(shop.delivery_zones) ? shop.delivery_zones.length : 0}</div>
        {shop.deletion_requested_at && (
          <div className="text-destructive mt-2">
            ⚠️ Suppression demandée {shop.deletion_reason && `— motif : ${shop.deletion_reason}`}
          </div>
        )}
      </div>

      <form className="space-y-4 border-t border-border pt-6" onSubmit={e => { e.preventDefault(); if (form.name.trim().length < 2) { toast.error("Nom trop court"); return; } void update({ ...form, name: form.name.trim() }); }}>
        <h2 className="font-semibold">Paramètres de la boutique</h2>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="shop-name">Nom</Label><Input id="shop-name" value={form.name} maxLength={80} required onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label htmlFor="shop-whatsapp">WhatsApp</Label><Input id="shop-whatsapp" value={form.whatsapp_number} onChange={e => setForm({ ...form, whatsapp_number: e.target.value })} /></div><div><Label htmlFor="shop-logo">Adresse du logo</Label><Input id="shop-logo" type="url" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} /></div><div><Label htmlFor="shop-banner">Adresse de la bannière</Label><Input id="shop-banner" type="url" value={form.banner_url} onChange={e => setForm({ ...form, banner_url: e.target.value })} /></div></div>
        <div><Label htmlFor="shop-description">Description</Label><Textarea id="shop-description" maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <Button disabled={busy}>Enregistrer</Button>
      </form>
      {/* Actions */}
      <div className="card-zandu p-6">
        <h2 className="font-semibold mb-3">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || shop.status === "approved"} onClick={() => update({ status: "approved" })} variant={shop.status === "approved" ? "secondary" : "default"}>Approuver</Button>
          <Button disabled={busy || shop.status === "pending"} onClick={() => update({ status: "pending" })} variant="outline">Mettre en attente</Button>
          <Button disabled={busy || shop.status === "suspended"} onClick={() => update({ status: "suspended" })} variant="destructive">Suspendre</Button>
          <Button disabled={busy} variant="outline" onClick={() => update({ is_featured: !shop.is_featured })}>{shop.is_featured ? "Retirer de la vedette" : "Mettre en vedette"}</Button>
          <ShopShareButton slug={shop.slug} name={shop.name} />
          {shop.deletion_requested_at && <Button disabled={busy} variant="outline" onClick={() => update({ deletion_requested_at: null, deletion_reason: null })}>Refuser la suppression</Button>}
          <Button asChild variant="outline"><Link to="/shops/$slug" params={{ slug: shop.slug }}>Voir la boutique publique</Link></Button>
        </div>
      </div>
    </div>
  );
}
