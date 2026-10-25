-- ============================================================================
-- Migration: Políticas de retenção de dados pessoais (LGPD)
--
-- Base legal: LGPD Art. 6º, II (limitação de finalidade), Art. 18, VI
-- (eliminação dos dados tratados com consentimento do titular), Art. 46
-- (responsabilização e demonstração do cumprimento das normas).
--
-- Princípio: aditivo e idempotente. NADA destrutivo. Preserva fluxos existentes.
-- ============================================================================

-- Tabela de políticas de retenção por categoria de dado pessoal.
-- Cada política define por quanto tempo os dados são mantidos antes da
-- exclusão automática, qual a base legal e se se aplica a titulares
-- anônimos e/ou autenticados.
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
    id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category                   text NOT NULL UNIQUE,
    description                text NOT NULL,
    retention_days             integer NOT NULL CHECK (retention_days > 0),
    legal_basis                text NOT NULL,
    legal_basis_article        text NOT NULL,
    applies_to_anonymous       boolean NOT NULL DEFAULT true,
    applies_to_authenticated   boolean NOT NULL DEFAULT true,
    hard_delete_after_days     integer, -- exclusão física após este prazo, independentemente de base legal
    created_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                 timestamptz NOT NULL DEFAULT now(),
    updated_by                 text
);

-- Log de execuções do job de retenção — prova de conformidade para auditoria.
CREATE TABLE IF NOT EXISTS public.retention_executions (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at                  timestamptz NOT NULL DEFAULT now(),
    finished_at                 timestamptz,
    status                      text NOT NULL DEFAULT 'running', -- running | completed | failed
    cases_considered            integer NOT NULL DEFAULT 0,
    cases_deleted               integer NOT NULL DEFAULT 0,
    cases_retained_legal_basis  integer NOT NULL DEFAULT 0,
    error_message               text,
    trigger_type                text NOT NULL DEFAULT 'cron', -- cron | manual | api
    triggered_by                text
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_retention_policies_category ON public.data_retention_policies(category);
CREATE INDEX IF NOT EXISTS idx_retention_executions_started_at ON public.retention_executions(started_at DESC);

-- RLS: apenas service_role (backend) acessa diretamente. A API admin é o
-- único caminho para consultar/atualizar; authenticated e anon são
-- deny-all por padrão.
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_executions ENABLE ROW LEVEL SECURITY;

-- Dados iniciais — políticas de retenção padrão do AdeusMultas.
-- São defaults configuráveis via API de administração.
INSERT INTO public.data_retention_policies (
    category, description, retention_days, legal_basis, legal_basis_article,
    applies_to_anonymous, applies_to_authenticated, hard_delete_after_days, updated_by
)
VALUES
    (
        'cases',
        'Casos de defesa de trânsito e dados pessoais do titular (nome, CPF, telefone, e-mail, placa, AIT, veículo, minuta de defesa, análise, timeline).',
        1095, -- 3 anos
        'Consentimento do titular e execução de contrato de prestação de serviço',
        'LGPD Art. 7º, I e IX; Art. 18, VI',
        true,
        true,
        1460, -- 4 anos: exclusão física absoluta independente de base legal
        'system'
    ),
    (
        'payment_orders',
        'Ordens de pagamento e dados de transação (reconciliação interna com o gateway).',
        2555, -- 7 anos
        'Obrigação legal — registro fiscal e comercial',
        'LGPD Art. 7º, II; Código de Defesa do Consumidor Art. 51',
        true,
        true,
        null,
        'system'
    ),
    (
        'documents',
        'Documentos gerados vinculados a casos (minutas, petições, evidências de OCR).',
        1095, -- 3 anos
        'Consentimento do titular e execução de contrato de prestação de serviço',
        'LGPD Art. 7º, I e IX; Art. 18, VI',
        true,
        true,
        1460, -- 4 anos
        'system'
    ),
    (
        'audit_logs',
        'Trilha de auditoria de operações de privacidade e administração (export, delete, consent, retention).',
        2555, -- 7 anos
        'Obrigação legal — responsabilização e demonstração de conformidade',
        'LGPD Art. 46º',
        true,
        true,
        null,
        'system'
    )
ON CONFLICT (category) DO NOTHING;

-- Comentários de documentação no próprio banco.
COMMENT ON TABLE public.data_retention_policies IS
  'Políticas de retenção de dados pessoais por categoria (LGPD). Define prazos de retenção e bases legais. Configurável via API de administração.';
COMMENT ON TABLE public.retention_executions IS
  'Log de execuções do job automatizado de retenção — prova de conformidade para auditoria e DPO.';
COMMENT ON COLUMN public.data_retention_policies.hard_delete_after_days IS
  'Se preenchido, força exclusão física após este prazo independentemente de qualquer base legal de retenção.';
COMMENT ON COLUMN public.data_retention_policies.applies_to_anonymous IS
  'Indica se a política se aplica a casos de titulares anônimos (criados via claim_token).';
