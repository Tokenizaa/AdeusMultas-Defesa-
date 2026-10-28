# Correção 03 — UX dos dados de radar e campo de data INMETRO

**Status:** implementação commitada; validação automatizada falhou no CI; deploy não realizado por falha anterior à etapa de build/deploy; teste manual do usuário pendente no momento deste registro.  
**Commit de código:** [396a7aae30a0987f5ccd7adf8aa39896bd36d481](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/396a7aae30a0987f5ccd7adf8aa39896bd36d481)  
**Arquivo alterado:** `src/components/onboarding/steps/SpecificInfractionDataStep.tsx`

## Objetivo

Evitar que o usuário desista por não encontrar informações de aferição do INMETRO na notificação, corrigir o binding de data e remover uma afirmação jurídica categórica que poderia induzir a uma conclusão sem verificar os documentos e as regras aplicáveis.

## Escopo

Incluído:
- deixar data da aferição e número de equipamento/laudo opcionais;
- orientar o usuário a continuar se não tiver esses dados;
- remover a alegação de que aferição com mais de 12 meses seria, por si só, argumento forte;
- corrigir o campo HTML `type="date"` para trabalhar diretamente com ISO `YYYY-MM-DD`.

Fora do escopo:
- afirmar que o radar é irregular ou que a multa é inválida;
- mudar critérios legais gerais, fluxo backend, OCR ou persistência;
- considerar fixture de teste como dado real;
- declarar o fluxo de ponta a ponta aprovado.

## Implementação registrada

1. Rótulo da data: **Data da aferição do INMETRO (opcional)**.
2. Texto de ajuda explica que a pessoa pode deixar em branco e continuar.
3. Rótulo do número do equipamento/laudo também indica que é opcional.
4. Removido texto que tratava aferição acima de 12 meses como argumento forte sem contexto.
5. O input de data recebe `infractionData.inmetroAferitionDate || ''` e grava `e.target.value` sem conversões incompatíveis de formato.

## Evidência de código e teste

- O botão de teste usa `buildCoherentTestInfraction(category, infractionData)`.
- Os testes unitários existentes para a fixture de velocidade verificam limite, velocidade medida, velocidade considerada, data ISO e identificador de equipamento.
- Isso comprova a intenção/saída da fixture, mas não prova sozinho que o clique na interface atualiza os inputs corretamente. O teste de UI manual/E2E permanece separado.

## CI e deploy — estado consultado em 2026-10-28

- [CI/CD Pipeline — run 40782524806](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524806): **FAIL**. Job `test-unit` falhou no passo “Run unit/audit tests (vitest)”; typecheck e build foram pulados. A listagem de jobs não fornece o detalhe do erro de teste; precisa abrir os logs do workflow para identificar o teste específico.
- [Cloudflare Deploy — run 40782524758](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782524758): **FAIL**. O passo “Discover canonical E2E matrix (read-only)” falhou; os testes seguintes e o build/deploy foram pulados. A falha anterior documentada envolve a descoberta da matriz canônica E2E (esperava cenários canônicos por serviço, mas não os encontrou). Confirmar a mensagem exata nos logs desse run antes de alterar o workflow.
- Novos workflows foram iniciados pelas alterações de documentação:
  - [CI/CD Pipeline — run 40782882801](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782882801), commit `f479d3e1`: estava `in_progress` na última consulta.
  - [CI/CD Pipeline — run 40782928525](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40782928525), commit `a6487630`: estava `in_progress` na última consulta.
  Esses workflows de documentação não alteram a conclusão de falha dos workflows do commit funcional; consultar o estado final antes de fechar a tarefa.

## Validação manual — aguardando o usuário

O usuário informou que vai testar a tela localmente. Registrar o resultado, distinguindo ambiente local de produção. Verificar:
- [ ] data e número INMETRO vazios não bloqueiam o avanço;
- [ ] botão 🧪 preenche todos os campos específicos;
- [ ] a data aparece no input de data;
- [ ] editar a data preserva/atualiza o valor;
- [ ] retornar à etapa e avançar não corrompe os dados;
- [ ] não há erro de console relevante.

Não marcar esses itens como PASS antes do relato/execução observável.

## Próximas ações

1. Receber o resultado do teste manual.
2. Investigar os logs do Vitest no run 40782524806 e identificar o teste exato que falhou.
3. Investigar o log do passo de descoberta da matriz E2E no run 40782524758. Não contornar ou desativar a matriz.
4. Consultar os workflows disparados pelos commits de documentação.
5. Corrigir falhas comprovadas em tarefa delimitada; depois executar testes e confirmar CI/deploy.
6. Atualizar este documento, o HANDOFF CANÔNICO e o README com evidências e o próximo passo.

## Critérios de aceite

- [x] Data e número do INMETRO são apresentados como opcionais no código.
- [x] Texto não promete invalidação automática com base apenas na idade da aferição.
- [x] Binding do input de data usa ISO diretamente.
- [ ] Testes automatizados passam após identificar e corrigir a falha atual do CI.
- [ ] Clique real no botão de teste e renderização dos valores confirmados.
- [ ] Campos opcionais vazios permitem continuar.
- [ ] Workflow de deploy passa e deploy é confirmado, se autorizado.
- [ ] Smoke test pós-deploy realizado, se autorizado.

**Estado final:** implementação no repositório confirmada; qualidade e deploy ainda **não aprovados** por falhas de pipeline e validação de interface pendente.
