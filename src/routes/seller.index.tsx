import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { slugify, formatPrice } from "@/lib/money";
import { Package, ShoppingBag, DollarSign, Eye, Share2, Settings, Store, TrendingUp, AlertTriangle, Plus, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/seller/")({
  component: SellerShop,
});

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  description: z.string().trim().max(1000).optional(),
});

function SellerShop() {
  const { user, refreshRoles } = useAuth();
  const qc = useQueryClient();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["my-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("*").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({ name: "", description: "", logo_url: "", banner_url: "", whatsapp_number: "" });
  const [saving, setSaving] = useState(false);
  const [zoneCity, setZoneCity] = useState("");
  const [zonePrice, setZonePrice] = useState("");
  const [zoneCurrency, setZoneCurrency] = useState<"CDF" | "USD">("CDF");

  type DeliveryZone = { city: string; price_cents: number; currency: string };
  const zones: DeliveryZone[] = Array.isArray(shop?.delivery_zones) ? (shop?.delivery_zones as unknown as DeliveryZone[]) : [];

  useEffect(() => {
    if (shop) setForm({ name: shop.name, description: shop.description ?? "", logo_url: shop.logo_url ?? "", banner_url: shop.banner_url ?? "", whatsapp_number: (shop as any).whatsapp_number ?? "" });
  }, [shop]);

  async function saveZones(next: DeliveryZone[]) {
    if (!shop) return;
    const { error } = await supabase.from("shops").update({ delivery_zones: next as any }).eq("id", shop.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  async function addZone() {
    const city = zoneCity.trim();
    const price = Number(zonePrice);
    if (!city || !Number.isFinite(price) || price < 0) { toast.error("Ville et prix valides requis"); return; }
    const next = [...zones, { city, price_cents: Math.round(price * 100), currency: zoneCurrency }];
    await saveZones(next);
    setZoneCity(""); setZonePrice("");
    toast.success("Zone de livraison ajoutée");
  }

  async function removeZone(idx: number) {
    const next = zones.filter((_, i) => i !== idx);
    await saveZones(next);
    toast.success("Zone supprimée");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    if (shop) {
      const { error } = await supabase.from("shops").update({ name: parsed.data.name, description: parsed.data.description, logo_url: form.logo_url || null, banner_url: form.banner_url || null, whatsapp_number: form.whatsapp_number || null } as any).eq("id", shop.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
      toast.success("Boutique mise à jour");
    } else {
      const slug = `${slugify(parsed.data.name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("shops").insert({ owner_id: user!.id, name: parsed.data.name, slug, description: parsed.data.description, logo_url: form.logo_url || null, whatsapp_number: form.whatsapp_number || null } as any);
      if (error) { setSaving(false); toast.error(error.message); return; }
      // grant seller role
      await supabase.from("user_roles").insert({ user_id: user!.id, role: "seller" });
      await refreshRoles();
      toast.success("Boutique créée ! En attente d'approbation.");
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  async function uploadImage(field: "logo_url" | "banner_url", file: File) {
    const path = `${user!.id}/${field}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("shop-assets").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("shop-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, [field]: data.publicUrl }));
  }

  async function changeStatus(status: "suspended" | "pending") {
    if (!shop) return;
    const { error } = await supabase.from("shops").update({ status }).eq("id", shop.id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "suspended" ? "Boutique suspendue" : "Réactivation demandée");
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  async function requestDeletion() {
    if (!shop) return;
    const reason = window.prompt("Motif de la suppression (optionnel) :") ?? "";
    if (!window.confirm("Confirmer la demande de suppression ? Un administrateur devra la valider.")) return;
    const { error } = await supabase.from("shops").update({ deletion_requested_at: new Date().toISOString(), deletion_reason: reason || null }).eq("id", shop.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande envoyée à l'administrateur");
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  async function cancelDeletion() {
    if (!shop) return;
    const { error } = await supabase.from("shops").update({ deletion_requested_at: null, deletion_reason: null }).eq("id", shop.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande annulée");
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  if (isLoading) return <div>Chargement…</div>;

  const statusLabel = shop?.status === "approved" ? "Approuvée" : shop?.status === "pending" ? "En attente" : "Suspendue";
  const statusTone = shop?.status === "approved" ? "bg-primary/10 text-primary" : shop?.status === "pending" ? "bg-secondary text-foreground" : "bg-destructive/10 text-destructive";

  const settingsForm = (
    <form onSubmit={save} className="space-y-4">
      <div><Label>Nom de la boutique</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} /></div>
      <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={4} /></div>
      <div>
        <Label>Numéro WhatsApp</Label>
        <Input type="tel" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="ex : 243812345678" maxLength={20} />
        <p className="text-xs text-muted-foreground mt-1">Format international, sans le +.</p>
      </div>
      <div>
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {form.logo_url && <img src={form.logo_url} alt="logo" className="h-14 w-14 rounded-md object-cover border border-border" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage("logo_url", e.target.files[0])} />
        </div>
      </div>
      <div>
        <Label>Bannière</Label>
        <div className="space-y-2">
          {form.banner_url && <img src={form.banner_url} alt="bannière" className="h-24 w-full rounded-md object-cover border border-border" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage("banner_url", e.target.files[0])} />
        </div>
      </div>
      <Button disabled={saving} className="w-full">{saving ? "Enregistrement…" : shop ? "Enregistrer" : "Créer la boutique"}</Button>
    </form>
  );

  if (!shop) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Créer ma boutique</h1>
        <p className="text-muted-foreground mb-6">Renseignez les informations de votre boutique pour commencer à vendre.</p>
        <div className="card-zandu p-6 max-w-2xl">{settingsForm}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête pro */}
      <div className="card-zandu overflow-hidden">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-primary to-primary/60 relative">
          {shop.banner_url && <img src={shop.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <div className="p-4 flex flex-wrap items-end gap-4 -mt-10 relative">
          <div className="h-16 w-16 rounded-xl border-4 border-background bg-secondary overflow-hidden flex items-center justify-center">
            {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{shop.name}</h1>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${statusTone}`}>{statusLabel}</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2"><Settings className="h-4 w-4" /> Paramètres</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader><SheetTitle>Paramètres de la boutique</SheetTitle></SheetHeader>
              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="info">Infos</TabsTrigger>
                  <TabsTrigger value="delivery">Livraison</TabsTrigger>
                  <TabsTrigger value="manage">Gestion</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="mt-4">{settingsForm}</TabsContent>
                <TabsContent value="delivery" className="mt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">Villes livrées et tarifs (CDF ou USD).</p>
                  {zones.length > 0 && (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {zones.map((z, i) => (
                        <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span><span className="font-medium">{z.city}</span> — {(z.price_cents / 100).toLocaleString("fr-FR")} {z.currency}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeZone(i)}>Retirer</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="grid grid-cols-[1fr,100px,80px] gap-2">
                    <Input placeholder="Ville" value={zoneCity} onChange={(e) => setZoneCity(e.target.value)} maxLength={60} />
                    <Input type="number" min="0" placeholder="Prix" value={zonePrice} onChange={(e) => setZonePrice(e.target.value)} />
                    <select className="rounded-md border border-input bg-surface px-2 py-2 text-sm" value={zoneCurrency} onChange={(e) => setZoneCurrency(e.target.value as "CDF" | "USD")}>
                      <option value="CDF">CDF</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <Button type="button" className="w-full" onClick={addZone}>Ajouter la zone</Button>
                </TabsContent>
                <TabsContent value="manage" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">Suspendez temporairement votre boutique ou demandez sa suppression (validée par un administrateur).</p>
                  {shop.status === "approved" && <Button variant="outline" className="w-full" onClick={() => changeStatus("suspended")}>Suspendre ma boutique</Button>}
                  {shop.status === "suspended" && <Button variant="outline" className="w-full" onClick={() => changeStatus("pending")}>Demander la réactivation</Button>}
                  {shop.deletion_requested_at
                    ? <Button variant="outline" className="w-full" onClick={cancelDeletion}>Annuler la demande de suppression</Button>
                    : <Button variant="destructive" className="w-full" onClick={requestDeletion}>Demander la suppression</Button>}
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {shop.deletion_requested_at && (
        <div className="card-zandu p-4 border-destructive/40 bg-destructive/5">
          <div className="font-medium text-destructive">Demande de suppression en cours</div>
          <div className="text-sm text-muted-foreground mt-1">En attente de validation par un administrateur.</div>
        </div>
      )}

      <SellerDashboard shopId={shop.id} slug={shop.slug} />
    </div>
  );
}

function SellerDashboard({ shopId, slug }: { shopId: string; slug: string }) {
  const { data: stats } = useQuery({
    queryKey: ["seller-stats", shopId],
    queryFn: async () => {
      const [{ data: products }, { data: orderItems }] = await Promise.all([
        supabase.from("products").select("*").eq("shop_id", shopId),
        supabase.from("order_items").select("*").eq("shop_id", shopId),
      ]);
      const items = (orderItems ?? []) as any[];
      const prods = (products ?? []) as any[];
      const orderIds = new Set(items.map((o) => o.order_id));
      const revenue = items.reduce((s, oi) => s + oi.unit_price_cents * oi.quantity, 0);
      const sold: Record<string, number> = {};
      items.forEach((oi) => { sold[oi.product_id] = (sold[oi.product_id] ?? 0) + oi.quantity; });
      const top = [...prods].sort((a, b) => (sold[b.id] ?? 0) - (sold[a.id] ?? 0)).slice(0, 5).map((p) => ({ ...p, sold: sold[p.id] ?? 0 }));
      const active = prods.filter((p) => p.is_active !== false).length;
      const outOfStock = prods.filter((p) => typeof p.stock === "number" && p.stock <= 0).length;
      const recent = [...items].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))).slice(0, 5)
        .map((oi) => ({ ...oi, name: prods.find((p) => p.id === oi.product_id)?.name ?? "Produit" }));
      return { productCount: prods.length, active, outOfStock, orderCount: orderIds.size, revenue, avg: orderIds.size ? Math.round(revenue / orderIds.size) : 0, top, recent };
    },
  });

  async function share() {
    const url = `${window.location.origin}/shops/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title: "Ma boutique", url });
      else { await navigator.clipboard.writeText(url); toast.success("Lien copié"); }
    } catch { /* cancelled */ }
  }

  const cards = [
    { icon: DollarSign, label: "Chiffre d'affaires", value: stats ? formatPrice(stats.revenue) : "…" },
    { icon: ShoppingBag, label: "Commandes", value: stats?.orderCount ?? "…" },
    { icon: TrendingUp, label: "Panier moyen", value: stats ? formatPrice(stats.avg) : "…" },
    { icon: Package, label: "Produits actifs", value: stats ? `${stats.active}/${stats.productCount}` : "…" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card-zandu p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><c.icon className="h-4 w-4 text-primary" /></span>
            </div>
            <div className="text-xl font-bold leading-tight truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {stats && stats.outOfStock > 0 && (
        <div className="card-zandu p-3 flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" /> {stats.outOfStock} produit(s) en rupture de stock</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1"><Link to="/seller/products"><Plus className="h-5 w-5" /><span className="text-xs">Ajouter produit</span></Link></Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1"><Link to="/seller/orders"><ClipboardList className="h-5 w-5" /><span className="text-xs">Commandes</span></Link></Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1"><a href={`/shops/${slug}`} target="_blank" rel="noopener"><Eye className="h-5 w-5" /><span className="text-xs">Voir boutique</span></a></Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={share}><Share2 className="h-5 w-5" /><span className="text-xs">Partager</span></Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-zandu p-4">
          <h2 className="font-semibold mb-3">Ventes récentes</h2>
          {stats?.recent.length ? (
            <ul className="divide-y divide-border">
              {stats.recent.map((r: any, i: number) => (
                <li key={i} className="py-2 flex items-center justify-between text-sm">
                  <span className="truncate">{r.name} <span className="text-muted-foreground">×{r.quantity}</span></span>
                  <span className="font-medium">{formatPrice(r.unit_price_cents * r.quantity)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Aucune vente pour l'instant.</p>}
        </div>
        <div className="card-zandu p-4">
          <h2 className="font-semibold mb-3">Meilleurs produits</h2>
          {stats?.top.length ? (
            <ul className="space-y-2">
              {stats.top.map((p: any) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                    {(p.images?.[0] ?? p.image_url) && <img src={p.images?.[0] ?? p.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-muted-foreground">{p.sold} vendu(s)</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Aucun produit.</p>}
        </div>
      </div>
    </div>
  );
}
