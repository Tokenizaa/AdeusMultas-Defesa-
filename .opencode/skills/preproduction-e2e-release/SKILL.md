---
name: preproduction-e2e-release
description: Processo obrigatório de certificação E2E pré-produção do AdeusMultas com baterias sequenciais e gates de aprovação.
---
# Preproduction E2E Release

## Escopo
Esta skill é específica deste repositório. Seu local canônico é `.opencode/skills/preproduction-e2e-release/SKILL.md`. Nunca copiar para diretórios globais do usuário nem registrar como skill global.

## Fontes obrigatórias
Leia `.opencode/AGENTS.md`, `docs/testing/PREPRODUCTION-E2E-RELEASE-PLAN.md`, `docs/audit/E2E-INVENTARIO-CANONICO.md`, `docs/recovery/FASE-12-GOLDEN-DOCUMENT-ACCURACY-2026-09-25.md`, `.opencode/skills/agent-defesa-transito/SKILL.md` e `AUDIT_REPORT_FASE1.md` se disponível. Trate relatórios antigos como histórico a revalidar.

## Fase A — Pré-voo não destrutivo
1. Confirmar branch, commit, working tree e processos locais ativos; preservar trabalho de terceiros.
2. Confirmar ambiente e projeto Supabase de destino sem imprimir segredos.
3. Descobrir a matriz real de cenários, tipos de serviço, fixtures e comandos existentes. Confirmar distribuição; nunca presumir 7×10.
4. Confirmar isolamento, limpeza seletiva e `E2E_MOCK_PAYMENT=1`.
5. Definir expectativas verificáveis por cenário antes de executá-lo.
6. Documentar pré-condições e bloqueios. Não criar dados se o ambiente não estiver seguramente isolado.

## Fase B — Baterias sequenciais
Para cada tipo de serviço, executar seus cenários previstos e coletar evidências. Só passar ao próximo tipo após aprovação formal da bateria atual. Uma bateria falha quando algum cenário/controle obrigatório falha, não foi executado ou carece de evidência.

Em cada bateria, verificar:
- funcionalidade ponta a ponta e persistência;
- precisão da análise e adequação do procedimento;
- minuta com score do Quality Gate >=90 e todos os sete controles obrigatórios aprovados;
- fontes e argumentos pertinentes, ausência de fatos inventados e contaminação;
- frontend, formulários, modais, navegação, estados de erro/loading, responsividade e acessibilidade aplicável;
- isolamento/autorização, privacidade e integridade;
- pagamento simulado/idempotência;
- desempenho e recuperação quando aplicáveis;
- logs, screenshots e artefatos rastreáveis.

Corrigir no escopo autorizado, guardar evidência pré-correção, repetir testes afetados e regressões pertinentes. Não enfraquecer assertions nem alterar fixtures para ocultar defeitos. Validação deve ser independente de quem implementou a correção.

## Fase C — Encerramento
Depois de todas as baterias, executar checklist operacional de pré-produção (CI/build/testes relevantes, segurança, pagamentos, monitoração/alertas, rollback e configuração), sem fazer deploy. Registrar cada item como aprovado, reprovado, não verificado ou não aplicável, com justificativa.

Limpar somente os dados sintéticos criados pela execução atual e comprovar preservação de administradores e casos de referência. Não executar limpeza ampla nem apagar dados por heurística.

## Decisão
- APROVADO: todos os cenários e controles obrigatórios passaram com evidência; nenhum bloqueio crítico/alto sem mitigação formal aprovada.
- REPROVADO: existe falha confirmada de controle obrigatório.
- INCONCLUSIVO: ambiente, acesso ou evidência insuficiente impede a conclusão.
A nota média nunca compensa falha jurídica, acesso cruzado, vazamento, cobrança indevida ou geração de documento com dados incorretos.
