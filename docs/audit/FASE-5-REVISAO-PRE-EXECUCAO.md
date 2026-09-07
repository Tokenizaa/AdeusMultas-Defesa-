# FASE 5 — Revisão Pré-Execução

Objetivo: deixar o agente local com instruções suficientes para executar a Fase 5 de forma objetiva, verificável e sem escopo indevido.

Referência técnica: OWASP ASVS 5.0. O ASVS deve ser usado como referência de verificação técnica, não como autorização para inventar requisitos. citeturn0search6turn0search5

## 5.1 — Environment

**Revisão preliminar:** `server.ts` possui `validateCriticalEnvVars()`, mas variáveis críticas ausentes apenas geram log e o processo continua. Isso precisa ser verificado como comportamento de produção.

**O agente deve:**
- Inventariar todas as variáveis realmente utilizadas.
- Separar obrigatórias, opcionais e somente desenvolvimento/teste.
- Verificar defaults perigosos e valores hardcoded.
- Verificar se produção sobe quando uma variável crítica está ausente.
- Verificar `NODE_ENV`, `PORT`, URLs públicas e modos sandbox/production.
- Não imprimir valores de secrets.
- Se a política desejada não puder ser comprovada, registrar `KNOWLEDGE_GAP`.

**Ponto de atenção já encontrado:** `PORT` aparece hardcoded como `3000` em `server.ts` e `cors.ts`. Confirmar se isso é requisito real do ambiente ou configuração indevida.

## 5.2 — Secrets

**Revisão preliminar:** o código lê secrets via `process.env`; a presença de `SUPABASE_SERVICE_ROLE_KEY` é esperada no backend, mas o mecanismo externo de gestão/rotação não está comprovado pelo código.

**O agente deve:**
- Inventariar secrets e credenciais efetivamente usadas.
- Confirmar que nenhum secret chega ao bundle/frontend.
- Procurar secrets em código, fixtures, scripts, logs e artefatos de build.
- Verificar permissões e origem de cada secret.
- Verificar rotação/revogação apenas quando houver evidência da infraestrutura.
- Não rotacionar credenciais durante a auditoria sem decisão explícita.

O ASVS 5.0 exige gestão segura de secrets e least privilege para aplicações de nível 2/3. citeturn0search2

## 5.3 — Configuração de produção

**Pontos concretos para verificar:**
- `server.ts` contém dados de demonstração (`sampleCaseDomain`) com PII e valores operacionais.
- Há inicializações automáticas no startup (`contranCollector.start()`, workers/polling e outros serviços).
- O warmup do Supabase permite que o servidor continue mesmo após falha de carregamento.
- Há configurações hardcoded que podem divergir do ambiente real.

**O agente deve:**
- Determinar se dados demo entram em produção.
- Determinar quais inicializações são obrigatórias e quais devem ser condicionadas ao ambiente.
- Verificar comportamento fail-closed para dependências críticas.
- Verificar flags de debug/teste/demo.
- Não remover comportamento sem comprovar que é indevido em produção.

## 5.4 — CORS / headers / HTTP security

**ACHADO PRIORITÁRIO:** `src/server/config/cors.ts` calcula `isOriginAllowed()`, mas o callback do middleware retorna `callback(null, true)` também quando a origem é rejeitada. Na prática, a validação de origem está anulada.

**O agente deve:**
- Reproduzir CORS com origem permitida e não permitida.
- Confirmar o comportamento real, não somente ler a configuração.
- Corrigir o fail-open se confirmado.
- Auditar `credentials: true` junto com a política de origem.
- Verificar CSP, HSTS, X-Content-Type-Options, frame protection e demais headers.
- Confirmar que headers de desenvolvimento não permanecem em produção.

O ASVS 5.0 inclui comunicação segura, configuração e proteção de dados como controles verificáveis. citeturn0search5turn0search7

## 5.5 — APIs externas

**O agente deve:**
- Inventariar Gemini, Supabase, Meta, Evolution, PagBank, Documenso, Firebase, Resend, Redis e qualquer outro serviço realmente chamado.
- Para cada integração verificar: URL, TLS, autenticação, timeout, retry, tratamento de erro e dados enviados.
- Verificar se secrets são somente server-side.
- Verificar se respostas externas podem contaminar logs ou documentos.
- Verificar dependências de ambiente/provedor que não podem ser comprovadas pelo repositório.
- Registrar `KNOWLEDGE_GAP` para DPA, retenção ou infraestrutura externa não comprovada.

