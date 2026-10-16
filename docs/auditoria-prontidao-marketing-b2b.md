# Auditoria de prontidão do Marketing para prospecção B2B

**Projeto:** AdeusMultas-Defesa-  
**Repositório:** https://github.com/Tokenizaa/AdeusMultas-Defesa-  
**Data do levantamento:** 2026-10-16  
**Escopo:** leitura estática do código no GitHub. Não foram executados testes nesta auditoria nem realizadas alterações no banco ou na produção.

## 1. Objetivo e decisão

Avaliar se o módulo de Marketing está apto a receber leads de Google Maps/Firecrawl, qualificá-los, associá-los à campanha correta e controlar o contato por WhatsApp.

**Decisão: NÃO LIBERAR AINDA a integração comercial da nova coleta.**

O repositório contém componentes úteis de campanhas, vínculos lead-campanha, fila persistente, envio de mensagens e tratamento de respostas. Entretanto, foram identificados riscos de elegibilidade, opt-out, associação de respostas e operação do worker. A existência de código e de testes unitários não comprova que o ciclo está funcional no runtime de produção.

## 2. Fluxo de negócio que deve ser respeitado

1. Coleta de empresas por Google Maps ou Firecrawl.
2. Normalização, enriquecimento permitido e deduplicação entre fontes.
3. Persistência do lead com origem, evidência, data da coleta e identificador da execução.
4. Entrada no módulo central de Marketing — a coleta não inicia contato.
5. Qualificação comercial e validação de elegibilidade, incluindo público, tipo de negócio, região, dados de contato, supressão/opt-out e critérios da campanha.
6. Seleção explícita da campanha adequada e criação idempotente do vínculo lead-campanha.
7. Fila de contato controlada pela campanha; validação de elegibilidade novamente no momento do envio.
8. Envio pelo WhatsApp somente após autorização operacional da campanha; persistência do resultado e ID externo.
9. Processamento idempotente de respostas, atribuição à campanha correta, atualização do histórico e cancelamento de follow-ups quando houver resposta ou descadastro.
10. Métricas e interface administrativa que representem o estado real de cada etapa.

**Regra de arquitetura:** o scraper não escolhe nem inicia campanhas e não chama diretamente a API do WhatsApp. O Marketing é o único responsável pela qualificação, atribuição, autorização e cadência.

## 3. Evidências no código e riscos

### 3.1 Seleção de leads para campanha — crítico

Arquivo: [src/server/routes/marketing-automation.ts](../src/server/routes/marketing-automation.ts)

A rota de início de campanha consulta `marketing_leads` filtrando por `lead_type`, `audience` e presença de `phone_normalized`. Na consulta identificada, não há filtro de `target_cities` nem validação explícita de que a campanha esteja ativa. Também não é exigido um estado de qualificação/elegibilidade específico antes de criar vínculos e itens de fila.

**Risco:** leads podem ser vinculados à campanha errada, fora da região pretendida ou antes de passar por qualificação.

**Correção necessária:** centralizar as regras de elegibilidade; validar estado da campanha, público, tipo, região, contato normalizado e supressão antes de vincular; repetir as verificações essenciais imediatamente antes do envio.

### 3.2 Estado de opt-out incompatível com a restrição do banco — crítico

Arquivo: [supabase/migrations/20260827000002_create_marketing_automation.sql](../supabase/migrations/20260827000002_create_marketing_automation.sql)

A restrição CHECK de `marketing_lead_campaigns.status` aceita estados como `queued`, `sent`, `delivered`, `responded`, `converted`, `error`, `exhausted` e `paused`, mas não inclui `opt_out`. Já o serviço de respostas tenta gravar `status = 'opt_out'` no vínculo lead-campanha.

**Risco:** a atualização do vínculo pode ser rejeitada pelo banco, mesmo quando a lógica tenta cancelar a automação. O serviço não verifica de forma consistente todos os erros das atualizações.

