import { useState } from "react";
import { Share2, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { shopShareUrl } from "@/lib/catalog-controls";

export function ShopShareButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const url = shopShareUrl(slug);
  const text = `Découvrez ${name} sur Zandu`;
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: name, text, url }); return; }
      catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    setOpen(true);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); toast.success("Lien copié"); }
    catch { toast.error("Copie indisponible : sélectionnez le lien pour le copier."); }
  }
  return <>
    <Button variant="outline" size="sm" onClick={share} className={className}><Share2 className="h-4 w-4 shrink-0" /><span>Partager</span></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent><DialogHeader><DialogTitle>Partager {name}</DialogTitle><DialogDescription>Lien public de la boutique</DialogDescription></DialogHeader>
        <Input aria-label="Lien de la boutique" value={url} readOnly onFocus={e => e.currentTarget.select()} />
        <div className="flex flex-wrap gap-2"><Button onClick={copy}><Copy className="h-4 w-4" />Copier le lien</Button><Button asChild variant="outline"><a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button></div>
      </DialogContent>
    </Dialog>
  </>;
}