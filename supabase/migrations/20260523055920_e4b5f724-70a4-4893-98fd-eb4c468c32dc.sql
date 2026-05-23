
-- Fix function search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Revoke execute on internal functions from public/anon
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- has_role must remain callable by authenticated for RLS policies
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;

-- Tighten storage SELECT: only owner can list their folder; public read individual objects still works via signed/public URL
drop policy if exists "shop-assets public read" on storage.objects;
drop policy if exists "product-images public read" on storage.objects;

-- Re-create as owner-only listing; public buckets still serve files directly via public URL
create policy "shop-assets owner list" on storage.objects for select using (
  bucket_id = 'shop-assets' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "product-images owner list" on storage.objects for select using (
  bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]
);
