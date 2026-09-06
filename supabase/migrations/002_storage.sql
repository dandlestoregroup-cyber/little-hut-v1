begin;

-- Only approved guest-facing derivatives belong in this bucket.
-- Raw assessor/scout evidence must remain in a separate private bucket and is never referenced by guest views.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-moment-media',
  'public-moment-media',
  true,
  15728640,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-evidence-media',
  'private-evidence-media',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No authenticated INSERT/UPDATE/DELETE policies are created here.
-- Uploads and promotion to the public bucket must pass the server-side evidence service
-- using a server credential after role and public-safety checks.

commit;
