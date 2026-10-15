-- ============================================================================
-- Decisão 6 ADR-019: Adicionar jurisdiction_uf estruturado no Case
-- Objetivo: Substituir extração heurística por campo explícito (UF do órgão autuador)
-- Permite filtro jurisdicional preciso no RAG e Quality Gate
-- ============================================================================

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS jurisdiction_uf text;

-- Índice para consultas por jurisdição
CREATE INDEX IF NOT EXISTS idx_cases_jurisdiction_uf ON public.cases(jurisdiction_uf) WHERE jurisdiction_uf IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.cases.jurisdiction_uf IS 'UF da jurisdição do órgão autuador (ex: SP, RJ, MG). Preenchido no onboarding a partir do autuadorBody.';

-- Atualizar casos existentes com heurística baseada no autuadorBody (best effort)
-- Esta é uma migração de dados best-effort; casos novos devem ter o campo preenchido no onboarding.
UPDATE public.cases
SET jurisdiction_uf = CASE
  WHEN autuador_body ILIKE '%DETRAN-SP%' OR autuador_body ILIKE '%CETRAN-SP%' OR autuador_body ILIKE '%PRF-SP%' THEN 'SP'
  WHEN autuador_body ILIKE '%DETRAN-RJ%' OR autuador_body ILIKE '%CETRAN-RJ%' THEN 'RJ'
  WHEN autuador_body ILIKE '%DETRAN-MG%' OR autuador_body ILIKE '%CETRAN-MG%' THEN 'MG'
  WHEN autuador_body ILIKE '%DETRAN-RS%' OR autuador_body ILIKE '%CETRAN-RS%' THEN 'RS'
  WHEN autuador_body ILIKE '%DETRAN-PR%' OR autuador_body ILIKE '%CETRAN-PR%' THEN 'PR'
  WHEN autuador_body ILIKE '%DETRAN-SC%' OR autuador_body ILIKE '%CETRAN-SC%' THEN 'SC'
  WHEN autuador_body ILIKE '%DETRAN-BA%' OR autuador_body ILIKE '%CETRAN-BA%' THEN 'BA'
  WHEN autuador_body ILIKE '%DETRAN-GO%' OR autuador_body ILIKE '%CETRAN-GO%' THEN 'GO'
  WHEN autuador_body ILIKE '%DETRAN-PE%' OR autuador_body ILIKE '%CETRAN-PE%' THEN 'PE'
  WHEN autuador_body ILIKE '%DETRAN-CE%' OR autuador_body ILIKE '%CETRAN-CE%' THEN 'CE'
  WHEN autuador_body ILIKE '%DETRAN-PA%' OR autuador_body ILIKE '%CETRAN-PA%' THEN 'PA'
  WHEN autuador_body ILIKE '%DETRAN-MA%' OR autuador_body ILIKE '%CETRAN-MA%' THEN 'MA'
  WHEN autuador_body ILIKE '%DETRAN-ES%' OR autuador_body ILIKE '%CETRAN-ES%' THEN 'ES'
  WHEN autuador_body ILIKE '%DETRAN-PB%' OR autuador_body ILIKE '%CETRAN-PB%' THEN 'PB'
  WHEN autuador_body ILIKE '%DETRAN-RN%' OR autuador_body ILIKE '%CETRAN-RN%' THEN 'RN'
  WHEN autuador_body ILIKE '%DETRAN-AL%' OR autuador_body ILIKE '%CETRAN-AL%' THEN 'AL'
  WHEN autuador_body ILIKE '%DETRAN-PI%' OR autuador_body ILIKE '%CETRAN-PI%' THEN 'PI'
  WHEN autuador_body ILIKE '%DETRAN-SE%' OR autuador_body ILIKE '%CETRAN-SE%' THEN 'SE'
  WHEN autuador_body ILIKE '%DETRAN-AC%' OR autuador_body ILIKE '%CETRAN-AC%' THEN 'AC'
  WHEN autuador_body ILIKE '%DETRAN-RO%' OR autuador_body ILIKE '%CETRAN-RO%' THEN 'RO'
  WHEN autuador_body ILIKE '%DETRAN-RR%' OR autuador_body ILIKE '%CETRAN-RR%' THEN 'RR'
  WHEN autuador_body ILIKE '%DETRAN-AP%' OR autuador_body ILIKE '%CETRAN-AP%' THEN 'AP'
  WHEN autuador_body ILIKE '%DETRAN-AM%' OR autuador_body ILIKE '%CETRAN-AM%' THEN 'AM'
  WHEN autuador_body ILIKE '%DETRAN-TO%' OR autuador_body ILIKE '%CETRAN-TO%' THEN 'TO'
  WHEN autuador_body ILIKE '%DETRAN-MS%' OR autuador_body ILIKE '%CETRAN-MS%' THEN 'MS'
  WHEN autuador_body ILIKE '%DETRAN-MT%' OR autuador_body ILIKE '%CETRAN-MT%' THEN 'MT'
  WHEN autuador_body ILIKE '%DETRAN-DF%' OR autuador_body ILIKE '%CETRAN-DF%' THEN 'DF'
  WHEN autuador_body ILIKE '%PRF%' THEN 'BR_FEDERAL'
  WHEN autuador_body ILIKE '%DNIT%' THEN 'BR_FEDERAL'
  WHEN autuador_body ILIKE '%ANTT%' THEN 'BR_FEDERAL'
  WHEN autuador_body ILIKE '%DENATRAN%' OR autuador_body ILIKE '%SENATRAN%' THEN 'BR_FEDERAL'
  ELSE NULL
END
WHERE jurisdiction_uf IS NULL;