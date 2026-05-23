import { Link } from "@tanstack/react-router";
import { ShieldCheck, Truck, Headphones } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="container-zandu py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">Z</span>
            Zandu
          </div>
          <p className="mt-3 text-sm text-muted-foreground">La marketplace de confiance pour les vendeurs et acheteurs.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Acheter</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/products">Tous les produits</Link></li>
            <li><Link to="/shops">Annuaire des boutiques</Link></li>
            <li><Link to="/cart">Mon panier</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Vendre</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/seller">Devenir vendeur</Link></li>
            <li><Link to="/seller">Mon espace</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Nos engagements</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" />Paiement sécurisé</li>
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand" />Livraison suivie</li>
            <li className="flex items-center gap-2"><Headphones className="h-4 w-4 text-brand" />Support 7j/7</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Zandu Marketplace. Tous droits réservés.
      </div>
    </footer>
  );
}
