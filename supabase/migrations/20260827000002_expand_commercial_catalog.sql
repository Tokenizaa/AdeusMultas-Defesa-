-- Migration: expand_commercial_catalog
-- Description: Adiciona suspensao_cnh, cassacao_cnh, processo_suspensao, processo_cassacao ao catálogo comercial
-- Estes tipos existem no ProcedureType mas não tinham preço, causando fallback para defesa_previa

INSERT INTO service_pricings (service_type, service_name, description, standard_price, promotional_price, is_active, valid_from, history)
VALUES
  ('suspensao_cnh', 'Suspensão da CNH / Lei Seca', 'Defesa administrativa contra processo de suspensão do direito de dirigir.', 14990, 7495, TRUE, now(), '[]'::jsonb),
  ('cassacao_cnh', 'Cassação da CNH (PCDD)', 'Defesa contra processo de cassação da CNH por condução com documento suspenso.', 19990, 9995, TRUE, now(), '[]'::jsonb),
  ('processo_suspensao', 'Defesa em Processo de Suspensão (PSDD)', 'Defesa técnica completa em processo administrativo de suspensão da CNH.', 14990, 7495, TRUE, now(), '[]'::jsonb),
  ('processo_cassacao', 'Defesa em Processo de Cassação (PCDD)', 'Defesa especializada contra procedimento de cassação da habilitação.', 19990, 9995, TRUE, now(), '[]'::jsonb)
ON CONFLICT (service_type) DO NOTHING;