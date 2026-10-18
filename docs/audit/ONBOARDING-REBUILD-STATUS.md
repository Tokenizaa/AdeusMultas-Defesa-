# Onboarding — estado do rebuild greenfield

**Atualizado:** 2026-10-18  
**Branch de implementação:** `onboarding/manual-intake-greenfield`  
**Produção:** não alterada.

## Decisão vigente

O onboarding novo coleta dados manualmente e **não usa OCR**. A pessoa informa cada fato com instruções sobre onde encontrá-lo; campos ausentes não são inferidos. A decisão está registrada em `docs/product/onboarding/DECISAO-ONBOARDING-MANUAL-SEM-OCR-2026-10-18.md`.

## Estado do trabalho

- [x] Revisar o estado real de `main`: a rota pública `/novo-caso` ainda usa `src/components/onboarding/OnboardingWizard.tsx`.
- [x] Confirmar que a antiga implementação `src/onboarding-v2/` foi removida anteriormente e não pode ser tratada como fluxo ativo.
- [x] Registrar a decisão canônica de coleta manual sem OCR.
- [x] Criar validação de entrada manual e testes unitários.
- [x] Criar primeira página greenfield de intake manual, sem upload ou chamada de OCR.
- [x] Disponibilizar a página somente na rota de preview `/novo-caso-rebuild` nesta branch.
- [ ] Validar lint, typecheck, testes e build em CI.
- [ ] Testar o POST real `/api/cases/anonymous` em ambiente de teste e verificar recuperação segura do caso.
- [ ] Completar a jornada greenfield: fatos condicionais, diagnóstico elegível, qualificação, revisão, pagamento confirmado e geração real.
- [ ] Cobrir falhas, claim anônimo, autorização negativa e recuperação após reload com E2E.
- [ ] Substituir `/novo-caso` somente após aprovação dos testes e revisão técnica/jurídica.

## Escopo entregue nesta fase

A nova página envia dados inseridos pelo usuário para `POST /api/cases/anonymous`, apresenta erro quando a API falha e só confirma registro quando recebe um identificador válido. Guarda apenas o identificador do caso e o claim token na sessão para facilitar recuperação; os dados do caso permanecem sob responsabilidade do backend.

A página **não exibe conclusões da análise jurídica**, não declara pagamento ou documento como concluídos e avisa que esta versão apenas confirma o registro dos dados. Isso é deliberado: a auditoria da base jurídica/RAG identificou problemas que precisam ser resolvidos antes de apresentar conclusões jurídicas como confiáveis.

## Limites de validação

Os arquivos foram alterados via GitHub nesta branch. Não foi executado ambiente local nesta sessão; portanto, lint, typecheck, build, E2E e integração real não são declarados aprovados até que o CI e testes de ambiente os comprovem.

Não houve deploy, migração ou alteração no banco Supabase.
