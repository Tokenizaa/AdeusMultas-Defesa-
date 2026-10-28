# Correção 02 — Preenchimento integral do formulário de identificação

## Objetivo

Tornar confiável o botão **“Preencher com dados de teste”** visível exclusivamente para administradores na etapa de identificação do onboarding. O botão deve preencher todos os campos necessários para avançar, além dos campos de datas e dados derivados exibidos no formulário, mantendo coerência entre categoria, código de infração e dados do catálogo.

## Escopo

Incluído:
- Fixture única e reutilizável para o preenchimento de teste da etapa 4.
- Preenchimento de nome, telefone, placa, AIT, código, órgão autuador, data da ocorrência, datas da notificação/prazo e local completo.
- Preenchimento coerente de artigo, descrição, gravidade, pontos e valor da multa a partir do catálogo.
- Sincronização dos campos locais de nome/telefone quando o estado do wizard for atualizado externamente.
- Testes unitários cobrindo todas as categorias configuradas.

Fora do escopo:
- Executar análise jurídica ou avançar automaticamente para outras etapas.
- Alterar validações de produção, regras jurídicas, OCR, backend, banco de dados ou pagamento.
- Publicar/deployar a aplicação.

## Diagnóstico e correção

O preenchimento de dados estava distribuído dentro do handler do componente, enquanto a cobertura de teste validava principalmente o gerador específico da infração. Isso deixava sem teste direto o contrato completo entre o botão e os campos obrigatórios da tela.

Alterações:
- **src/components/onboarding/testFillData.ts**: adicionada `buildCompleteTestIdentificationFixture`, que monta um conjunto completo e consistente de dados para o formulário.
- **src/components/onboarding/steps/InfractionIdentificationStep.tsx**: o botão passa a usar a fixture compartilhada; endereço inclui via, número, bairro e cidade/UF. Os campos locais de contato acompanham atualizações das props.
- **src/components/onboarding/testFillData.test.ts**: adicionados testes de completude para nove categorias e teste de regressão para código/artigo/descrição antigos incompatíveis.

A fixture não submete o formulário nem dispara a análise. Ela apenas preenche os estados; a pessoa administradora continua podendo revisar os valores e clicar em “Continuar para Perguntas do Caso”.

## Critérios de aceitação

- [x] O botão continua condicionado à propriedade administrativa existente.
- [x] O fixture preenche os campos que habilitam o avanço da etapa 4.
- [x] Datas da ocorrência, expedição, entrega e prazo são geradas em formato ISO válido para os controles.
- [x] Código, artigo, descrição, gravidade, pontos e multa vêm do mesmo item do catálogo.
- [x] Os testes automatizados cobrem nove categorias e a substituição de dados derivados obsoletos.
- [ ] CI (Vitest, typecheck e build) confirmado após estes commits.
- [ ] Navegação visual no navegador e clique real no botão confirmados.
- [ ] Deploy em produção: não realizado.

## Evidências e commits

- **src/components/onboarding/testFillData.ts**: commit `3dcd5631f1909c166d1e23064a05b2e19fc2fe49`.
- **src/components/onboarding/steps/InfractionIdentificationStep.tsx**: commit `2b42027a98785149b0fe0bc5d3f0d98a0f27c7ef`.
- **src/components/onboarding/testFillData.test.ts**: commits `c81b7d6af7643c781bb899705cada95d0dec2744` e `87c33273c31a4d1331e5eca3cadb2e1b47c4f950`.

**Estado atual:** implementação registrada; validação automatizada pós-alteração e confirmação visual ainda pendentes. Não declarar PASS até obter essas evidências.