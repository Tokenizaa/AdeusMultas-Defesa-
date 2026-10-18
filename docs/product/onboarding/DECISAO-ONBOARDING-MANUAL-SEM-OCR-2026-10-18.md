# Decisão canônica: onboarding manual, sem OCR

**Data:** 2026-10-18  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Estado:** decisão de produto vigente para o rebuild greenfield.

## Decisão

O novo onboarding não utiliza OCR para coletar ou preencher os dados do caso. A pessoa informa os dados manualmente em campos com instruções claras e exemplos. As perguntas adicionais devem ser condicionais ao tipo de procedimento e às informações já fornecidas.

A decisão é definitiva para o fluxo de onboarding: não implementar OCR como etapa, fallback ou requisito para continuar.

## Motivo

Os documentos variam por órgão, estado, município, procedimento e formato. Não há garantia de estrutura uniforme; a extração automática introduz risco de corrupção, omissão e atribuição de fatos incorretos. A coleta explícita permite confirmar cada fato com o usuário e evita depender de leitura automatizada de documentos.

## Regras de implementação

- Não chamar serviços de OCR a partir do onboarding novo.
- Não enviar arquivos para extração automática de campos.
- Não inferir valores ausentes. Perguntar ao usuário ou registrar a lacuna.
- Para cada campo, explicar onde encontrar a informação e aceitar somente formatos definidos pelo contrato.
- Separar fatos informados, fatos confirmados, dados ausentes e conclusões derivadas.
- Persistir o caso no backend; browser storage não é a fonte de verdade do caso.
- Exibir análise jurídica somente quando as fontes e regras aplicadas atenderem aos critérios de elegibilidade e rastreabilidade. Se não atenderem, informar a limitação e não emitir conclusão categórica.
- Não ativar o novo fluxo em produção antes da validação de integração, segurança e E2E.

## Estado encontrado no repositório

Em 2026-10-18, `main` ainda renderiza `src/components/onboarding/OnboardingWizard.tsx` na rota pública `/novo-caso`. A implementação greenfield `src/onboarding-v2/` foi removida anteriormente e o registro da remoção documenta uma decisão de produto antiga. Essa decisão é substituída para o rebuild atual pela decisão explícita de reconstruir o onboarding e remover OCR. A nova implementação deve ser criada isoladamente e só substituir a rota ativa depois de passar pelos portões de validação.

## Critérios para concluir o rebuild

1. Captura manual com validação e instruções claras.
2. Criação e recuperação do caso persistido, incluindo fluxo anônimo e claim seguro.
3. Análise com proveniência verificável e abstinência quando a base não for elegível.
4. Qualificação, revisão, pagamento real e geração real com estados explícitos.
5. Testes unitários, integração, autorização negativa e E2E completos.
6. Ativação controlada, separada de qualquer alteração na base documental ou no banco de produção.
