# Fase 1 — Conclusão: o que aproveitar do legado

**Data:** 2026-10-17  
**Status:** **CONCLUÍDA para o objetivo de reconstrução greenfield**.  
**Decisão:** o onboarding antigo será tratado como legado congelado; não será corrigido nem usado como base estrutural do novo fluxo.

## Decisão principal

A Fase 1 não exige build, testes de regressão do onboarding antigo nem prova de equivalência com produção. O propósito é compreender o legado, separar requisitos de implementação e dar uma decisão clara para o rebuild. O legado será arquivado após a ativação do novo fluxo, seguindo o processo de release/rollback; até lá, sua branch de referência permanece preservada.

O congelamento já registrado em `docs/audit/ONBOARDING-REBUILD-FREEZE.md` aponta a branch `legacy/onboarding-frozen-2026-09-07` e o commit `a4c9ecb0caeabda8603535fa0160cdb5c01d5e02`. A branch `onboarding/rebuild-canonico-clean` já contém trabalho greenfield posterior: Fases 1–5 marcadas como concluídas e Fase 6 iniciada, conforme [status do rebuild](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-STATUS.md). Portanto, não devemos criar uma segunda implementação paralela: o próximo trabalho deve continuar a linha greenfield existente, após conferir o estado atual dela.

## Matriz de decisão

| Área encontrada no legado | Decisão | O que atravessa para o novo modelo |
|---|---|---|
| Wizard/container e roteamento de etapas | **DESCARTAR como implementação** | Apenas a necessidade de orientar o usuário por uma jornada clara. Recriar estado, transições e composição sem importar o wizard antigo. |
| Botões grandes, escolhas guiadas, perguntas condicionais, voltar/revisar e progresso visual | **PRESERVAR como requisitos de UX** | Padrões aprovados: mobile-first, uma decisão por vez, linguagem simples, etapas curtas, navegação segura e revisão antes de gerar. Progresso deve refletir operações reais. |
| Tipos, stores, hooks e services específicos do onboarding antigo | **NÃO REUTILIZAR** | Criar contratos e estado de jornada próprios. Não importar `src/components/onboarding`, hooks ou stores do fluxo antigo. |
| Caso canônico / `CaseDomain` / `CanonicalMapper` | **REUTILIZAR na fronteira de domínio** | O caso persistido permanece a fonte de verdade. Integrar por contratos explícitos; não criar cópia paralela do caso nem reimplementar persistência sem necessidade. |
| Rule Engine determinístico e catálogo de regras | **REUTILIZAR no backend/domínio, não duplicar na UI** | Manter regras, argumentos e `DATA_GAP` como base canônica quando aplicáveis. Não expor `overallSuccessRate` como probabilidade sem calibração demonstrada. |
| Perguntas específicas por tipo de infração | **REESCREVER** | Preservar a necessidade de coleta condicional, mas expressar regras e campos em especificação explícita, sem copiar a matriz de UI antiga. |
| OCR e anexos | **REUTILIZAR serviço de OCR; SUBSTITUIR integração antiga** | Enviar conteúdo real do arquivo, validar formato/tamanho, tratar erro explicitamente, registrar metadados e pedir confirmação humana quando necessário. Nome do arquivo nunca substitui bytes. A implementação greenfield já registra integração de imagem via `ocrService`; PDF permanece pendente na documentação da F6. |
| Análise e progresso temporizado | **DESCARTAR timers e simulações** | Usar estado real da operação (`pending/processing/completed/failed`). A análise jurídica pertence ao backend/domínio. Falha não avança como sucesso. |
| Persistência local da jornada | **SUBSTITUIR como fonte de verdade** | Persistência do caso no backend; browser storage só pode guardar metadados mínimos de retomada, nunca substituir o estado canônico nem armazenar PII desnecessária. |
| Caso anônimo e recuperação posterior | **PRESERVAR necessidade; REIMPLEMENTAR contrato** | Rascunho anônimo com token de claim emitido pelo backend; `caseId` e `claimToken` são distintos. A linha greenfield documenta API `/api/onboarding-v2/*` e claim token real. |
| Autenticação/claim | **REUTILIZAR identidade canônica; SUBSTITUIR fluxo antigo** | Backend valida identidade e claim; nunca inferir token a partir do ID do caso. |
| Qualificação do requerente | **PRESERVAR necessidade; REESCREVER validação** | Coletar e validar dados exigidos para a peça no momento correto; não aceitar valores fictícios como dados reais. |
| Revisão da minuta | **PRESERVAR requisito** | Permitir conferência dos dados e do conteúdo antes de finalizar, com edição rastreável. |
| Pagamento e geração do documento | **REUTILIZAR serviços canônicos quando compatíveis; SUBSTITUIR orquestração antiga** | Estados distintos e verificáveis: pagamento aprovado não equivale a documento pronto; geração só começa após confirmação válida. A F6 greenfield ainda registra pagamento e geração como pendências. |
| Quality Gate de documento | **REUTILIZAR como controle estrutural após revisão de contrato** | Manter bloqueio explícito quando o gate reprovar. Não interpretar gate técnico como certificação jurídica nem garantia de deferimento. |
| Defaults fictícios, fallbacks silenciosos e sucesso presumido | **DESCARTAR** | Dados ausentes permanecem ausentes; erro, desconhecido e contradição têm estados explícitos. |
| Compatibilidade histórica e duplicações de estado | **DESCARTAR salvo dependência comprovada** | Não transportar compatibilidade só porque existe no legado. Adicionar apenas se uma integração real exigir e estiver documentada. |