**Correção necessária:** definir formalmente os estados e transições; compatibilizar código, restrições e dados; verificar erros de cada gravação; assegurar que o opt-out global do lead seja aplicado a todas as campanhas e bloqueie qualquer envio futuro. Nenhuma migration de produção deve ser aplicada sem revisão e autorização.

### 3.3 Associação de resposta ao lead/campanha — alto

Arquivo: [src/server/services/prospecting-responder.ts](../src/server/services/prospecting-responder.ts)

O serviço lê até 50 leads e faz a correspondência de telefone em memória. Em uma base maior, o lead correto pode ficar fora do conjunto retornado. Quando há mais de um vínculo ativo, o código escolhe o mais recente, o que pode não identificar com segurança a campanha à qual a resposta pertence.

**Risco:** resposta não registrada ou atribuída à campanha errada.

**Correção necessária:** localizar o lead por telefone normalizado com consulta determinística e cobertura completa; usar identificadores/contexto do evento e regras explícitas de atribuição; tratar ambiguidade sem escolher arbitrariamente; manter idempotência por ID externo.

### 3.4 Limites de campanha e cadência — alto

Arquivo: [src/server/routes/marketing-automation.ts](../src/server/routes/marketing-automation.ts)

O início da campanha usa `max_contacts` para limitar a quantidade total de vínculos lead-campanha, com valor padrão de 3 quando ausente. Esse limite não deve ser confundido com o número de mensagens por lead ou com o intervalo entre mensagens.

**Correção necessária:** distinguir no modelo e na interface: (a) limite de leads na campanha, (b) etapas/mensagens por lead, (c) intervalo mínimo e (d) limite de tentativas. Validar parâmetros e testar limites e reexecuções.

### 3.5 Fila e worker — alto; runtime precisa de validação

Arquivo: [src/server/services/marketing-automation/worker.ts](../src/server/services/marketing-automation/worker.ts)

O worker consulta o vínculo e a campanha, verifica alguns estados terminais antes de enviar, grava uma mensagem de saída e atualiza o vínculo. O fluxo é uma base útil, mas precisa de validação para concorrência, idempotência, falhas parciais e estado real do processo. A marcação de estado persistida não deve ser tratada como prova suficiente de que o worker está ativo.

**Correção/validação necessária:** confirmar como o worker é iniciado no entrypoint realmente implantado; garantir que a mesma ação da fila não gere envio duplicado; verificar erros de gravação; confirmar que estados de pausa, resposta e opt-out impedem novos envios mesmo sob concorrência ou retry.

### 3.6 Webhook inbound e runtime de produção — bloqueio de integração

Arquivos:
- [cloudflare/routes/communication.ts](../cloudflare/routes/communication.ts)
- [src/server/services/prospecting-responder.ts](../src/server/services/prospecting-responder.ts)
- [src/server/services/messaging-service.ts](../src/server/services/messaging-service.ts)

A auditoria anterior do código encontrou um caminho do Worker que apenas reconhece/aceita o webhook sem encaminhar a mensagem para o CRM. Existe também um caminho de processamento no backend legado, mas não se pode presumir que esse caminho seja o runtime ativo em produção.

**Correção/validação necessária:** identificar o endpoint configurado na Evolution API e o runtime que o atende; garantir autenticação/segredo, validação de evento, deduplicação por ID externo, persistência inbound, atribuição da campanha e cancelamento da fila. Confirmar por teste integrado com ambiente de teste autorizado.

### 3.7 Integração Firecrawl/Google Maps com Marketing — não comprovada

A existência dos scrapers não prova que ambos alimentem o mesmo contrato de lead, que a deduplicação entre fontes seja idempotente ou que os resultados entrem no processo de qualificação sem acionar contatos.

