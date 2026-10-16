-- Migration: add_marketing_lead_qualification
-- Created: 2026-10-16
-- Purpose: require an explicit marketing qualification decision before campaign enrollment.
-- Safe default: all existing and new leads remain pending until reviewed by Marketing.

ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS qualification_status text NOT NULL DEFAULT 'pending'
    CONSTRAINT marketing_leads_qualification_status_check
    CHECK (qualification_status IN ('pending', 'qualified', 'disqualified'));

ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS qualification_notes text;

ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_qualification_status
  ON public.marketing_leads(qualification_status);

COMMENT ON COLUMN public.marketing_leads.qualification_status IS
  'Marketing review state: pending by default; only qualified leads may enter campaigns.';
COMMENT ON COLUMN public.marketing_leads.qualification_notes IS
  'Optional internal rationale for qualification/disqualification; do not store secrets or sensitive personal data.';
COMMENT ON COLUMN public.marketing_leads.qualified_at IS
  'Timestamp when Marketing explicitly marked the lead as qualified.';
