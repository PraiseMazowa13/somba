import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { slugify } from "@/lib/money";
import { Search, Store, Package, ShoppingBag, DollarSign, Users } from "lucide-react";
import { formatPrice } from "@/lib/money";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Zandu" }] }),
  component: AdminPage,
});

type Section = "overview" | "categories" | "shops";

function AdminPage() {
  const { user, roles, loading } = useAuth();
  const qc = useQueryClient();
  const [catName, setCatName] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "suspended">("pending");
  const [section, setSection] = useState<Section>("overview");
  const [showAllCats, setShowAllCats] = useState(false);

  const { data: cats } = useQuery({
    queryKey: ["admin-cats"],
    enabled: roles.includes("admin"),
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const { data: shops } = useQuery({
    queryKey: ["admin-shops"],
    enabled: roles.includes("admin"),
    queryFn: async () => (await supabase.from("shops").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: overview } = useQuery({
    queryKey: ["admin-overview"],
    enabled: roles.includes("admin"),
    queryFn: async () => {
      const [shopsCount, productsCount, ordersCount, items, users] = await Promise.all([
        supabase.from("shops").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("order_items").select("unit_price_cents,quantity"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const revenue = (items.data ?? []).reduce((s: number, oi: any) => s + oi.unit_price_cents * oi.quantity, 0);
      return {
        shops: shopsCount.count ?? 0,
        products: productsCount.count ?? 0,
        orders: ordersCount.count ?? 0,
        users: users.count ?? 0,
        revenue,
      };
    },
  });

  const filtered = useMemo(() => {
    if (!shops) return [];
    const needle = q.trim().toLowerCase();
    return shops.filter((s: any) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        s.name?.toLowerCase().includes(needle) ||
        s.slug?.toLowerCase().includes(needle) ||
        s.description?.toLowerCase().includes(needle)
      );
    });
  }, [shops, q, statusFilter]);

  if (loading) return <div className="container-zandu py-16">Chargement…</div>;
  if (!user) return <div className="container-zandu py-16 text-center"><Button asChild><Link to="/login">Connexion</Link></Button></div>;
  if (!roles.includes("admin")) return (
    <div className="container-zandu py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">Accès réservé</h1>
      <p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p>
    </div>
  );

  async function addCat(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: catName.trim(), slug: slugify(catName) });
    if (error) toast.error(error.message); else { toast.success("Catégorie créée"); setCatName(""); qc.invalidateQueries({ queryKey: ["admin-cats"] }); }
  }
  async function delCat(id: string) {
    await supabase.from("categories").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-cats"] });
  }

  return (
    <div className="container-zandu py-10 space-y-10">
      <section>
        <h1 className="text-3xl font-bold mb-6">Administration</h1>

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { icon: Store, label: "Boutiques", value: overview?.shops ?? "…" },
            { icon: Package, label: "Produits", value: overview?.products ?? "…" },
            { icon: ShoppingBag, label: "Commandes", value: overview?.orders ?? "…" },
            { icon: Users, label: "Utilisateurs", value: overview?.users ?? "…" },
            { icon: DollarSign, label: "CA total", value: overview ? formatPrice(overview.revenue) : "…" },
          ].map((c) => (
            <div key={c.label} className="card-zandu p-4 flex items-center gap-3">
              <c.icon className="h-6 w-6 text-primary" />
              <div>
                <div className="text-lg font-bold leading-tight">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-4">Catégories</h2>
        <form onSubmit={addCat} className="card-zandu p-4 flex gap-3 mb-4 max-w-xl">
          <Input placeholder="Nouvelle catégorie" value={catName} onChange={(e) => setCatName(e.target.value)} maxLength={60} />
          <Button>Ajouter</Button>
        </form>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cats?.map((c) => (
            <div key={c.id} className="card-zandu p-3 flex items-center justify-between">
              <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">/{c.slug}</div></div>
              <Button variant="ghost" size="sm" onClick={() => delCat(c.id)}>Supprimer</Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Boutiques ({filtered.length})</h2>

        {/* Recherche & filtres */}
        <div className="card-zandu p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, slug, description…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="rounded-md border border-input bg-surface px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Tous statuts</option>
            <option value="approved">Approuvées</option>
            <option value="pending">En attente</option>
            <option value="suspended">Suspendues</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.map((s: any) => (
            <Link
              key={s.id}
              to="/admin/shops/$id"
              params={{ id: s.id }}
              className="card-zandu p-4 flex items-center gap-4 hover:shadow-[var(--shadow-elevated)] transition-shadow"
            >
              <div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {s.logo_url ? <img src={s.logo_url} className="h-full w-full object-cover" /> : <Store className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {s.name}
                  {s.deletion_requested_at && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Suppression demandée</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">/{s.slug}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                s.status === "approved" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                s.status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                "bg-red-500/10 text-red-700 dark:text-red-400"
              }`}>
                {s.status}
              </span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="card-zandu p-12 text-center text-muted-foreground">Aucune boutique ne correspond.</div>
          )}
        </div>
      </section>
    </div>
  );
}