## 5.6 — Comunicação entre serviços

**O agente deve:**
- Mapear frontend → backend, backend → Supabase, workers → Redis, backend → APIs externas e callbacks/webhooks.
- Identificar quais conexões são autenticadas.
- Verificar least privilege de credenciais de serviço.
- Verificar TLS e validação de certificados quando aplicável.
- Verificar timeouts, retries e comportamento quando o serviço está indisponível.
- Não considerar rede interna como mecanismo suficiente de confiança.

O ASVS 5.0 exige autenticação de comunicações entre componentes backend e least privilege. citeturn0search4

## 5.7 — Rate limiting / abuso

**Revisão preliminar:** já existem `globalLimiter` e `strictLimiter`.

**Pontos a verificar:**
- Global: 200 requisições/IP por 15 minutos em produção.
- Strict: 20/IP por 15 minutos em `/api/ai` e `/api/auth`.
- O global limiter é desativado em desenvolvimento.
- Confirmar se o proxy real preserva corretamente o IP do cliente.
- Confirmar que endpoints caros fora de `/api/ai` também possuem proteção adequada.
- Verificar upload, OCR, autenticação, geração de documentos, webhooks e integrações externas.
- Não trocar números arbitrariamente; primeiro medir/justificar.

O ASVS recomenda documentação e controles contra abuso/rate limiting. citeturn0search1

## 5.8 — Erros / stack traces

**O agente deve:**
- Provocar erros 400/401/403/404/409/422/429/500 nos principais endpoints.
- Verificar resposta ao cliente e conteúdo dos logs.
- Confirmar ausência de stack trace, SQL, paths internos, tokens e secrets.
- Verificar se erros de serviços externos são normalizados.
- Confirmar que produção não devolve detalhes de debug.
- Testar falhas de dependências críticas e verificar se o sistema permanece seguro.

## 5.9 — Logs de segurança

**Revisão preliminar:** existe logger estruturado com sanitização, buffer limitado e correlação por `requestId`/`correlationId`. O endpoint de logs está protegido por autenticação + admin.

**O agente deve:**
- Auditar se autenticação e falhas de autorização relevantes são registradas.
- Verificar que PII, tokens, credenciais e dados financeiros não aparecem sem máscara.
- Verificar se a sanitização cobre todas as chaves/formatos realmente usados.
- Verificar retenção do buffer e se existe destino externo de logs em produção.
- Verificar timestamps e correlação entre serviços.
- Verificar proteção contra log injection.
- Testar `/api/logs` com usuário comum, admin e sem autenticação.

O ASVS 5.0 exige metadados suficientes para investigação, correlação, inventário de destinos e proteção de dados sensíveis nos logs. citeturn0search0turn0search11

## 5.10 — Correções

**Regra:** não começar corrigindo tudo.

1. Consolidar achados 5.1–5.9.
2. Classificar `P0/P1/P2` e `KNOWLEDGE_GAP`.
3. Corrigir somente achados comprovados.
4. Criar testes adversariais para cada correção.
5. Reexecutar os gates.
6. Fazer um único commit funcional para as correções da Fase 5.
7. Push para `main`.
8. Registrar SHA completo no roadmap.

## Ordem recomendada para o agente local

1. **5.4 CORS** — verificar primeiro, pois existe um possível fail-open concreto.
2. **5.1 Environment** — validar fail-closed de configuração crítica.
3. **5.3 Produção** — investigar demo data, startup e dependências críticas.
4. **5.2 Secrets** — fechar inventário e exposição.
5. **5.5 APIs externas**.
6. **5.6 Comunicação entre serviços**.
7. **5.7 Rate limiting / abuso**.
8. **5.8 Erros / stack traces**.
9. **5.9 Logs**.
10. **5.10 Correções**.

## Regra operacional

Não alterar arquitetura. Não criar novo mecanismo de segurança paralelo. Não inventar requisitos. Não marcar `VERIFIED` sem evidência reproduzível. Se a infraestrutura externa não puder ser comprovada, registrar `KNOWLEDGE_GAP`.
