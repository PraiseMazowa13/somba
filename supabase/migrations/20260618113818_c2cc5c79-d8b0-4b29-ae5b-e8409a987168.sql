ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'standard';