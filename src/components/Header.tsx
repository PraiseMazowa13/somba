import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Store, User, LogOut, Search, ShieldCheck, Menu, Home, Tag, Grid3x3 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useState } from "react";

export function Header() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const navLinks = (
    <>
      <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-base hover:bg-accent">
        <Home className="h-4 w-4" /> Accueil
      </Link>
      <Link to="/products" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-base hover:bg-accent">
        <Tag className="h-4 w-4" /> Produits
      </Link>
      <Link to="/categories" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-base hover:bg-accent">
        <Grid3x3 className="h-4 w-4" /> Catégories
      </Link>
      <Link to="/shops" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-base hover:bg-accent">
        <Store className="h-4 w-4" /> Boutiques
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container-zandu flex h-16 items-center gap-3 md:gap-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {navLinks}
              <form
                onSubmit={(e) => { e.preventDefault(); setOpen(false); navigate({ to: "/products", search: { q, category: undefined } as any }); }}
                className="mt-4 flex items-center gap-2 rounded-lg border border-input bg-surface px-3 py-1.5"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  maxLength={120}
                />
              </form>
              {!user && (
                <div className="mt-4 flex flex-col gap-2">
                  <Button asChild onClick={() => setOpen(false)}><Link to="/signup">S'inscrire</Link></Button>
                  <Button variant="outline" asChild onClick={() => setOpen(false)}><Link to="/login">Connexion</Link></Button>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>

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
                <Link to="/seller"><Store className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Vendeur</span></Link>
              </Button>
              {roles.includes("admin") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin"><ShieldCheck className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Admin</span></Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/account"><User className="h-4 w-4" /></Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex"><Link to="/login">Connexion</Link></Button>
              <Button size="sm" asChild className="hidden sm:inline-flex"><Link to="/signup">S'inscrire</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
