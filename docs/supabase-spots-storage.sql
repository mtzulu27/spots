-- Bucket publico para covers y galerias del admin de Spots

insert into storage.buckets (id, name, public)
values ('spots-media', 'spots-media', true)
on conflict (id) do update set public = excluded.public;

create policy "public read spots media"
on storage.objects
for select
to public
using (bucket_id = 'spots-media');

create policy "authenticated upload spots media"
on storage.objects
for insert
to public
with check (bucket_id = 'spots-media');

create policy "authenticated update spots media"
on storage.objects
for update
to public
using (bucket_id = 'spots-media')
with check (bucket_id = 'spots-media');

create policy "authenticated delete spots media"
on storage.objects
for delete
to public
using (bucket_id = 'spots-media');
