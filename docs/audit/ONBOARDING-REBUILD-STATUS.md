# ONBOARDING — REBUILD STATUS

## Estado atual

- [x] Estratégia de rebuild greenfield definida
- [x] Legado congelado
- [x] Regra de zero reutilização integral definida
- [x] Plano reduzido a 8 fases
- [x] Fase 1 — congelamento
- [x] Fase 2 — definir o que fica
- [ ] Fase 3 — novo contrato
- [ ] Fase 4 — nova arquitetura
- [ ] Fase 5 — reescrita
- [ ] Fase 6 — integrações reais
- [ ] Fase 7 — validação completa
- [ ] Fase 8 — ativação e remoção do legado

## Entregável da Fase 2

`docs/audit/ONBOARDING-REBUILD-F2-DEFINICAO.md`

A Fase 2 separou requisitos reais, regras indispensáveis e UX útil do comportamento acidental do legado. O resultado é uma especificação para o greenfield; nenhum código legado foi reutilizado.

## Decisões principais

- O caso canônico e seus dados essenciais permanecem como fundamento do fluxo.
- Coleta condicional permanece como requisito, mas será reimplementada por regras explícitas.
- Análise jurídica canônica permanece no backend/domínio; frontend não é autoridade jurídica independente.
- Evidências/OCR permanecem como necessidade, mas somente conteúdo real será aceito como evidência.
- Qualificação do requerente permanece necessária para geração.
- Pagamento e geração serão tratados como estados distintos e verificáveis.
- Claim será baseado em token real e contrato único.
- Persistência do caso será fonte de verdade; browser storage não será autoridade de negócio.
- UX mobile-first, fluxo guiado, navegação segura e revisão antes da geração permanecem como princípios.
- Timers de simulação, scores sem calibração apresentados como probabilidade, fallbacks silenciosos, duplicações, compatibilidades históricas e etapas sem justificativa foram descartados.
- Quantidade e nomenclatura dos steps permanecem abertas para a Fase 3.

## Próxima fase

**FASE 3 — DESENHAR O NOVO CONTRATO**
