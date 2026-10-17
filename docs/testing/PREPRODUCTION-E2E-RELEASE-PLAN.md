# Certificação E2E pré-produção — AdeusMultas

**Estado:** especificação de execução; não significa que testes tenham sido executados ou aprovados.  
**Escopo:** este repositório e ambiente de teste isolado.  
**Branch de trabalho:** `integration/preproduction-e2e-gates`.  
**Regra de produção:** esta certificação produz uma recomendação documentada de liberação; não autoriza deploy automaticamente.

## Objetivo e princípio de aprovação

Certificar os fluxos finais antes de produção por baterias sequenciais de serviço. A hipótese de **7 baterias × 10 cenários = 70 cenários** deve ser confirmada pelo inventário real de código, fixtures e plano de testes. Não presumir a distribuição nem afirmar que a suíte está completa sem enumerar os cenários, serviços e resultados esperados.

Antes de executar cada cenário, documentar sua referência de resultado esperado (oráculo): dados de entrada, procedimento/serviço esperado, fatos jurídicos que podem ser afirmados, condições que exigem complementação ou bloqueio, campos obrigatórios da minuta, estado esperado no frontend e efeitos esperados no banco/pagamento. O resultado real deve ser comparado automaticamente ao oráculo; a expectativa não pode ser redefinida após observar o resultado para fazer o teste passar.

## Organização local

- Agentes: `.opencode/agents/e2e-*.md`
- Skill principal: `.opencode/skills/preproduction-e2e-release/SKILL.md` e skills especializadas E2E adjacentes.
- Usar os arquivos versionados neste projeto; não criar nem alterar agentes/skills globais ou cópias duplicadas.
- Preservar workspace e tarefas em andamento. Se necessário, usar worktree isolado da branch existente, sem reclonar nem alterar `main`.
- Registrar o SHA exato do commit testado em cada relatório.

## Preparação e integridade do executor

1. Inspecionar código, fixtures, scripts, Playwright config, Quality Gate real e esquema atual do banco.
2. Confirmar o inventário e o denominador por serviço. Só declarar 7 × 10 se o código confirmar exatamente essa distribuição.
3. Confirmar explicitamente a URL e o projeto Supabase antes de qualquer escrita; usar ambiente de teste isolado e `E2E_MOCK_PAYMENT=1`.
4. Não criar casos artificialmente por SQL/API para simular o fluxo: os casos de negócio devem ser criados pela interface real. Dados de suporte estritamente necessários (por exemplo, identidade sintética) devem ser documentados separadamente e nunca contabilizados como cenário aprovado.
5. Verificar os servidores existentes e reutilizar instâncias saudáveis. Não matar processos nem reiniciar servidores saudáveis; diagnosticar endpoints parcialmente ativos antes de iniciar outro.
6. Confirmar que o comando escolhido executa a matriz oficial completa. Relacionar cada cenário planejado a um teste realmente selecionado pelo Playwright; skips, filtros, exclusões e retries devem aparecer no relatório.
7. Executar primeiro verificações técnicas e teste de fumaça para validar ambiente, autenticação, criação pela UI, persistência e coleta de evidências. Corrigir defeitos do escopo e retestar antes da bateria completa.
8. Executar as baterias em sequência. Não começar a próxima antes da decisão documentada da bateria atual. Não relaxar critérios para obter resultado verde.

## As oito dimensões obrigatórias

### 1. Precisão jurídica e coerência da análise — bloqueante

- Conferir se infração, fatos, órgão competente, procedimento, prazos e fundamentos são compatíveis com os dados e com as fontes/ regras disponíveis no sistema.
- Incluir dados incompletos, fundamentos insuficientes, hipótese jurídica não sustentada, infração com requisito específico e fontes indisponíveis.
- O resultado correto pode ser solicitar complementação, explicar uma limitação ou bloquear a geração; nunca inventar fatos ou fundamentos.
- **Critério:** 100% dos controles jurídicos críticos aprovados; zero fatos inventados e zero procedimento incompatível sem justificativa sustentada.

