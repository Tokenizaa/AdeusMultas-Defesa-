-- Add index on claim_token for faster lookups in cases table
CREATE INDEX IF NOT EXISTS idx_cases_claim_token ON public.cases(claim_token)
WHERE claim_token IS NOT NULL;

-- Add index on user_id for faster lookups of user's cases
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id)
WHERE user_id IS NOT NULL;

-- Add composite index for checking if a case is unclaimed
CREATE INDEX IF NOT EXISTS idx_cases_claim_token_user_id ON public.cases(claim_token, user_id)
WHERE claim_token IS NOT NULL AND user_id IS NULL;