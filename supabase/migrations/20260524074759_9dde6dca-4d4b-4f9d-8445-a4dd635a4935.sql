DROP POLICY IF EXISTS "shops owner delete" ON public.shops;

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason text;