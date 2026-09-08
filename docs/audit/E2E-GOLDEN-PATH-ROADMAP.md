# E2E GOLDEN PATH — ROADMAP DE AUDITORIA E EXECUÇÃO

**Produto:** Adeus Multa  
**Objetivo:** provar uma jornada vertical real, coerente e auditável, do primeiro acesso ao documento final persistido.

## Regra operacional

Uma fase por vez. Cada fase produz evidência, atualiza este documento, faz commit e para. A próxima fase só é liberada após revisão dos auditores.

## Estado atual

- **Fase 0:** 🟡 parcial/histórica; evidência original não recuperável.
- **Fase 1:** 🔴 concluída com bloqueadores.
- **Fase 2:** 🔵 próxima fase operacional.

## FASE 1 — RESULTADO

A auditoria de contratos e data lineage foi executada sobre o `main` reconciliado.

Artefatos:
- `docs/audit/PHASE-1-CONTRACT-LINEAGE-AUDIT.md`
- `docs/audit/E2E-CONTRACT-MAP.md`

### Bloqueadores encontrados

1. `payment_orders` existe com FK para `cases`/`auth.users` e `case_id UNIQUE`, mas possui **0 registros** no Supabase atualmente auditado; o fluxo atual não comprovou persistência da ordem.
2. `documents` existe, mas não há FK identificada de `documents.case_id` para `cases.id`; o fluxo de geração não comprovou criação/associação de documento persistido.
3. `cases` e `documents` estão com RLS desabilitado no Supabase atualmente auditado.
4. O adapter de geração transforma uma resposta HTTP bem-sucedida em `status: 'ready'` sem exigir documento/URL real.
5. O webhook mantém pagamento confirmado quando a geração automática falha, sem contrato explícito de recuperação/document-status para o usuário.
6. `analysis.id` está embutido em `cases.analysis_json`, sem entidade relacional independente ou vínculo persistente inequívoco entre a análise exibida e a análise que autoriza o documento.
7. Claim token tem geração server-side forte, mas expiração, revogação e uso único não foram comprovados.
8. Existem artefatos históricos de Storage apontando para outro projeto Supabase; não são evidência do ambiente atual.

### Pontos considerados corretos

- onboarding frontend único em `src/onboarding/`;
- `case_id` server-side com UUID aleatório;
- ownership por UUID canônico;
- persistência de caso write-through/fail-closed;
- autoridade de teses no `DocumentAssemblyEngine` derivada da análise canônica.

**Regra:** nenhuma correção de produto foi aplicada na Fase 1.

## FASE 2 — CORREÇÃO DOS BLOQUEADORES

**Próxima fase autorizada.**

Escopo mínimo:
- persistência de `payment_orders` ligada ao caso/usuário/referência;
- identidade documental real, FK/lineage e storage/URL;
- remoção de status sintético `ready`;
- recuperação após pagamento confirmado sem documento;
- RLS de `cases` e `documents`;
- identidade/versionamento da análise autorizadora;
- ciclo de vida do claim token;
- decisão sobre o namespace backend `/api/onboarding-v2/*`.

**Não executar Fase 3/4 automaticamente.**

## FASES 3–8

Permanecem `🟠 PENDING` até revisão da Fase 2 e posterior liberação.

## REGRA DE PARADA

A Fase 1 está encerrada. O próximo agente deve executar somente a Fase 2 quando ela for formalmente liberada.
