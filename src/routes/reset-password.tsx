import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Réinitialiser le mot de passe — Zandu" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) setMode("update");
  }, []);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Email envoyé. Vérifiez votre boîte de réception.");
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Au moins 6 caractères"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Mot de passe mis à jour"); window.location.href = "/account"; }
  }

  return (
    <div className="container-zandu py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-6">{mode === "request" ? "Mot de passe oublié" : "Nouveau mot de passe"}</h1>
      {mode === "request" ? (
        <form onSubmit={requestReset} className="space-y-4">
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <Button className="w-full" disabled={loading}>{loading ? "Envoi…" : "Envoyer le lien"}</Button>
        </form>
      ) : (
        <form onSubmit={updatePassword} className="space-y-4">
          <div><Label>Nouveau mot de passe</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <Button className="w-full" disabled={loading}>{loading ? "Mise à jour…" : "Mettre à jour"}</Button>
        </form>
      )}
    </div>
  );
}