**Validação necessária:** testar as duas fontes com fixtures equivalentes, empresas duplicadas, telefones/sites ausentes, conflitos e reexecução. Confirmar origem e evidências preservadas, ausência de sobrescrita por valores vazios e ausência de criação automática de campanha/envio.

## 4. Estado operacional: o que está e não está confirmado

Esta documentação resulta de leitura do código no GitHub. Não confirma o estado atual dos serviços externos.

- A auditoria anterior do projeto registrou o worker como parado e problemas de conectividade da Evolution API na ocasião. Esses registros são históricos e devem ser revalidados.
- Não foi executada nesta etapa uma chamada real à API Firecrawl.
- Não foi confirmado nesta etapa o endpoint efetivo de webhook configurado na Evolution API.
- Não foram executados testes, não foram realizadas escritas no Supabase e não houve deploy ou contato comercial.
- Contagens de banco registradas em verificações anteriores não substituem a validação do runtime atual.

## 5. Plano de trabalho — executar somente após registrar este documento

### Fase A — Contrato de qualificação e campanha
- Mapear campos reais de lead, campanha, vínculo e estados no schema/migrations.
- Definir a máquina de estados do lead e do vínculo lead-campanha.
- Definir critérios obrigatórios de qualificação, público, tipo de negócio, região, contato e supressão.
- Separar limites de audiência, cadência, intervalo e tentativas.
- Documentar a regra para um lead elegível em múltiplas campanhas e evitar atribuição ambígua.

### Fase B — Corrigir persistência e elegibilidade
- Corrigir seleção de campanha e filtro de elegibilidade.
- Corrigir o contrato de estados, incluindo opt-out, no código e no schema.
- Tornar vínculos e enfileiramento idempotentes e seguros para retries.
- Verificar todos os erros de persistência sem expor dados pessoais ou segredos em logs.
- Não aplicar migration de produção sem autorização explícita.

### Fase C — Corrigir e validar mensagens
- Confirmar runtime/entrypoint e endpoint de webhook em uso.
- Implementar o processamento inbound no runtime efetivo, sem dupla execução entre Worker e backend legado.
- Garantir atribuição determinística, deduplicação por ID externo, cancelamento de follow-ups e supressão global.
- Persistir o resultado real do envio outbound e o ID externo.
- Não enviar mensagens comerciais reais; usar mocks e ambiente/número de teste autorizado.

### Fase D — Integrar coleta ao Marketing
- Confirmar que Google Maps e Firecrawl produzem o mesmo contrato canônico.
- Validar deduplicação cruzada e reexecução idempotente.
- Encaminhar leads somente para qualificação; não criar automaticamente contatos/enviar mensagens durante a coleta.
- Mostrar na interface os estados reais: coletado, normalizado, duplicado, qualificado, inelegível, atribuído à campanha, enfileirado, enviado, respondido, descadastrado e erro.

### Fase E — Testes e evidências
- Executar testes unitários e de integração pertinentes, build e typecheck.
- Testar campanha inativa, região incompatível, lead não qualificado, telefone inválido, lead duplicado, múltiplas campanhas, opt-out, resposta duplicada, webhook inválido, retry e falha parcial de banco/API.
- Testar o fluxo ponta a ponta com dados simulados, sem mensagens comerciais e sem coleta ampla.
- Registrar comandos executados, resultados, limitações e evidências verificáveis.

## 6. Critérios de aceite para liberar a integração

A integração só pode ser considerada pronta quando todos os itens abaixo forem demonstrados:

