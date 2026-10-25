-- Migration: Restringir leitura de knowledge_monitoring_snapshots a admins
--
-- Problema: A policy 'knowledge_monitoring_snapshots_select_authenticated'
-- (criada em 20261023000001) usa USING (true) para role authenticated,
-- permitindo que QUALQUER usuário autenticado leia TODOS os snapshots de
-- monitoramento. Isso viola o isolamento de dados: usuários comuns podem
-- acessar dados de monitoramento que devem ser visíveis apenas a admins.
--
-- Correção: Substituir a policy por uma que verifica role = 'admin' via
-- user_profiles, idêntica ao padrão usado em outras tabelas administrativas.
--
-- Princípio: aditivo e idempotente. DROP IF EXISTS + CREATE.

ALTER TABLE public.knowledge_monitoring_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS knowledge_monitoring_snapshots_select_authenticated
  ON public.knowledge_monitoring_snapshots;

CREATE POLICY knowledge_monitoring_snapshots_select_admin
  ON public.knowledge_monitoring_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'admin'::public.user_role
    )
  );

-- Nenhuma policy de INSERT/UPDATE/DELETE para anon/authenticated:
-- gravação é exclusiva do client admin (service_role), que ignora RLS.

COMMENT ON POLICY knowledge_monitoring_snapshots_select_admin
  ON public.knowledge_monitoring_snapshots IS
  'Somente administradores podem ler snapshots de monitoramento. Usuários comuns (citizen) são bloqueados por RLS.';
