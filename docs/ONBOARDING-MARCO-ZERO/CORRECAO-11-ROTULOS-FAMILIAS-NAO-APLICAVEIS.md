# Correção 11 — rótulos humanos para famílias não aplicáveis

**Data:** 2026-10-29  
**Branch:** `main`  
**SHA inicial de referência:** `4ba8718290fd8c1ad51c76ee861e7888fa25093c`  
**Commit de implementação:** `9402991fe5125e8ebc49899675acd794db2fa09d`  
**Commit do teste de regressão:** `d584900903593a54dc1c1c4afbaff22edc59768c`  
**Status:** alteração e teste registrados; execução de CI ainda não confirmada nesta verificação. Não houve deploy de produção.

## 1. Problema identificado antes de novo relato de produção

O classificador canônico declara onze famílias de infração em `src/core/rules/infraction-classifier.ts`: `excesso_velocidade`, `alcoolemia`, `semaforo`, `celular`, `estacionamento`, `cinto`, `documentos`, `circulacao`, `capacidade`, `lotacao` e `desconhecida`.

A função `formatRuleReason` de `FreeAnalysisResultStep.tsx` traduzia apenas parte delas. Quando uma verificação não aplicável trazia uma família sem rótulo, a interface usava o identificador interno como fallback, por exemplo `circulacao`, `capacidade` ou `lotacao`. Isso viola o contrato de linguagem simples da tela de resultado.

## 2. Correção

Em `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`:

- O mapa de famílias agora cobre todas as famílias do tipo canônico.
- O mapa de categorias agora cobre todos os valores de `InfractionCategory`.
- A lista de famílias é formatada com vírgulas e conjunção final, evitando a repetição mecânica de “e”.
- O fallback para valores inesperados continua legível, substituindo underscores por espaços; valores conhecidos não dependem desse fallback.

Em `src/components/onboarding/steps/onboarding-copy-regression.test.tsx`:

- Adicionado teste de renderização para uma regra não aplicável contendo famílias variadas, inclusive as que não tinham rótulo.
- O teste exige a mensagem humanizada e proíbe a exposição dos identificadores internos usados na fixture.

## 3. Critérios de aceitação

- [x] A implementação cobre os identificadores conhecidos no classificador e na categoria do onboarding.
- [x] Foi adicionado teste de regressão sobre HTML renderizado.
- [ ] Executar o teste de regressão no CI do SHA atual.
- [ ] Confirmar em navegador que as verificações não aplicáveis são compreensíveis em desktop e mobile.
- [ ] Reexecutar análise nova em produção após autorização e confirmar o texto realmente servido. Não reutilizar resultado antigo.

## 4. Validação e limites

A leitura estática confirmou a causa e a implementação foi registrada na branch canônica. O status do GitHub não retornou checks associados ao SHA no momento da consulta; por isso, CI permanece **PENDENTE**, não PASS. Não foi executado navegador nem E2E nesta tarefa.

Esta correção resolve a tradução de nomes de famílias conhecidas. Não certifica a correção de todos os motivos de regras, o contrato de análise cliente/servidor, a coleta de dados ausentes ou o onboarding completo.

## 5. Próxima investigação preventiva

A próxima tarefa deve mapear a coleta de `notificationDeliveryDate`: o motor registra uma lacuna quando há data de expedição mas não há data de entrega, porém a jornada de onboarding precisa ser verificada para confirmar se oferece ao usuário um campo real para informar esse dado. A ausência do campo não deve ser convertida em prova de não entrega nem em vício confirmado.
