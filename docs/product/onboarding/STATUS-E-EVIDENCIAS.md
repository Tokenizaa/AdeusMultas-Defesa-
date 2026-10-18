# Status e evidências — reconstrução do onboarding

**Atualizado:** 2026-10-17  
**PR documental:** [#37 — formalizar reconstrução do onboarding](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/37)

## Estado decidido

- [x] Fase 1 — compreender e classificar o legado: **CONCLUÍDA**.
- [x] Decisão do que preservar, reutilizar, reescrever, substituir e descartar documentada.
- [x] Legado identificado como referência congelada, sem plano de corrigi-lo antes do rebuild.
- [x] Linha greenfield existente identificada: `onboarding/rebuild-canonico-clean`.
- [x] Documentação de execução ajustada para continuar a implementação greenfield existente, sem criar uma segunda UI paralela.
- [ ] Fase 6 da linha greenfield — concluir integrações reais.
- [ ] Fase 7 — validar fluxo completo, contratos e documentos.
- [ ] Fase 8 — ativação controlada e arquivamento final do legado.

## Decisão de reaproveitamento

Consulte [FASE-1-DECISAO-PRESERVACAO.md](./FASE-1-DECISAO-PRESERVACAO.md) para a matriz completa.

**Preservar como requisitos de produto:** fluxo guiado e mobile-first; botões e escolhas claros; perguntas condicionais; possibilidade de voltar e revisar; confirmação dos dados extraídos; qualificação antes da geração; distinção explícita entre análise, pagamento e documento pronto.

**Reutilizar por fronteira canônica, não copiando a UI:** modelo de caso, `CaseDomain`, `CanonicalMapper`, motor determinístico/regra jurídica no backend, serviço OCR existente e Quality Gate após revisão de contratos.

**Reescrever:** composição e estado da jornada, coleta condicional, contratos do frontend, retomada, tratamento de erro, confirmação OCR, qualificação e orquestração de pagamento/geração.

**Descartar do novo onboarding:** wizard, steps, hooks, stores e services específicos do legado; timers que simulam progresso; pontuação fixa apresentada como probabilidade; sucesso presumido/fallback silencioso; defaults fictícios como dados reais; duplicação de estado e contratos de compatibilidade sem dependência comprovada.

## Linha greenfield existente

A branch `onboarding/rebuild-canonico-clean` tem documentação que marca Fases 1–5 concluídas e Fase 6 em andamento. A Fase 6 registra draft anônimo com claim token real, adapter HTTP próprio, upload de imagem e integração OCR por `ocrService`/`CanonicalMapper`. Também registra pendências: PDF, claim autenticado definitivo, qualificação persistida, pagamento, geração e testes automatizados do fluxo.

Referências:
- [Status do rebuild greenfield](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-STATUS.md)
- [Fase 2 — definir o que fica](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-F2-DEFINICAO.md)
- [Fase 3 — contrato](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-F3-CONTRATO.md)
- [Fase 4 — arquitetura](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-F4-ARQUITETURA.md)
- [Fase 6 — integrações](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-F6-INTEGRACAO.md)

Essa linha é a candidata de continuação, mas suas próprias notas deixam claro que Fase 6 ainda não está validada e que pagamentos/geração estão incompletos. Não declarar o novo onboarding pronto para produção.

## Achados do legado que devem ser evitados

A inspeção estática de `main` encontrou incompatibilidade entre o payload OCR da UI e o contrato do Worker, progresso de análise baseado em timers e valores fixos em `overallSuccessRate` sem calibração demonstrada. Há também valores de contato iniciais de exemplo e recuperação de sessão cuja reidratação não está comprovada.

Esses achados servem para orientar o novo desenho; não justificam corrigir o legado nem impedem o encerramento da Fase 1. Build, testes, correlação com produção e E2E são verificações da nova implementação antes da ativação.

## Segurança e limites

- Nesta atualização foram alterados somente documentos na branch `docs/onboarding-rebuild-plan`.
- Nenhum código de produto, banco, migração, deploy ou cobrança foi alterado/executado.
- A branch legada permanece preservada; não foi apagada nem modificada.
- Não houve inspeção do checkout WSL nesta sessão. Ao retomar execução local, preservar alterações, arquivos não rastreados e stashes; isso não reabre a triagem do legado.
- Arquivamento final do legado deve ocorrer somente depois da ativação controlada e confirmação de rollback, sem apagar a branch de referência prematuramente.

## Próxima ação

Continuar a Fase 6 da linha `onboarding/rebuild-canonico-clean`: concluir contratos e integrações pendentes, em especial qualificação, claim autenticado, PDF, pagamento e geração documental. Depois validar o fluxo completo na implementação nova. Não reconstruir outra UI em paralelo e não portar código específico do wizard antigo.
