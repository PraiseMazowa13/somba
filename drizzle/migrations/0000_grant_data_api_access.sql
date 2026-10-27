GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.products, public.shops, public.categories, public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.shops, public.categories, public.profiles, public.addresses, public.carts, public.cart_items, public.orders, public.order_items, public.user_roles TO authenticated;
GRANT ALL ON public.products, public.shops, public.categories, public.profiles, public.addresses, public.carts, public.cart_items, public.orders, public.order_items, public.user_roles TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;