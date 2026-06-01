import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Toutes les catégories — Zandu" },
      { name: "description", content: "Parcourez toutes les catégories de produits disponibles sur Zandu." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const [q, setQ] = useState("");
  const { data: cats } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("id,name,slug").order("name")).data ?? [],
  });

  const filtered = useMemo(() => {
    if (!cats) return [];
    const term = q.trim().toLowerCase();
    if (!term) return cats;
    return cats.filter((c) => c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term));
  }, [cats, q]);

  return (
    <div className="container-zandu py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Toutes les catégories</h1>
        <p className="text-muted-foreground mt-2">Trouvez exactement ce que vous cherchez parmi {cats?.length ?? 0} catégories.</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-input bg-surface px-3 py-2 max-w-xl mb-8">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une catégorie (ex. fast-food, mode…)"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          maxLength={80}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ category: c.slug } as any}
              className="card-zandu p-5 text-center hover:border-brand hover:shadow-elevated transition"
            >
              <div className="font-medium">{c.name}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card-zandu p-12 text-center text-muted-foreground">Aucune catégorie ne correspond à « {q} ».</div>
      )}
    </div>
  );
}
