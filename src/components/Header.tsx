import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Store, User, LogOut, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Header() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container-zandu flex h-16 items-center gap-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg font-[var(--font-display)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">Z</span>
          <span>Zandu</span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <Link to="/products" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>Produits</Link>
          <Link to="/categories" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>Catégories</Link>
          <Link to="/shops" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>Boutiques</Link>
        </nav>

        <form
          onSubmit={(e) => { e.preventDefault(); navigate({ to: "/products", search: { q, category: undefined } as any }); }}
          className="ml-auto hidden md:flex flex-1 max-w-md items-center gap-2 rounded-lg border border-input bg-surface px-3 py-1.5"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit, une boutique…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            maxLength={120}
          />
        </form>

        <div className="ml-auto md:ml-0 flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cart"><ShoppingBag className="h-4 w-4" /></Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/seller"><Store className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Vendeur</span></Link>
              </Button>
              {roles.includes("admin") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin"><ShieldCheck className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Admin</span></Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/account"><User className="h-4 w-4" /></Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Connexion</Link></Button>
              <Button size="sm" asChild><Link to="/signup">S'inscrire</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
