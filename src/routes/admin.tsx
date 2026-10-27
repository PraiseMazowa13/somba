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

  const statusCounts = useMemo(() => {
    const c = { all: shops?.length ?? 0, approved: 0, pending: 0, suspended: 0 } as Record<string, number>;
    (shops ?? []).forEach((s: any) => { if (c[s.status] != null) c[s.status]++; });
    return c;
  }, [shops]);

  const tabs: { id: Section; label: string; icon: any }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: DollarSign },
    { id: "categories", label: "Catégories", icon: Package },
    { id: "shops", label: "Boutiques", icon: Store },
  ];

  const visibleCats = showAllCats ? cats ?? [] : (cats ?? []).slice(0, 6);

  return (
    <div className="container-zandu py-10 space-y-6">
      <h1 className="text-3xl font-bold">Administration</h1>

      {/* Navigation par sections */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={section === t.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSection(t.id)}
            className="gap-2"
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Button>
        ))}
      </div>

      {section === "overview" && (
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
        </section>
      )}

      {section === "categories" && (
        <section>
          <form onSubmit={addCat} className="card-zandu p-4 flex gap-3 mb-4 max-w-xl">
            <Input placeholder="Nouvelle catégorie" value={catName} onChange={(e) => setCatName(e.target.value)} maxLength={60} />
            <Button>Ajouter</Button>
          </form>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleCats.map((c) => (
              <div key={c.id} className="card-zandu p-3 flex items-center justify-between">
                <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">/{c.slug}</div></div>
                <Button variant="ghost" size="sm" onClick={() => delCat(c.id)}>Supprimer</Button>
              </div>
            ))}
          </div>
          {(cats?.length ?? 0) > 6 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={() => setShowAllCats((v) => !v)}>
                {showAllCats ? "Réduire" : `Voir tout (${cats?.length})`}
              </Button>
            </div>
          )}
          {(cats?.length ?? 0) === 0 && (
            <div className="card-zandu p-8 text-center text-muted-foreground">Aucune catégorie.</div>
          )}
        </section>
      )}

      {section === "shops" && (
        <section>
          {/* Boutons de filtre rapide par statut */}
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { id: "pending", label: "En attente", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
              { id: "approved", label: "Approuvées", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
              { id: "suspended", label: "Suspendues", tone: "bg-red-500/10 text-red-700 dark:text-red-400" },
              { id: "all", label: "Toutes", tone: "bg-secondary text-foreground" },
            ] as const).map((f) => (
              <Button
                key={f.id}
                variant={statusFilter === f.id ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(f.id)}
                className="gap-2"
              >
                {f.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === f.id ? "bg-primary-foreground/20" : f.tone}`}>
                  {statusCounts[f.id] ?? 0}
                </span>
              </Button>
            ))}
          </div>

          {/* Recherche */}
          <div className="card-zandu p-3 mb-4 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une boutique…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 border-0 shadow-none focus-visible:ring-0"
            />
          </div>

          {q.trim() === "" && statusFilter === "all" ? (
            <div className="card-zandu p-12 text-center text-muted-foreground">
              Sélectionnez un filtre ou recherchez une boutique pour afficher les résultats.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, 50).map((s: any) => (
                <div
                  key={s.id}
                  className="card-zandu p-4 flex flex-col gap-3 sm:flex-row sm:items-center hover:shadow-[var(--shadow-elevated)] transition-shadow"
                >
                  <Link to="/admin/shops/$id" params={{ id: s.id }} className="flex items-center gap-4 flex-1 min-w-0">
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
                  {/* Boutons d'action visibles */}
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {s.status === "pending" && (
                      <Button size="sm" onClick={() => updateShopStatus(s.id, "approved")} className="gap-1.5">
                        <Check className="h-4 w-4" /> Approuver
                      </Button>
                    )}
                    {s.status === "approved" && (
                      <Button size="sm" variant="destructive" onClick={() => updateShopStatus(s.id, "suspended")} className="gap-1.5">
                        <Ban className="h-4 w-4" /> Suspendre
                      </Button>
                    )}
                    {s.status === "suspended" && (
                      <Button size="sm" variant="outline" onClick={() => updateShopStatus(s.id, "approved")} className="gap-1.5">
                        <RotateCcw className="h-4 w-4" /> Réactiver
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild className="gap-1.5">
                      <Link to="/shops/$slug" params={{ slug: s.slug }}><Eye className="h-4 w-4" /> Voir</Link>
                    </Button>
                    <Button size="sm" asChild className="gap-1.5">
                      <Link to="/admin/shops/$id" params={{ id: s.id }}><Settings className="h-4 w-4" /> Gérer</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="card-zandu p-12 text-center text-muted-foreground">Aucune boutique ne correspond.</div>
              )}
              {filtered.length > 50 && (
                <div className="text-center text-xs text-muted-foreground">
                  {filtered.length - 50} résultats supplémentaires masqués — affinez votre recherche.
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