- [ ] Lead coletado por qualquer fonte permanece sem contato automático.
- [ ] Lead é normalizado e deduplicado de forma idempotente entre Google Maps e Firecrawl.
- [ ] Lead inelegível não é associado à campanha nem enfileirado.
- [ ] Campanha inativa ou incompatível não aceita novos leads.
- [ ] Vínculo lead-campanha e enfileiramento não se duplicam em reexecuções.
- [ ] Opt-out é persistido, aceito pelo schema e bloqueia todas as campanhas/follow-ups.
- [ ] Envio outbound registra o resultado real e o ID externo.
- [ ] Webhook inbound é autenticado, idempotente e processado pelo runtime ativo.
- [ ] Resposta é atribuída à campanha correta e cancela os follow-ups aplicáveis.
- [ ] Falhas parciais e retries não causam mensagens duplicadas.
- [ ] Interface e métricas mostram estados reais.
- [ ] Testes, build e typecheck relevantes têm resultados documentados.
- [ ] Teste integrado usa dados simulados ou ambiente/número de teste autorizado.

## 7. Regras de segurança e controle de mudanças

- Preservar alterações locais e trabalho de outros agentes; inspecionar `git status`, branch e commits antes de editar.
- Não executar `git reset --hard`, `git clean` ou force push.
- Não fazer deploy, publicar, iniciar automação, reativar worker, realizar coleta ampla ou disparar mensagens comerciais sem autorização explícita.
- Não revelar tokens, chaves, telefones pessoais ou conteúdo sensível nos logs/documentação.
- Não alterar arquivos fora do escopo.
- Se credenciais ou acesso não estiverem disponíveis, concluir a parte local possível e registrar a validação externa como pendente; não simular sucesso.
- Atualizar este documento com evidências reais antes de marcar a fase como concluída.

## 8. Fontes primárias

