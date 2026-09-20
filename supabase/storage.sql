-- ============================================================
-- STORAGE SETUP FOR RESOURCES
-- ============================================================

-- 1. Create the bucket
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

-- 2. Allow public access to read files
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'resources' );

-- 3. Allow authenticated users to upload files
create policy "Authenticated users can upload"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'resources' );
