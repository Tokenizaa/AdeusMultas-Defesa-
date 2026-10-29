# Correção 10 — divergência entre tese de prazo e card principal

**Estado atualizado:** correção de código e testes aplicados na `main`; CI e deploy concluídos com sucesso para o commit de testes `c4a388e40c3e43d9749071eff4da28d7f63bef63`. Validação visual após o deploy ainda pendente.

## Evidência de produção relatada

O usuário compartilhou uma nova saída de análise do AIT **5566147171**, placa **FAH3X90**, infração Art. 218, I do CTB, código 745-50. O relatório detalhado indicava 35 dias entre a infração e a expedição registrada, mas o card principal da tese de decadência dizia que não era possível confirmar o ponto. A mesma saída ainda exibia a alegação de que os requisitos do art. 267 estavam atendidos e mensagens técnicas de regras não aplicáveis, como `[alcoolemia]` e `excesso_velocidade`.

Essa saída é evidência relatada pelo usuário; não foi capturada de forma independente pelo agente em navegador.

## Causa identificada para a divergência do card de prazo

A camada de apresentação em `src/components/onboarding/steps/FreeAnalysisResultStep.tsx` tinha explicação específica para `ARG-048`, mas a regra de decadência declara `relatedArguments: ['ARG-048', 'ARG-049']`. Quando a análise recomendava `ARG-049` — cujo título é “Decadência do Direito de Punir: Notificação Expedida após 30 Dias...” — a apresentação não encontrava uma explicação correspondente e caía no fallback genérico. Por isso o card principal podia dizer “Não deu para confirmar...” enquanto a lista de verificações já informava 35 dias.

## Correção implementada

- O renderer agora usa a explicação e a verificação de evidência de `ARG-048` também para `ARG-049`, evitando o fallback genérico para essa tese relacionada.
- Adicionados testes de regressão no arquivo `src/components/onboarding/steps/onboarding-copy-regression.test.tsx` para o card principal com `ARG-049` e para o texto do art. 267 quando o histórico é uma declaração não confirmada.
- A alteração não converte um indício de 35 dias em nulidade automática; a mensagem continua exigindo conferência da data oficial de expedição.

## Estado do art. 267 e regras não aplicáveis

A saída fornecida ainda mostra texto que não corresponde ao comportamento esperado do código atual: afirma que os requisitos estão atendidos e expõe nomes internos de categorias. Não presumir que a causa é cache, deploy ou sessão antiga sem testar. Após o deploy da correção 10, validar visualmente com uma nova análise e confirmar:

1. O card principal de prazo apresenta os mesmos 35 dias do detalhe quando o argumento recomendado é `ARG-049`.
2. A mensagem do art. 267 diferencia dado ausente, declaração do condutor e confirmação oficial.
3. As regras não aplicáveis são traduzidas na interface, sem `[alcoolemia]` ou `excesso_velocidade` expostos ao usuário.
4. A contagem de verificações e os detalhes correspondem ao mesmo resultado de análise.

## Commits e workflows

- Código: `1f898edf1ffe5a603ce929dceaea0e000269b923` — mapeamento de `ARG-049` para a evidência de prazo. CI [40942697210](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40942697210) e Cloudflare Deploy [40942697430](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40942697430) concluíram com sucesso.
- Testes: `c4a388e40c3e43d9749071eff4da28d7f63bef63` — regressões de `ARG-049` e art. 267. CI [40942733942](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40942733942) e Cloudflare Deploy [40942733911](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40942733911) concluíram com sucesso.

## Critérios de aceitação

- [x] Identificada a causa estática do fallback genérico de `ARG-049`.
- [x] Adicionado alias de apresentação para reutilizar a evidência específica de prazo.
- [x] Adicionados testes para `ARG-049` e para a declaração do histórico no art. 267.
- [x] CI da alteração de código e dos testes concluído com sucesso no commit `c4a388e40c3e43d9749071eff4da28d7f63bef63`.
- [x] Deploy Cloudflare concluído com sucesso no commit `c4a388e40c3e43d9749071eff4da28d7f63bef63`.
- [ ] Validação visual independente com nova análise concluída.
- [ ] Confirmado que a saída não apresenta mais texto antigo do art. 267 nem nomes internos de regras não aplicáveis.

## Próxima ação

Consultar os workflows pendentes, depois validar a tela publicada com uma nova análise do caso ou dados de teste equivalentes. Se os textos de art. 267 e regras não aplicáveis persistirem, rastrear o caminho de dados/renderização e a versão do bundle efetivamente servido antes de alterar novamente o código.
