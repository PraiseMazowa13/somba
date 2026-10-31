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
    <nav aria-label="Navigation principale" className="md:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-3 z-40 rounded-full bg-card/95 backdrop-blur border border-border shadow-[var(--shadow-elevated)]">
      <ul className="grid grid-cols-5 items-center px-1 py-1.5">
        {items.map((it) => (
          <li key={it.to} className="min-w-0">
            <Link
              to={it.to}
              activeOptions={{ exact: "exact" in it }}
              aria-label={it.label}
              className="group flex flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1 text-muted-foreground transition-colors"
              activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <it.icon className="h-5 w-5 shrink-0" />
                  <span className="text-[9px] leading-3">{it.label}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