- [Rotas de automação e campanhas](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/main/src/server/routes/marketing-automation.ts)
- [Worker de automação](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/main/src/server/services/marketing-automation/worker.ts)
- [Responder de prospecção](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/main/src/server/services/prospecting-responder.ts)
- [Migration de automação de Marketing](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/main/supabase/migrations/20260827000002_create_marketing_automation.sql)
- [Rota de comunicação do Cloudflare Worker](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/main/cloudflare/routes/communication.ts)
- [Serviço de mensagens](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/main/src/server/services/messaging-service.ts)
- [Auditoria anterior B2B/WhatsApp](https://github.com/Tokenizaa/AdeusMultas-Defesa-/blob/main/docs/auditoria-marketingos-b2c-b2b-whatsapp.md)


## 9. Fase A — validação do contrato (evidência estática, 2026-10-16)

Esta seção registra a primeira validação documental feita após a criação da auditoria. Foi feita leitura dos arquivos no GitHub; ainda não houve execução de testes, consulta ao banco de produção ou alteração de código.

### 9.1 Contrato encontrado nas migrations

- `marketing_leads` (migration `20260827000001_create_marketing_leads.sql`) define `lead_type`, `name`, telefone/WhatsApp, email, website, endereço, cidade/estado, origem, URLs e data de coleta. A migration não define um campo de qualificação comercial nem um estado de lead.
- A migration `20260829120001_add_audience_segmentation_and_opt_out.sql` adiciona `audience` (`B2C`/`B2B`) e `opt_out_at` em `marketing_leads`. A própria migration descreve a supressão global por número como lacuna pendente. O contrato não deve depender de `lead.status = 'opt_out'` sem confirmar uma migration posterior que crie esse campo; a busca de migrations por `ADD COLUMN status` não encontrou uma definição para `marketing_leads`.
- `marketing_campaigns` possui `status` com estados `active`, `paused`, `finished`, `draft`, `lead_type`, `target_cities`, `steps`, `max_contacts`, `min_interval_hours` e `audience`.
- `marketing_lead_campaigns.status` aceita `queued`, `sent`, `delivered`, `read`, `responded`, `converted`, `error`, `exhausted` e `paused`; não aceita `opt_out`.
- A tabela de fila não define unicidade para uma ação pendente por vínculo/etapa. A tabela de mensagens não define unicidade de `external_id`; portanto, a idempotência observada no responder depende hoje de consulta prévia, não de garantia atômica do banco.

### 9.2 Contrato de negócio recomendado

**Estado do lead (separado do estado da campanha):**
- `new`: coletado e persistido, ainda não qualificado.
- `qualified`: critérios de público, tipo de negócio, localização e dados mínimos verificados.
- `ineligible`: não atende à campanha ou faltam requisitos obrigatórios; registrar motivo.
- `suppressed`: opt-out global ou outra supressão aplicável; nenhum envio permitido.

**Estado do vínculo lead-campanha:**
- `queued`: elegível, atribuído e aguardando ação autorizada.
- `sent` / `delivered` / `read`: progresso real da mensagem.
- `responded`: resposta recebida; cancelar follow-ups.
- `converted`: conversão confirmada.
- `paused` / `exhausted` / `error`: estados de controle/terminal.
- O opt-out deve ser uma supressão global do lead e da identidade de contato, não depender exclusivamente de um estado no vínculo. Só adicionar `opt_out` ao vínculo se houver uma decisão explícita de domínio e migration compatível.

**Elegibilidade de uma campanha B2B:** campanha em estado `active`; público e `lead_type` compatíveis; cidade/UF dentro de `target_cities` (regra explícita para cidade ausente); lead qualificado; telefone normalizado válido; `opt_out_at IS NULL`; nenhuma supressão equivalente por número; vínculo ainda inexistente. A mesma política deve ser revalidada antes do envio.

**Seleção entre campanhas:** não atribuir automaticamente um lead a várias campanhas incompatíveis nem escolher uma campanha arbitrariamente. Até existir uma regra explícita de prioridade/exclusividade, uma ambiguidade deve impedir o enfileiramento e ser exibida para decisão administrativa.

**Limites:** `max_contacts` está sendo usado na rota de início como limite total de leads/vínculos da campanha, embora o nome sugira contatos por lead. Deve ser renomeado/migrado ou documentado como limite de audiência; cadência por lead, intervalo e máximo de tentativas são controles distintos.

### 9.3 Divergências concretas confirmadas no código

1. `POST /campaigns/:id/start` carrega a campanha, mas não verifica `campaign.status === 'active'`.
2. A seleção de leads filtra `lead_type`, `audience` e `phone_normalized IS NOT NULL`, mas não aplica `target_cities`, estado de qualificação nem `opt_out_at IS NULL`.
3. O fluxo grava vínculos e depois a fila em duas operações separadas. Se a primeira persistência funcionar e a segunda falhar, pode haver vínculo sem ação na fila; a reexecução não reconcilia automaticamente esse caso.
4. O responder usa `marketing_leads.status = 'opt_out'` e `marketing_lead_campaigns.status = 'opt_out'`, enquanto as migrations encontradas definem `opt_out_at` no lead e não aceitam `opt_out` no vínculo. Erros das atualizações de estado não são tratados de forma consistente.
5. O worker consulta estados de campanha/vínculo, mas a elegibilidade de envio não verifica status ativo da campanha, região, qualificação ou supressão por `opt_out_at`.
6. A contagem/limitação de `max_contacts` na rota limita os vínculos totais; no worker, a leitura da relação campanha usada para a contagem seleciona somente `max_contacts`, e o filtro de jobs calcula contagens mas retorna `due.slice(0, 10)` sem filtrar os jobs que excederam o limite.

### 9.4 Resultado da Fase A

**Fase A documental: concluída parcialmente.** O contrato e as divergências foram mapeados a partir das migrations e do código no GitHub. A fase não é considerada tecnicamente fechada até confirmar o schema efetivo do Supabase, revisar testes existentes e decidir a política de qualificação/supressão e de atribuição entre campanhas. Não foram feitas alterações em código, banco, automação, webhook ou produção.

**Próxima etapa segura:** Fase B em branch isolada, com testes de regressão primeiro, implementando elegibilidade compartilhada e supressão global antes de qualquer tentativa de iniciar campanha. Não iniciar worker nem enviar mensagens reais.
