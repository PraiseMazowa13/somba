import { Link } from "@tanstack/react-router";
import { Home, Grid3x3, Store, ShoppingBag, User } from "lucide-react";

const items = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/categories", label: "Catégories", icon: Grid3x3 },
  { to: "/shops", label: "Boutiques", icon: Store },
  { to: "/cart", label: "Panier", icon: ShoppingBag },
  { to: "/account", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 rounded-full bg-card/95 backdrop-blur border border-border shadow-[var(--shadow-elevated)]">
      <ul className="flex items-center justify-between px-2 py-1.5">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              activeOptions={{ exact: "exact" in it }}
              className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-muted-foreground transition-all"
              activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <it.icon className="h-5 w-5" />
                  {isActive && <span className="text-xs">{it.label}</span>}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
