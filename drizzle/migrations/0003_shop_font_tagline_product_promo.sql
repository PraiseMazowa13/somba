ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_price_cents integer;
ALTER TABLE public.products ADD CONSTRAINT products_compare_at_gt_price CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents > price_cents);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS font_key text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE public.shops ADD CONSTRAINT shops_tagline_len CHECK (tagline IS NULL OR char_length(tagline) <= 120);
ALTER TABLE public.shops ADD CONSTRAINT shops_font_key_valid CHECK (font_key IS NULL OR font_key IN ('jakarta','playfair','space','lora','outfit','dmserif'));