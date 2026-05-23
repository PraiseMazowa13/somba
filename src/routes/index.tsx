import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { ShieldCheck, Truck, Headphones, Store, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Zandu — Marketplace de confiance" }, { name: "description", content: "La marketplace multi-vendeurs où acheter et vendre en toute sécurité." }] }),
  component: Index,
});

function Index() {
  const { data: products } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,title,price_cents,currency,images,shops(name,slug)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as unknown as ProductCardData[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name").limit(8);
      return data ?? [];
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero text-white">
        <div className="container-zandu py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" /> Paiement sécurisé · Livraison suivie
            </span>
            <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight">
              La marketplace où chacun peut vendre <span className="text-brand-foreground/90">et acheter en confiance</span>.
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-xl">
              Découvrez des milliers de produits de vendeurs vérifiés. Ouvrez votre boutique en quelques minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link to="/products">Découvrir les produits <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white" asChild>
                <Link to="/seller"><Store className="mr-2 h-4 w-4" />Devenir vendeur</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {[ShieldCheck, Truck, Headphones, Store].map((Icon, i) => (
              <div key={i} className="rounded-xl bg-white/10 backdrop-blur p-6 border border-white/15">
                <Icon className="h-7 w-7 mb-3" />
                <div className="font-semibold">{["Paiement sécurisé","Livraison suivie","Support 7j/7","Boutiques vérifiées"][i]}</div>
                <p className="text-sm text-white/70 mt-1">{["Vos données protégées","Suivi en temps réel","Une équipe à l'écoute","Vendeurs de confiance"][i]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-zandu py-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Explorer par catégorie</h2>
          <Link to="/products" className="text-sm text-brand hover:underline">Tout voir</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ category: c.slug, q: undefined } as any}
              className="card-zandu p-4 text-center hover:border-brand transition"
            >
              <div className="text-sm font-medium">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-zandu pb-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Nouveautés</h2>
          <Link to="/products" className="text-sm text-brand hover:underline">Voir plus</Link>
        </div>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="card-zandu p-12 text-center text-muted-foreground">
            Aucun produit pour l'instant. <Link to="/seller" className="text-brand hover:underline">Soyez le premier vendeur !</Link>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container-zandu pb-20">
        <div className="card-zandu p-10 md:p-14 text-center bg-secondary/60">
          <h3 className="text-2xl md:text-3xl font-bold">Vous avez quelque chose à vendre ?</h3>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Créez votre boutique gratuitement et touchez des milliers d'acheteurs dès aujourd'hui.</p>
          <Button size="lg" className="mt-6" asChild><Link to="/seller">Ouvrir ma boutique</Link></Button>
        </div>
      </section>
    </div>
  );
}
