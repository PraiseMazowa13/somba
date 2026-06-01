
-- 1. Add delivery zones to shops (array of {city, price_cents, currency})
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS delivery_zones jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Seed additional categories
INSERT INTO public.categories (name, slug) VALUES
  ('Fast-food', 'fast-food'),
  ('Alimentation', 'alimentation'),
  ('Sport & Loisirs', 'sport-loisirs'),
  ('Jouets', 'jouets'),
  ('Livres', 'livres'),
  ('Bébé', 'bebe'),
  ('Bricolage', 'bricolage'),
  ('Automobile', 'automobile'),
  ('Téléphonie', 'telephonie'),
  ('Informatique', 'informatique'),
  ('Bijoux', 'bijoux'),
  ('Jardin', 'jardin'),
  ('Musique', 'musique'),
  ('Santé', 'sante')
ON CONFLICT (slug) DO NOTHING;

-- 3. Create 10 demo seller users + shops + products
DO $$
DECLARE
  seller_ids uuid[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  shop_ids uuid[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  shop_names text[] := ARRAY[
    'Kin Mode', 'Lubumbashi Tech', 'Boutique Kasaï', 'Saveurs du Congo', 'Élégance Africaine',
    'Maison & Déco RDC', 'Sport Kinshasa', 'Petits Trésors', 'Auto Pro Congo', 'Bibliothèque Numérique'
  ];
  shop_descs text[] := ARRAY[
    'Vêtements et accessoires tendance au cœur de Kinshasa.',
    'Smartphones, ordinateurs et accessoires high-tech.',
    'Produits artisanaux et tissus traditionnels.',
    'Spécialités locales et fast-food à emporter.',
    'Beauté, parfumerie et bijoux raffinés.',
    'Tout pour aménager votre intérieur.',
    'Équipements sportifs et tenues techniques.',
    'Jouets, articles bébé et accessoires enfants.',
    'Pièces auto et accessoires véhicules.',
    'Livres papier et numériques en français.'
  ];
  cat_slugs text[] := ARRAY[
    'vetements','chaussures','accessoires','electronique','beaute','maison',
    'fast-food','alimentation','sport-loisirs','jouets','livres','bebe',
    'bricolage','automobile','telephonie','informatique','bijoux','jardin','musique','sante'
  ];
  prod_titles text[] := ARRAY[
    'Pack découverte','Édition collector','Article premium','Best-seller du moment',
    'Nouveauté exclusive','Pack famille','Édition limitée','Choix de la rédaction',
    'Coup de cœur','Promo flash'
  ];
  i int; j int;
  cur_seller uuid; cur_shop uuid; cur_cat uuid;
  cur_currency text; cur_price int;
BEGIN
  FOR i IN 1..10 LOOP
    cur_seller := seller_ids[i];
    cur_shop := shop_ids[i];

    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', cur_seller, 'authenticated', 'authenticated',
      'demo-seller-' || i || '@zandu.local',
      crypt('DemoPass123!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', shop_names[i]),
      now(), now(), '', '', '', ''
    );

    -- Profile + seller role
    INSERT INTO public.profiles (id, full_name) VALUES (cur_seller, shop_names[i])
      ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (cur_seller, 'buyer')
      ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (cur_seller, 'seller')
      ON CONFLICT DO NOTHING;

    -- Shop (approved so visible)
    INSERT INTO public.shops (id, owner_id, name, slug, description, status, delivery_zones)
    VALUES (
      cur_shop, cur_seller, shop_names[i],
      'demo-' || i || '-' || lower(regexp_replace(shop_names[i], '[^a-zA-Z0-9]+', '-', 'g')),
      shop_descs[i], 'approved',
      jsonb_build_array(
        jsonb_build_object('city','Kinshasa','price_cents', (3000 + i*200)*100, 'currency','CDF'),
        jsonb_build_object('city','Lubumbashi','price_cents', (5000 + i*300)*100, 'currency','CDF')
      )
    );

    -- 10 products per shop, spread across all 20 categories
    FOR j IN 1..10 LOOP
      SELECT id INTO cur_cat FROM public.categories
        WHERE slug = cat_slugs[((i-1)*10 + j - 1) % array_length(cat_slugs,1) + 1];

      IF (i + j) % 2 = 0 THEN
        cur_currency := 'CDF';
        cur_price := (2500 + ((i*j*137) % 50000)) * 100;
      ELSE
        cur_currency := 'USD';
        cur_price := (5 + ((i*j*7) % 200)) * 100;
      END IF;

      INSERT INTO public.products (shop_id, category_id, title, description, price_cents, currency, stock, status, images)
      VALUES (
        cur_shop, cur_cat,
        prod_titles[j] || ' — ' || shop_names[i],
        'Produit de démonstration de la boutique ' || shop_names[i] || '. Qualité garantie, livraison rapide.',
        cur_price, cur_currency,
        10 + (j*3), 'active', ARRAY[]::text[]
      );
    END LOOP;
  END LOOP;
END $$;
