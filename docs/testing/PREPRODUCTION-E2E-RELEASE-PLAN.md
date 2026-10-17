# Certificação E2E pré-produção — AdeusMultas

**Estado:** especificação de execução; não significa que testes tenham sido executados ou aprovados.  
**Escopo:** este repositório e ambiente de teste isolado.  
**Branch de trabalho inicial:** `integration/preproduction-e2e-gates`.

## Objetivo
Certificar os fluxos finais antes de produção por baterias sequenciais de serviço. Os 70 cenários são uma meta de inventário a confirmar no código; não presumir a distribuição nem afirmar que a suíte é completa sem enumerar todos os casos.

## Organização local
- Agentes: `.opencode/agents/e2e-*.md`
- Skills: `.opencode/skills/preproduction-e2e-release/SKILL.md` e skills especializadas E2E adjacentes.
- As instruções valem somente neste projeto. Não criar nem alterar agentes/skills globais. O supervisor global pode orquestrar o projeto, mas a lógica de certificação fica versionada aqui.

## Gates por bateria
1. Inventário e expectativa dos cenários confirmados.
2. Ambiente isolado e pagamentos simulados confirmados.
3. Execução completa e evidências preservadas.
4. Análise e procedimento coerentes com fatos.
5. Minuta: score Quality Gate >=90 e sete controles obrigatórios aprovados.
6. Frontend: fluxo funcional real e apresentação validada.
7. Segurança, isolamento, idempotência, desempenho e recuperação avaliados conforme aplicável.
8. Defeitos corrigidos e retestados; decisão registrada.
9. Próxima bateria só inicia após aprovação explícita.

## Bloqueios absolutos
- Fato inventado ou dados de outro caso em análise/minuta.
- Procedimento incompatível sem justificativa sustentada.
- Quality Gate abaixo de 90 ou qualquer controle obrigatório reprovado.
- Acesso entre usuários, vazamento de dados, perda/duplicação indevida ou liberação sem pagamento válido.
- Pagamento real durante E2E.
- Evidência insuficiente para qualquer controle crítico.
- Alteração ou limpeza de dados que não pertencem à execução atual.

## Métricas
Reportar denominadores e amostras: cenários previstos/executados/passaram/falharam/bloqueados; aprovação na primeira execução; falhas após reteste; score e sete controles por documento; defeitos frontend por severidade; erros de API; duração por operação e p50/p95/p99 quando amostra suficiente; falhas de isolamento; estados de pagamento e idempotência; limpeza comprovada.

Meta histórica de análise gratuita <3s p95 e score >=90 devem ser comparadas à especificação atual e ao Quality Gate real. Não inventar números, relaxar limites ou esconder skips.

## Entregáveis
1. `docs/reports/INVENTARIO-FUNCIONAL-FRONTEND-E2E.md`
2. `docs/reports/RELATORIO-VALIDACAO-FRONTEND-E2E.md`
3. `docs/reports/RELATORIO-APROVACAO-E2E-70-CENARIOS.md`
4. Evidências brutas versionadas apenas se apropriado; artefatos com dados pessoais/segredos devem ficar fora do Git e ser referenciados por caminho seguro.

## Decisão final
- **APROVADO:** todas as baterias e gates operacionais obrigatórios passaram com evidências.
- **REPROVADO:** ao menos um gate obrigatório falhou.
- **INCONCLUSIVO:** ambiente ou evidências insuficientes impedem afirmar aprovação.

A aprovação E2E não equivale a deploy. Deploy requer decisão e autorização próprias.
