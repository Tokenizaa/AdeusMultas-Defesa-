# Correção 06 — simplificação da tela de resultado da análise gratuita

**Escopo:** exclusivamente a tela `FreeAnalysisResultStep` e a documentação desta tarefa no Marco Zero. Não alterar etapas anteriores, motor jurídico, fluxo de navegação geral, checkout, persistência, nem publicar em produção.

**Objetivo de produto:** reduzir confusão e desistência no momento em que o usuário recebe o diagnóstico, deixando claro o que foi possível verificar e oferecendo uma próxima ação comercial simples, sem prometer êxito jurídico nem mascarar falhas técnicas.

## Decisões de experiência

1. Priorizar uma conclusão em português simples, depois os principais achados e, por fim, a próxima ação.
2. Remover da tela principal o excesso de explicações técnicas, o telefone de contato e indicadores numéricos de “força/probabilidade” que possam ser interpretados como previsão estatística.
3. Distinguir três estados:
   - **Achados identificados:** há pontos/argumentos retornados pela análise.
   - **Análise inconclusiva:** não há tese confirmada ou existem lacunas de dados; não afirmar que a multa está correta.
   - **Falha técnica:** somente quando o domínio informar explicitamente falha; não disfarçar erro como resultado jurídico.
4. Exibir no resumo apenas identificação mínima, conclusão, até três achados em linguagem simples, prazo se disponível e uma ação principal para continuar preparando a defesa.
5. Manter detalhes técnicos/jurídicos e informações da autuação em seção recolhida/ secundária.
6. Preservar a ação de salvar no painel e o retorno para corrigir os dados.
7. Não afirmar que protocolar antes do prazo garante efeito suspensivo; não generalizar que toda defesa é protocolada no DETRAN ou online.
8. A oferta de continuidade deve ser clara, sem garantir cancelamento, êxito ou outro resultado dependente do órgão público.

## Estado anterior confirmado por leitura estática

- Arquivo principal: `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`.
- A tela mistura indicador numérico, completude do formulário, cartões de infração, explicações longas por tese e três instruções de próximos passos.
- A mensagem de indisponibilidade da base jurídica é exibida no mesmo ramo que “sem teses”, misturando ausência de achados com indisponibilidade.
- O cabeçalho expõe número do auto, placa e WhatsApp juntos.
- A instrução de prazo afirma genericamente que protocolar antes garante efeito suspensivo.
- A seção “O que conferimos” conta as teses exibidas, não as verificações executadas.
- O tipo `CaseAnalysis` oferece `status`, `detectedInconsistencies`, `dataGaps`, `procedureDeadline`, `summaryReasoning`, `evaluatedRules`, `recommendedProcedure` e `competentBody`; a tela precisa evitar inventar significado para campos ausentes.

## Critérios de aceitação

- [ ] A primeira dobra prioriza conclusão, achados principais e uma CTA principal.
- [ ] Os estados “achados identificados”, “inconclusivo” e “falha técnica explicitamente informada” não se confundem.
- [ ] Nenhum percentual é apresentado como probabilidade de êxito.
- [ ] Não há promessa geral de efeito suspensivo nem instrução universal de protocolar no DETRAN/online.
- [ ] Sem achados, a tela explica que isso não confirma que a multa está correta e permite continuar.
- [ ] Lacunas de dados são explicadas sem serem tratadas como irregularidades comprovadas.
- [ ] Detalhes jurídicos permanecem acessíveis sem ocupar o primeiro plano.
- [ ] Os handlers e IDs usados na navegação para voltar, salvar e continuar são preservados.
- [ ] Testes, typecheck e build são executados; resultados reais e eventuais bloqueios são registrados.
- [ ] Nenhum deploy de produção é iniciado por esta tarefa.

## Implementação e validação

**Status inicial:** em execução. A documentação descreve o contrato antes da mudança; completar esta seção depois das alterações e verificações.

- Arquivos alterados:
- Testes executados:
- Typecheck/build:
- Resultado CI:
- Pendências:
- Commit SHA:
- Próxima ação autorizada: validar a tela em ambiente de desenvolvimento e revisar o fluxo completo da análise; produção continua bloqueada até autorização explícita.
