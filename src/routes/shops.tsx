import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Store, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/shops")({
  head: () => ({ meta: [{ title: "Boutiques — Zandu" }, { name: "description", content: "Toutes les boutiques de la marketplace Zandu." }] }),
  component: ShopsPage,
});

function ShopsPage() {
  const isShopDetail = useRouterState({ select: (state) => state.location.pathname.startsWith("/shops/") });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "recent">("name");

  const { data: shops } = useQuery({
    queryKey: ["shops-approved"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shops")
        .select("id,name,slug,description,logo_url,banner_url,created_at")
        .eq("status", "approved");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!shops) return [];
    const term = q.trim().toLowerCase();
    let list = shops;
    if (term) list = list.filter((s) => s.name.toLowerCase().includes(term) || (s.description ?? "").toLowerCase().includes(term));
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else list = [...list].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return list;
  }, [shops, q, sort]);

  if (isShopDetail) return <Outlet />;

  return (
    <div className="container-zandu py-10">
      <h1 className="text-3xl font-bold">Toutes les boutiques</h1>
      <p className="text-muted-foreground mt-2">{filtered.length} boutique(s)</p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-input bg-surface px-3 py-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une boutique…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            maxLength={120}
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nom (A→Z)</SelectItem>
            <SelectItem value="recent">Plus récentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <Link key={s.id} to="/shops/$slug" params={{ slug: s.slug }} className="card-zandu p-5 flex gap-4 hover:border-brand transition">
            <div className="h-14 w-14 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" /> : <Store className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <div className="font-semibold">{s.name}</div>
              <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <div className="card-zandu p-12 text-center text-muted-foreground col-span-full">Aucune boutique ne correspond.</div>}
      </div>
    </div>
  );
}
