-- VenoPag affiliate split mapping. Credentials and provider usernames are never exposed publicly.
CREATE TABLE IF NOT EXISTS public.affiliate_gateway_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  venopag_username TEXT NOT NULL UNIQUE,
  split_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (split_percent >= 0 AND split_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_gateway_profiles_active
  ON public.affiliate_gateway_profiles (is_active) WHERE is_active = true;

ALTER TABLE public.affiliate_gateway_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.affiliate_gateway_profiles FROM anon, authenticated;
GRANT ALL ON public.affiliate_gateway_profiles TO service_role;

COMMENT ON TABLE public.affiliate_gateway_profiles IS
  'Maps internal referral beneficiaries to VenoPag usernames for explicit PIX split configuration. Managed only by the server-side admin API.';