### 2. Qualidade das minutas — bloqueante

- Aplicar o Quality Gate existente, sem criar uma versão paralela nem mudar seus limiares para a certificação.
- Conferir conteúdo, personalização, fundamentação, dados da infração, campos obrigatórios e pedidos.
- Registrar nota, cada um dos sete controles obrigatórios, erros críticos e aprovação na primeira execução versus após correções.
- **Critério:** score >= 90 e todos os sete controles obrigatórios aprovados em cada minuta que deva ser gerada. Se o caso não permitir geração responsável, validar a recusa/solicitação de complemento conforme o oráculo.

### 3. Integridade dos dados e isolamento — bloqueante

- Rastrear entrada da UI → caso persistido → análise → minuta → documento exibido/baixado.
- Confirmar IDs reais retornados pela aplicação e a correlação com cenário e execução.
- Testar acesso entre usuários e mistura entre casos, minutas, arquivos ou dados pessoais.
- **Critério:** 100% dos cenários rastreáveis; zero contaminação cruzada, acesso indevido, perda ou duplicação indevida.

### 4. Frontend e experiência — bloqueante nos fluxos críticos

- Validar formulários, campos obrigatórios, mensagens, modais, navegação, estados de carregamento, recuperação de erros, responsividade e acessibilidade aplicável.
- Confirmar que a UI reflete o estado real do backend; verificar submissão duplicada e atualização/recarregamento de página.
- **Critério:** 100% dos fluxos críticos validados, zero defeitos críticos e zero estado visual que contradiga a persistência.

### 5. Desempenho — medir e avaliar contra especificação

- Medir duração e registrar timeouts/erros por operação: análise gratuita, geração da minuta, persistência e download.
- Reportar p50, p95 e p99 somente com tamanho de amostra explícito e suficiente; nunca usar médias para ocultar caudas de latência.
- A meta inicial de análise gratuita abaixo de 3 s no p95 só é critério de aprovação se aplicável ao fluxo e confirmada pela especificação vigente. Testes funcionais de 70 cenários não substituem teste de carga.
- Registrar limites da amostra e necessidade de teste de carga separado.

### 6. Segurança e privacidade — bloqueante

- Verificar isolamento de usuários, permissões/RLS, controle de acesso a documentos, validação de entradas, exposição de dados pessoais e segredos em logs.
- **Critério:** zero vulnerabilidades críticas ou altas conhecidas sem mitigação formalmente aprovada; zero exposição de dados entre usuários.
- Qualquer exceção deve registrar evidência, impacto, responsável pela aceitação e prazo. A nota geral não compensa uma falha de segurança.

### 7. Pagamento e liberação do serviço — bloqueante

- Usar apenas pagamentos simulados; confirmar `E2E_MOCK_PAYMENT=1` e que nenhuma chamada pode produzir cobrança real.
- Validar os estados implementados: PIX aprovado, pendente, recusado, expirado e notificações repetidas, conforme suportados pelo sistema.
- Conferir idempotência, assinatura/validade da confirmação conforme implementação, persistência do evento e liberação somente após confirmação válida.
- **Critério:** zero pagamentos reais, zero liberação indevida e zero duplicidade de processamento. Estados não implementados devem ser identificados como lacuna, não marcados como aprovados.

### 8. Recuperação e operação — bloqueante quando aplicável à prontidão

- Simular falha temporária de API, timeout, recarga/retomada, repetição segura e interrupção durante operações.
- Conferir logs, correlação de execução, preservação de dados e ausência de duplicidade.
- **Critério:** operações recuperáveis sem perda indevida, ações idempotentes quando exigido e falhas rastreáveis.

## Casos negativos e repetibilidade

- A matriz deve cobrir situações em que a geração precisa ser impedida ou adiada: dados insuficientes, fundamento não sustentado, fonte indisponível, sessão expirada, permissão negada e pagamento não confirmado, conforme o produto implemente esses estados.
- Reexecutar casos representativos com entradas idênticas e comparar fatos, procedimento, fundamentos, campos, decisão, integridade e estado persistido. Diferenças textuais podem ser aceitáveis; mudanças inexplicadas nos fatos, recomendação ou procedimento não são.
- Documentar previamente o que é invariável e o que pode variar. Não exigir igualdade literal de texto se o sistema tiver geração não determinística.

