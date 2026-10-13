-- Remove o índice único redundante sem perder a FK: a PK(user_id) continua
-- sendo a garantia de unicidade referenciada.
ALTER TABLE public.documenso_envelopes
  DROP CONSTRAINT IF EXISTS documenso_envelopes_user_id_fkey;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS uq_user_profiles_user;

ALTER TABLE public.documenso_envelopes
  ADD CONSTRAINT documenso_envelopes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;
