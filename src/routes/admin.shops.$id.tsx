import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store, Package, ShoppingBag, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shops/$id")({
  head: () => ({ meta: [{ title: "Détails boutique — Admin" }] }),
  component: AdminShopDetail,
});

function AdminShopDetail() {
  const { id } = Route.useParams();
  const { roles, loading } = useAuth();
  const qc = useQueryClient();

  const { data: shop } = useQuery({
    queryKey: ["admin-shop", id],
    enabled: roles.includes("admin"),
    queryFn: async () => (await supabase.from("shops").select("*").eq("id", id).maybeSingle()).data,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-shop-stats", id],
    enabled: roles.includes("admin") && !!shop,
    queryFn: async () => {
      const [{ count: productCount }, { data: orderItems }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", id),
        supabase
          .from("order_items")
          .select("order_id,unit_price_cents,quantity")
          .eq("shop_id", id),
      ]);
      const orderIds = new Set((orderItems ?? []).map((o: any) => o.order_id));
      const revenue = (orderItems ?? []).reduce(
        (sum: number, oi: any) => sum + oi.unit_price_cents * oi.quantity,
        0
      );
      return {
        productCount: productCount ?? 0,
        orderCount: orderIds.size,
        revenue,
      };
    },
  });

  if (loading) return <div className="container-zandu py-16">Chargement…</div>;
  if (!roles.includes("admin")) return <div className="container-zandu py-16 text-center"><h1 className="text-2xl font-bold">Accès réservé</h1></div>;
  if (!shop) return <div className="container-zandu py-16">Boutique introuvable.</div>;

  async function setStatus(status: "approved" | "pending" | "suspended") {
    await supabase.from("shops").update({ status }).eq("id", id);
    toast.success("Statut mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-shop", id] });
    qc.invalidateQueries({ queryKey: ["admin-shops"] });
  }

  return (
    <div className="container-zandu py-10 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour à l'admin
      </Link>

      <div className="card-zandu p-6 flex items-center gap-5">
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
            <div className="text-2xl font-bold">{stats ? formatPrice(stats.revenue) : "…"}</div>
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

      {/* Actions */}
      <div className="card-zandu p-6">
        <h2 className="font-semibold mb-3">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setStatus("approved")} variant={shop.status === "approved" ? "secondary" : "default"}>Approuver</Button>
          <Button onClick={() => setStatus("pending")} variant="outline">Mettre en attente</Button>
          <Button onClick={() => setStatus("suspended")} variant="destructive">Suspendre</Button>
          <Button asChild variant="outline"><Link to="/shops/$slug" params={{ slug: shop.slug }}>Voir la boutique publique</Link></Button>
        </div>
      </div>
    </div>
  );
}
