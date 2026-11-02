import { ShopShareButton } from "@/components/ShopShareButton";
import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Store, MessageCircle, Search, BadgeCheck, RefreshCw } from "lucide-react";
import { useState, useMemo, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shopCatalog, shopThemeVars, type ShopSort } from "@/lib/shop-theme";

export const Route = createFileRoute("/shops/$slug")({
  head: () => pageMeta("Boutique — Zandu", "Découvrez le catalogue et les coordonnées de cette boutique Zandu."),
  component: ShopPage,
});

type Tab = "home" | "catalog" | "about";
type ShopProduct = ProductCardData & { created_at: string; category_id: string | null; is_featured: boolean; compare_at_price_cents: number | null };

const SORTS: { id: ShopSort; label: string }[] = [
  { id: "recent", label: "Nouveautés" },
  { id: "price-up", label: "Prix ↑" },
  { id: "price-down", label: "Prix ↓" },
  { id: "promo", label: "Promotions" },
  { id: "featured", label: "En avant" },
];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary"}`}>
      {children}
    </button>
  );
}

function ShopPage() {
  const { slug } = Route.useParams();
  const [tab, setTab] = useState<Tab>("home");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<ShopSort>("recent");
  const [category, setCategory] = useState("");

  const { data: shop, isLoading, error, refetch } = useQuery({
    queryKey: ["shop", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: products } = useQuery({
    queryKey: ["shop-products", shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => {
      if (!shop) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id,title,price_cents,compare_at_price_cents,currency,images,is_featured,created_at,category_id")
        .eq("shop_id", shop.id).eq("status", "active").eq("is_active", true)
        .order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ShopProduct[];
    },
  });
  const { data: cats } = useQuery({
    queryKey: ["all-cats-min"],
    queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [],
  });

  const shopCats = useMemo(() => {
    const ids = new Set((products ?? []).map((p) => p.category_id).filter(Boolean));
    return (cats ?? []).filter((c) => ids.has(c.id));
  }, [products, cats]);
  const filtered = useMemo(() => shopCatalog(products ?? [], q, category, sort), [products, q, category, sort]);

  if (isLoading) return <div role="status" className="container-zandu py-16">Chargement de la boutique…</div>;
  if (error) return <div role="alert" className="container-zandu py-16 space-y-3"><p>Impossible de charger la boutique.</p><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" />Réessayer</Button></div>;
  if (!shop) return <div className="container-zandu py-16">Boutique introuvable.</div>;

  const whatsapp = shop.whatsapp_number;
  const waLink = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : null;
  const vars = shopThemeVars(shop.theme_color, shop.font_key) as CSSProperties;
  const withShop = (p: ShopProduct) => ({ ...p, shops: { name: shop.name, slug: shop.slug, logo_url: shop.logo_url } });
  const featured = (products ?? []).filter((p) => p.is_featured).slice(0, 6);
  const latest = (products ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  const promos = shopCatalog(products ?? [], "", "", "promo").slice(0, 6);
  const tabs: { id: Tab; label: string }[] = [{ id: "home", label: "Accueil" }, { id: "catalog", label: "Catalogue" }, { id: "about", label: "À propos" }];

  const Section = ({ title, items }: { title: string; items: ShopProduct[] }) => items.length === 0 ? null : (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-base font-bold" style={{ fontFamily: "var(--shop-font)" }}>{title}</h2>
        <button type="button" onClick={() => setTab("catalog")} className="text-xs font-semibold text-primary">Tout voir</button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">{items.map((p) => <ProductCard key={p.id} p={withShop(p)} />)}</div>
    </section>
  );

  return (
    <div style={vars} className="pb-10">
      <div className="container-zandu pt-4">
        {/* En-tête compact */}
        <header className="card-zandu p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 rounded-xl border border-border bg-secondary overflow-hidden grid place-items-center">
              {shop.logo_url ? <img src={shop.logo_url} className="h-full w-full object-cover" alt={shop.name} /> : <Store className="h-6 w-6 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h1 className="truncate text-lg font-bold" style={{ fontFamily: "var(--shop-font)" }}>{shop.name}</h1>
                {shop.status === "approved" && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Boutique vérifiée par Zandu" />}
              </div>
              {(shop.tagline || shop.description) && <p className="text-xs text-muted-foreground line-clamp-1">{shop.tagline || shop.description}</p>}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {waLink ? (
              <Button asChild size="sm" className="rounded-full"><a href={waLink} target="_blank" rel="noopener"><MessageCircle className="h-4 w-4" />Contacter</a></Button>
            ) : <Button size="sm" className="rounded-full" disabled><MessageCircle className="h-4 w-4" />Contacter</Button>}
            <ShopShareButton slug={shop.slug} name={shop.name} />
          </div>
        </header>

        {shop.status !== "approved" && <p className="mt-3 rounded-md border border-border bg-secondary p-3 text-sm">Aperçu privé · boutique {shop.status === "pending" ? "en attente" : "suspendue"}</p>}

        <nav aria-label="Sections de la boutique" className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>)}
        </nav>
      </div>

      <div className="container-zandu py-5">
        {tab === "home" && (
          <div className="space-y-6">
            <Section title="Mis en avant" items={featured} />
            <Section title="Promotions" items={promos} />
            <Section title="Nouveautés" items={latest} />
            {(products ?? []).length === 0 && <div className="card-zandu p-10 text-center text-muted-foreground">Pas encore de produit.</div>}
          </div>
        )}

        {tab === "catalog" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 rounded-full bg-card" placeholder="Rechercher dans cette boutique…" value={q} maxLength={120} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">{SORTS.map((s) => <Pill key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</Pill>)}</div>
            {shopCats.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <Pill active={!category} onClick={() => setCategory("")}>Toutes</Pill>
                {shopCats.map((c) => <Pill key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</Pill>)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{filtered.length} produit(s)</p>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">{filtered.map((p) => <ProductCard key={p.id} p={withShop(p)} />)}</div>
            ) : <div className="card-zandu p-10 text-center text-muted-foreground">Aucun produit.</div>}
          </div>
        )}

        {tab === "about" && (
          <div className="card-zandu p-5 space-y-4">
            <div>
              <h3 className="font-semibold mb-1" style={{ fontFamily: "var(--shop-font)" }}>À propos de {shop.name}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{shop.description || "Aucune description fournie."}</p>
            </div>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener" className="text-sm text-primary font-medium inline-flex items-center gap-1">
                <MessageCircle className="h-4 w-4" /> WhatsApp : +{whatsapp!.replace(/\D/g, "")}
              </a>
            )}
            {Array.isArray(shop.delivery_zones) && shop.delivery_zones.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Zones de livraison</h3>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {(shop.delivery_zones as any[]).map((z, i) => <li key={i}>• {z.city} — {(z.price_cents / 100).toLocaleString("fr-FR")} {z.currency}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
