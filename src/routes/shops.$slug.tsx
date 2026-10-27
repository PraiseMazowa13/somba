import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Store, Share2, Home, LayoutGrid, Info, MessageCircle, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/shops/$slug")({
  head: () => ({ meta: [{ title: "Boutique — Zandu" }] }),
  component: ShopPage,
});

type Tab = "home" | "catalog" | "about";

function ShopPage() {
  const { slug } = Route.useParams();
  const [tab, setTab] = useState<Tab>("home");
  const [q, setQ] = useState("");

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

  const filtered = useMemo(() => {
    if (!products) return [];
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) => p.title.toLowerCase().includes(t));
  }, [products, q]);

  async function shareShop() {
    if (!shop) return;
    const url = `${window.location.origin}/shops/${shop.slug}`;
    const shareData = { title: shop.name, text: `Découvrez ${shop.name} sur Zandu`, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié dans le presse-papiers");
      }
    } catch { /* user cancelled */ }
  }

  if (!shop) return <div className="container-zandu py-16">Boutique introuvable.</div>;

  const whatsapp = (shop as any).whatsapp_number as string | null;
  const theme = (shop as any).theme_color as string | null;
  const productsWithShop = filtered.map((p) => ({ ...p, shops: { name: shop.name, slug: shop.slug, logo_url: shop.logo_url } }));

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "home", label: "Accueil", icon: Home },
    { id: "catalog", label: "Catalogue", icon: LayoutGrid },
    { id: "about", label: "À propos", icon: Info },
  ];

  return (
    <div>
      {/* Bannière */}
      <div className="relative h-40 md:h-56 bg-secondary overflow-hidden">
        {shop.banner_url ? (
          <img src={shop.banner_url} alt={`${shop.name} bannière`} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="container-zandu -mt-14 relative z-10">
        <div className="card-zandu p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-xl bg-secondary border-4 border-background flex items-center justify-center overflow-hidden flex-shrink-0">
            {shop.logo_url ? <img src={shop.logo_url} className="h-full w-full object-cover" alt={shop.name} /> : <Store className="h-10 w-10 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">{shop.name}</h1>
            {shop.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{shop.description}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {whatsapp && (
              <Button asChild variant="outline" size="sm">
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener">
                  <MessageCircle className="h-4 w-4 mr-1" /> Contacter
                </a>
              </Button>
            )}
            <Button onClick={shareShop} size="sm">
              <Share2 className="h-4 w-4 mr-1" /> Partager
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-border overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="container-zandu py-6 md:py-8">
        {tab === "home" && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Nouveautés</h2>
                <button onClick={() => setTab("catalog")} className="text-sm text-primary hover:underline">Voir le catalogue →</button>
              </div>
              {products && products.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {products.slice(0, 6).map((p) => <ProductCard key={p.id} p={{ ...p, shops: { name: shop.name, slug: shop.slug, logo_url: shop.logo_url } }} />)}
                </div>
              ) : <div className="card-zandu p-12 text-center text-muted-foreground">Pas encore de produit.</div>}
            </section>
          </div>
        )}

        {tab === "catalog" && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher dans cette boutique…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">{filtered.length} produit(s)</p>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {productsWithShop.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            ) : <div className="card-zandu p-12 text-center text-muted-foreground">Aucun produit.</div>}
          </div>
        )}

        {tab === "about" && (
          <div className="card-zandu p-6 max-w-2xl space-y-4">
            <div>
              <h3 className="font-semibold mb-1">À propos de {shop.name}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{shop.description || "Aucune description fournie."}</p>
            </div>
            {whatsapp && (
              <div>
                <h3 className="font-semibold mb-1">Contact</h3>
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" /> WhatsApp : +{whatsapp.replace(/\D/g, "")}
                </a>
              </div>
            )}
            {Array.isArray(shop.delivery_zones) && shop.delivery_zones.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Zones de livraison</h3>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {(shop.delivery_zones as any[]).map((z, i) => (
                    <li key={i}>• {z.city} — {(z.price_cents / 100).toLocaleString("fr-FR")} {z.currency}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
