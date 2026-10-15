-- Persist the reusable identity/address fields collected by onboarding.
-- Additive only; no existing data is removed.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS cnh_category text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_zip_code text;
