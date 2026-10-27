ALTER TABLE public.shops ADD COLUMN theme_color TEXT;
COMMENT ON COLUMN public.shops.theme_color IS 'Couleur principale du thème de la boutique (hex, ex: #1d4ed8), choisie par le vendeur.';