## Gates sequenciais por serviço

Cada bateria só pode avançar após a decisão explícita e evidenciada da bateria atual.

1. **Pronto para executar:** cenários e oráculos definidos, ambiente e projeto verificados, pagamento simulado confirmado, coleta de evidências operacional.
2. **Execução completa:** todos os cenários previstos executados ou com bloqueio individual justificado; nenhum skip/filtro omitido do relatório.
3. **Validação funcional/jurídica:** resultado real comparado ao oráculo; controles jurídicos e Quality Gate aprovados.
4. **Validação técnica:** integridade, frontend, segurança, pagamento, desempenho e recuperação avaliados conforme aplicável.
5. **Correção e reteste:** defeitos do escopo corrigidos e os cenários afetados retestados; registrar resultado inicial e posterior.
6. **Decisão da bateria:** APROVADA, REPROVADA ou INCONCLUSIVA, com evidências e responsável pela decisão.
7. Só após APROVADA iniciar o serviço seguinte. Uma bateria inconclusiva não conta como aprovada.

## Painel de indicadores para a decisão final

Os relatórios devem conter valores observados, denominadores, evidências e limitações — não apenas uma lista de testes.

| Indicador | Critério |
|---|---|
| Cenários obrigatórios | 100% executados e rastreáveis; skips e bloqueios explicitados |
| Baterias por serviço | 100% aprovadas individualmente |
| Controles jurídicos críticos | 100% aprovados |
| Quality Gate das minutas | Nota >= 90 e todos os sete controles obrigatórios aprovados |
| Fatos inventados ou dados cruzados | Zero |
| Vulnerabilidades críticas/altas | Zero sem mitigação formalmente aprovada |
| Fluxos críticos de frontend | 100% validados |
| Pagamentos reais durante os testes | Zero |
| Liberação indevida/duplicidade de pagamento | Zero |
| Erros e exceções | Todos classificados, evidenciados e com decisão documentada |
| Desempenho | p50/p95/p99 com amostra explícita; limites comparados à especificação vigente |
| Limpeza de dados sintéticos | Confirmada sem atingir dados legítimos |

## Entregáveis

1. `docs/reports/INVENTARIO-FUNCIONAL-FRONTEND-E2E.md`
2. `docs/reports/RELATORIO-VALIDACAO-FRONTEND-E2E.md`
3. `docs/reports/RELATORIO-APROVACAO-E2E-70-CENARIOS.md`
4. Evidências brutas em localização segura. Não versionar segredos nem dados pessoais; referenciar caminhos de evidência protegidos quando necessário.

O relatório executivo final deve apresentar, em uma página: decisão, commit testado, distribuição real dos cenários, serviços aprovados/reprovados/inconclusivos, indicadores observados, defeitos e correções, riscos residuais, limitações e links para evidências.

## Decisão final de liberação

- **APROVADO PARA RECOMENDAÇÃO DE PRODUÇÃO:** todas as baterias e gates operacionais obrigatórios passaram com evidências; nenhuma falha crítica pendente.
- **BLOQUEADO:** qualquer gate obrigatório falhou ou existe risco crítico sem mitigação aceita.
- **INCONCLUSIVO:** ambiente, amostra ou evidências insuficientes impedem afirmar aprovação.

A nota geral nunca compensa falha jurídica, exposição de dados, cobrança indevida ou ausência de evidência crítica. Setenta cenários E2E não demonstram por si só capacidade de carga. Se monitoramento, alertas, rollback, backups/recuperação ou teste de carga ainda não tiverem sido validados, devem constar como verificações adicionais pendentes, sem garantias implícitas.

A aprovação E2E não equivale a deploy. Deploy requer decisão e autorização próprias.
