# ONBOARDING — REBUILD STATUS

## Estado atual

- [x] Estratégia de rebuild greenfield definida
- [x] Legado congelado
- [x] Regra de zero reutilização integral definida
- [x] Plano reduzido a 8 fases
- [x] Fase 1 — congelamento
- [x] Fase 2 — definir o que fica
- [x] Fase 3 — novo contrato
- [x] Fase 4 — nova arquitetura
- [x] Fase 5 — reescrita inicial da UI
- [ ] Fase 6 — integrações reais (em execução)
- [ ] Fase 7 — validação completa
- [ ] Fase 8 — ativação e remoção do legado

## F6 — integração real em execução

Entregue neste bloco:

- API greenfield isolada em `/api/onboarding-v2/*`.
- Criação de rascunho anônimo com `claimToken` real.
- Autorização por usuário autenticado ou claim token.
- Upload real de imagem pelo onboarding novo.
- OCR real conectado ao `ocrService`.
- Dados extraídos persistidos no caso canônico através do `CanonicalMapper`.
- Metadados do OCR persistidos em `ocrAuxiliaryData`.
- Falhas de OCR bloqueiam o avanço e não são convertidas em sucesso.
- Adapter HTTP mantém a fronteira aplicação → API; a UI não faz chamadas HTTP de negócio diretamente.

Documento detalhado: `docs/audit/ONBOARDING-REBUILD-F6-INTEGRACAO.md`.

## Pendências F6

- PDF real com pipeline compatível de extração/OCR.
- Claim autenticado definitivo após login.
- Qualificação persistida no contrato novo.
- Pagamento real.
- Geração real do documento.
- Testes automatizados do fluxo anônimo + claim + OCR.

## Regra arquitetural

O legado continua congelado e fora da implementação do novo onboarding. Nenhum componente, hook ou serviço do onboarding antigo é dependência do `onboarding-v2`.

## Validação

Os commits deste bloco ainda não possuem execução CI registrada. Não considerar F6 validada até build, testes e fluxo E2E serem executados.
