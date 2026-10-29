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

**Status:** implementação parcial registrada; validação automatizada e ponta a ponta pendentes. Não declarar PASS.

### Implementação realizada

- `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`
  - Simplificada a hierarquia: conclusão → principais pontos → prazo/próximo passo → detalhes recolhidos → ações.
  - Removidos score/percentual de êxito, animação numérica, indicador de completude e telefone do cabeçalho.
  - Separados visualmente resultado com achados, resultado sem achados e falha explicitamente marcada como `analysis.status === 'failed'`.
  - Até três pontos são mostrados inicialmente; a explicação jurídica fica recolhida por ponto.
  - Detalhes da autuação, resumo técnico, verificações registradas e lacunas de dados ficam em seção secundária.
  - Preservados os IDs `btn-back-to-edit-diagnosis` e `btn-proceed-to-document-generation` e os handlers de voltar, salvar e continuar.
  - Removida a promessa geral de efeito suspensivo e a orientação universal de protocolar no DETRAN/online.
- `src/components/onboarding/steps/onboarding-copy-regression.test.tsx`
  - Substituídas as expectativas antigas do resultado por sete verificações de regressão: hierarquia simples, ausência de score, detalhes recolhidos, estado sem achados, lacunas de dados sem falsa conclusão, ausência de promessa jurídica, falha técnica explícita e prazo apresentado como data informada.

### Evidência e validação

- **Inspeção estática do código:** concluída nesta execução; as mudanças ficaram restritas à tela de resultado e ao teste de regressão correspondente.
- **Testes Vitest:** BLOCKED — o teste foi atualizado, mas não foi executado nesta sessão.
- **Typecheck:** BLOCKED — não executado nesta sessão.
- **Build:** BLOCKED — não executado nesta sessão.
- **CI:** sem evidência de status/run acessível para estes commits pelo conector consultado; não declarar aprovação.
- **Teste visual mobile/desktop:** BLOCKED — não executado.
- **Deploy de produção:** não iniciado.

### Pendência importante

A tela só consegue exibir o estado técnico quando recebe `analysis.status === 'failed'`. A leitura de `AnalysisProcessingStep.tsx` mostrou que o `catch` atual registra a falha no console e o fluxo pode avançar sem encaminhar um estado de falha explícito. Para não ampliar esta tarefa, esse contrato upstream não foi alterado. Portanto, a distinção visual de falha está implementada, mas ainda não está comprovada ponta a ponta.

- **Commits de implementação:** `fbac44578f1780cf45fbba5f681073fac75f9271` (tela); `e81ac08e584f8db913b2ecc62e85ea6ab49452c0` (testes iniciais); `11c3618d781f996b9d2bced0a75da6446c460cb3` (ajuste do estado de falha); `e5501391adaacffc7a7ca53f0405a999d99e5b17` (teste de lacunas de dados); `aa6e77b7762da774542565bf0ce1283f0d27458d` (detalhe jurídico recolhido); `dca35398721d60f231774bb54f7e66f903d21f07` (regressão do detalhe jurídico).
- **Próxima ação autorizada:** executar Vitest, typecheck e build; corrigir falhas relacionadas à tarefa; validar os estados em mobile/desktop. Depois, avaliar separadamente a passagem explícita de falha de `AnalysisProcessingStep` para o resultado. Produção continua bloqueada até autorização explícita.
