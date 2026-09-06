begin;

-- PostgreSQL CREATE OR REPLACE VIEW cannot insert columns in the middle of an existing view.
-- Drop the guest projection before 005 recreates it with additional guest-safe property fields.
drop view if exists public.guest_moment_properties;

commit;
