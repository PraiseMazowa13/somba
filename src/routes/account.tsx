import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/money";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Mon compte — Zandu" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,status,total_cents,currency,created_at,order_items(title,quantity,unit_price_cents)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (loading) return <div className="container-zandu py-16">Chargement…</div>;
  if (!user) return (
    <div className="container-zandu py-16 text-center">
      <Button asChild><Link to="/login">Connexion</Link></Button>
    </div>
  );

  const statusLabel: Record<string,string> = {
    pending_payment: "En attente de paiement",
    paid: "Payée", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
  };

  return (
    <div className="container-zandu py-10">
      <h1 className="text-3xl font-bold mb-2">Mon compte</h1>
      <p className="text-muted-foreground mb-8">{user.email}</p>

      <h2 className="text-xl font-semibold mb-4">Mes commandes</h2>
      {!orders || orders.length === 0 ? (
        <div className="card-zandu p-12 text-center text-muted-foreground">Aucune commande pour l'instant.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => (
            <div key={o.id} className="card-zandu p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("fr-FR")}</div>
                  <div className="mt-1 text-sm">{o.order_items?.length ?? 0} article(s)</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatPrice(o.total_cents, o.currency)}</div>
                  <span className="inline-block mt-1 text-xs px-2 py-1 rounded-full bg-secondary">{statusLabel[o.status] ?? o.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