## Decisões de arquitetura já registradas na linha greenfield

Os documentos anteriores já definem a direção que deve ser mantida:

- [Fase 2 — Definir o que fica](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-F2-DEFINICAO.md): separa requisitos de UX/regras dos componentes legados.
- [Fase 3 — Novo contrato](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-F3-CONTRATO.md): define estado da jornada, operações e fronteira do caso canônico.
- [Fase 4 — Nova arquitetura](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-F4-ARQUITETURA.md): separa UI, aplicação, API e domínio.
- [Fase 6 — Integração](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/onboarding/rebuild-canonico-clean/docs/audit/ONBOARDING-REBUILD-F6-INTEGRACAO.md): registra draft anônimo, claim token, upload de imagem e integração OCR, mas também explicita pendências de PDF, claim autenticado, qualificação, pagamento, geração e testes automatizados.

Esses documentos demonstram que o rebuild greenfield não está no zero absoluto. A linha `onboarding/rebuild-canonico-clean` deve ser tratada como a principal candidata a continuação, não como implementação automaticamente pronta para produção.

## Achados do legado que NÃO devem virar barreiras para esta fase

A auditoria estática encontrou incompatibilidade no contrato OCR, progresso com timers e pontuação fixa apresentada como êxito. Esses achados justificam não transportar a implementação antiga, mas não exigem corrigir o legado. O novo modelo deve nascer sem esses comportamentos.

Build, testes, verificação do deployment ativo e E2E são tarefas da validação da nova implementação, não critérios para declarar concluída a triagem do legado. A validação posterior deve incidir no código greenfield e no fluxo que será ativado.

## Encerramento da Fase 1

- [x] Legado de referência identificado e congelado.
- [x] Fronteira entre legado e greenfield estabelecida.
- [x] Elementos de UX a preservar separados de código a descartar.
- [x] Serviços de domínio potencialmente reutilizáveis identificados.
- [x] Principais defeitos do fluxo antigo registrados para não os transportar.
- [x] Linha greenfield existente identificada para continuação.
- [x] Próxima ação definida: continuar a Fase 6 da linha greenfield existente, sem iniciar outra UI paralela.

**Fase 1 encerrada.** Nenhum código do onboarding legado deve ser corrigido ou transplantado. A continuação é o trabalho greenfield já existente. A validação e ativação do novo fluxo permanecem fases posteriores; isso não reabre a Fase 1.
