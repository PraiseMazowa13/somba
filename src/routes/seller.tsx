import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Store, Package, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/seller")({
  head: () => ({ meta: [{ title: "Espace vendeur — Zandu" }] }),
  component: SellerLayout,
});

function SellerLayout() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="container-zandu py-16">Chargement…</div>;
  if (!user) return (
    <div className="container-zandu py-16 text-center">
      <h1 className="text-2xl font-bold mb-4">Espace vendeur</h1>
      <p className="text-muted-foreground mb-6">Connectez-vous pour accéder à votre espace vendeur.</p>
      <Button asChild><Link to="/login">Se connecter</Link></Button>
    </div>
  );

  const tabs = [
    { to: "/seller", label: "Boutique", icon: Store, exact: true },
    { to: "/seller/products", label: "Produits", icon: Package },
    { to: "/seller/orders", label: "Commandes", icon: ClipboardList },
  ];

  return (
    <div className="container-zandu py-8 grid lg:grid-cols-[220px,1fr] gap-8">
      <aside className="lg:sticky lg:top-20 lg:self-start space-y-1">
        {tabs.map((t) => {
          const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/60"}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </Link>
          );
        })}
      </aside>
      <div><Outlet /></div>
    </div>
  );
}
