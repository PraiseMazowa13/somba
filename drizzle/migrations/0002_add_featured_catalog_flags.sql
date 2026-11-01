ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.guard_shop_featured() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_featured) OR (TG_OP = 'UPDATE' AND NEW.is_featured IS DISTINCT FROM OLD.is_featured) THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Seul un administrateur peut mettre une boutique en vedette';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_shop_featured BEFORE INSERT OR UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.guard_shop_featured();