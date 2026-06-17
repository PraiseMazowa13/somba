import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/money";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Package, ShieldCheck, Truck, RotateCcw, Store, ChevronDown, Minus, Plus } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const [activeImg, setActiveImg] = useState(0);

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, shops(id,name,slug,description,logo_url), categories(name,slug)")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  async function addToCart() {
    if (!user) { toast.error("Connectez-vous pour ajouter au panier"); navigate({ to: "/login" }); return; }
    if (!p) return;
    setAdding(true);
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

  if (isLoading) {
    return (
      <div className="container-zandu py-10 grid md:grid-cols-2 gap-10 animate-fade-in">
        <div className="aspect-square rounded-xl bg-secondary animate-pulse" />
        <div className="space-y-4">
          <div className="h-4 w-1/3 bg-secondary rounded animate-pulse" />
          <div className="h-10 w-3/4 bg-secondary rounded animate-pulse" />
          <div className="h-8 w-1/4 bg-secondary rounded animate-pulse" />
          <div className="h-32 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }
  if (!p) return <div className="container-zandu py-16">Produit introuvable.</div>;

  const images = (p.images && p.images.length > 0) ? p.images : [];
  const currentImg = images[activeImg];

  return (
    <div className="container-zandu py-10 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="space-y-3">
          <div
            key={currentImg || "empty"}
            className="card-zandu aspect-square bg-secondary flex items-center justify-center overflow-hidden animate-scale-in"
          >
            {currentImg ? (
              <img src={currentImg} alt={p.title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                    i === activeImg ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="animate-fade-in" style={{ animationDelay: "80ms", animationFillMode: "backwards" }}>
          {p.shops && (
            <Link to="/shops/$slug" params={{ slug: p.shops.slug }} className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
              <Store className="h-3.5 w-3.5" />
              {p.shops.name}
            </Link>
          )}
          <h1 className="mt-2 text-3xl md:text-4xl font-bold">{p.title}</h1>
          <div className="mt-4 text-3xl font-bold text-primary">{formatPrice(p.price_cents, p.currency)}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.stock > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {p.stock} en stock
              </span>
            ) : "Rupture de stock"}
          </p>

          {/* Quantity + CTA */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-input bg-surface overflow-hidden">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-3 py-2 hover:bg-secondary transition-colors"
                aria-label="Diminuer"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(Math.min(p.stock || 1, qty + 1))}
                className="px-3 py-2 hover:bg-secondary transition-colors"
                aria-label="Augmenter"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              onClick={addToCart}
              disabled={adding || p.stock <= 0}
              className="flex-1 min-w-[200px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
            >
              {p.stock <= 0 ? "Indisponible" : adding ? "Ajout…" : "Ajouter au panier"}
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
            {[
              { icon: ShieldCheck, label: "Achat sécurisé" },
              { icon: Truck, label: "Livraison rapide" },
              { icon: RotateCcw, label: "Retour facile" },
            ].map((b, i) => (
              <div
                key={b.label}
                className="rounded-lg border border-border bg-surface p-3 flex flex-col items-center gap-1.5 text-center hover:border-primary/40 transition-colors animate-fade-in"
                style={{ animationDelay: `${150 + i * 80}ms`, animationFillMode: "backwards" }}
              >
                <b.icon className="h-4 w-4 text-brand" />
                <span className="text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Caractéristiques — accordion fluide */}
          <Accordion type="single" collapsible defaultValue="desc" className="mt-8">
            {p.description && (
              <AccordionItem value="desc">
                <AccordionTrigger className="group">
                  <span className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 hidden" />
                    Description
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {p.description}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="specs">
              <AccordionTrigger>Caractéristiques</AccordionTrigger>
              <AccordionContent>
                <dl className="divide-y divide-border text-sm">
                  {p.categories && (
                    <div className="flex justify-between py-2">
                      <dt className="text-muted-foreground">Catégorie</dt>
                      <dd className="font-medium">{p.categories.name}</dd>
                    </div>
                  )}
                  {p.shops && (
                    <div className="flex justify-between py-2">
                      <dt className="text-muted-foreground">Vendeur</dt>
                      <dd className="font-medium">{p.shops.name}</dd>
                    </div>
                  )}
                  <div className="flex justify-between py-2">
                    <dt className="text-muted-foreground">Disponibilité</dt>
                    <dd className="font-medium">{p.stock > 0 ? `${p.stock} unités` : "Épuisé"}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted-foreground">Devise</dt>
                    <dd className="font-medium">{p.currency}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted-foreground">Référence</dt>
                    <dd className="font-mono text-xs">{p.id.slice(0, 8).toUpperCase()}</dd>
                  </div>
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="ship">
              <AccordionTrigger>Livraison & retour</AccordionTrigger>
              <AccordionContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Expédition sous 24-48h depuis la boutique</li>
                  <li>• Livraison estimée 2-5 jours ouvrés en RDC</li>
                  <li>• Retour possible sous 7 jours après réception</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
