import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Inscription — Zandu" }, { name: "description", content: "Créez votre compte Zandu en quelques secondes." }] }),
  component: SignupPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Nom trop court").max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6, "Au moins 6 caractères").max(72),
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.full_name },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Compte créé ! Vérifiez votre email.");
    navigate({ to: "/" });
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Échec Google");
  }

  return (
    <div className="container-zandu py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-2">Créer un compte</h1>
      <p className="text-muted-foreground mb-8">Rejoignez la marketplace Zandu.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={100} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div><Label>Mot de passe</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Création…" : "Créer mon compte"}</Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" /> OU <div className="flex-1 h-px bg-border" />
      </div>
      <Button variant="outline" className="w-full" onClick={google}>S'inscrire avec Google</Button>
      <p className="mt-6 text-sm text-muted-foreground text-center">
        Déjà un compte ? <Link to="/login" className="text-brand hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
