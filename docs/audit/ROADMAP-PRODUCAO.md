# Roadmap de Produção — DefesAi

## Baseline

**Baseline congelado:** `4a30cd7a9282b87e9ed7138ad02acc1fe9933a88`

**Regra operacional:** `1 objetivo → 1 área → 1 análise → 1 decisão`

---

## Estados Permitidos por Subfase

| Estado | Significado |
|--------|-------------|
| `PENDING` | Não iniciada |
| `IN_PROGRESS` | Em execução |
| `AUDIT_NO_FINDING` | Auditoria realizada — nenhum problema encontrado |
| `FINDING` | Problema identificado |
| `CORRECTION_REQUIRED` | Correção pendente |
| `IMPLEMENTED` | Correção implementada |
| `VERIFIED` | Correção verificada |
| `BLOCKED` | Bloqueada por dependência |
| `CANCELLED` | Cancelada (não aplicável) |

---

## FASE 1 — Upload / Storage

| ID | Nome | Objetivo | Status | Dependência | Resultado | SHA | Observação |
|----|------|----------|--------|-------------|-----------|-----|------------|
| 1.1 | Upload | Verificar integridade e segurança do fluxo de upload de arquivos | IMPLEMENTED | — | 3 problemas → correções: (1) `authenticateToken` em `src/server/routes/ocr.ts`; (2) SSRF protection definitiva: raw sockets (net/tls), HTTPS conecta em validatedIP com servername=hostname (SNI), validação IPv4 completa, IPv6 completa, resolveAllIPs, TOCTOU eliminado, path+query preservados; (3) limites e redirects | 427083f7d9a3278fc22f0cb30a4d2de40bea03f8 | Upload real não implementado — apenas nome do arquivo enviado. |
| 1.2 | Autorização / ownership de arquivos | Verificar que apenas o dono de um arquivo pode fazer upload associated a ele | VERIFIED | 1.1 | Ownership de envelopes persistido no banco; backfill histórico; UUIDv5 determinístico; RLS real validado no Supabase | 20260905000001 | Projeto `llmxnpgjpxcvyrqjkfwb`: `documenso_envelopes.user_id`, índice, policies e `domain_to_uuid()` validados no banco real. |
| 1.3 | Storage / buckets / policies | Verificar configuração de storage e políticas de acesso | VERIFIED | 1.2 | Baseline RLS aplicado aos 5 buckets; 8 policies; `marketing-assets` público somente para leitura; escritas administrativas; buckets privados sem acesso público | 2ceb758f64697236a0528ab6ca1ece4052c24e31 | Banco real confirmou 5 buckets. `storage.objects` saiu de 0 policies para 8. Buckets privados sem objetos históricos. |
| 1.4 | Nome / caminho / isolamento | Verificar isolamento de caminhos e nomenclatura de arquivos | VERIFIED | 1.3 | Auditoria real dos 8 objetos: 0 nomes inválidos, 0 padrões de traversal, 0 caminhos absolutos; todos os objetos existentes pertencem exclusivamente ao bucket público `marketing-assets`; buckets privados permanecem sem objetos | 2ceb758f64697236a0528ab6ca1ece4052c24e31 | Os 8 paths existentes são UUID + sufixo de mídia (`*_diaN.png`), sem segmentos de pasta. Como todos os buckets privados são vazios e suas escritas não são autorizadas a usuários comuns, não há vetor atual de mistura entre usuários/cases. Qualquer futuro fluxo privado deverá definir explicitamente owner/case no path ou metadado antes de liberar acesso de usuário. |
| 1.5 | Validação de arquivos | Verificar validação de tipo, tamanho e conteúdo de arquivos | PENDING | 1.4 | — | — | Ainda não fechada com evidência suficiente. |
| 1.6 | Correções dos achados | Aplicar correções identificadas nas subfases anteriores | PENDING | 1.5 | — | — | Não marcar como concluída antes da validação 1.5. |
| 1.7 | Download / acesso aos arquivos | Verificar que o download é seguro e autorizado | PENDING | 1.6 | — | — | Não marcar como concluída antes da validação real. |

---

## FASE 2 — Autorização Global

| ID | Nome | Objetivo | Status | Dependência | Resultado | SHA | Observação |
|----|------|----------|--------|-------------|-----------|-----|------------|
| 2.1 | Endpoints protegidos | Mapear e verificar todos os endpoints protegidos | IN_PROGRESS | — | Cases, Documenso, OCR e Payments auditados; inventário global ainda em fechamento | 4420e3198d374ab83b1abd017a5dc5fecaa12fa7 | OWASP recomenda inventariar endpoints e verificar autenticação/autorização por operação; não marcar VERIFIED antes do inventário completo. |
| 2.2 | Cases | Verificar autorização de acesso a cases | IMPLEMENTED | 2.1 | Ownership existente preservado e novo hardening contra mass assignment/BOPLA no `PUT /api/cases/:id` | 59b0eebcbf46edcf62495ba6edee3c9d927c3906 | Ainda falta execução do conjunto final de testes para `VERIFIED`. |
| 2.3 | Documents | Verificar autorização de acesso a documentos | IMPLEMENTED | 2.2 | Documenso exige autenticação e ownership persistido em `documenso_envelopes.user_id`; `authorizeEnvelope()` consulta o banco | 41ba686 | Real DB já validado na FASE 1.2; falta consolidar teste final da subfase 2.3. |
| 2.4 | Evidence | Verificar autorização de acesso a evidências | PENDING | 2.3 | — | — | OCR possui autenticação; inventário de todas as superfícies de evidência ainda pendente. |
| 2.5 | Payments | Verificar autorização de acesso a pagamentos | IMPLEMENTED | 2.4 | Middleware global exige JWT para operações de pagamento; somente consulta pública de preço e webhooks são exceções | 4420e3198d374ab83b1abd017a5dc5fecaa12fa7 | Corrige risco de `PAYMENT_MODE=sandbox` deixar mutações/status anônimos. Falta teste final para VERIFIED. |
| 2.6 | Admin / ações privilegiadas | Verificar controles de admin e ações privilegiadas | PENDING | 2.5 | — | — | — |
| 2.7 | IDOR / IDs manipuláveis | Verificar ausência de IDOR em parâmetros manipuláveis | PENDING | 2.6 | — | — | — |
| 2.8 | Correções | Aplicar correções identificadas nas subfases anteriores | PENDING | 2.7 | — | — | — |

---

## FASE 3 — Integridade End-to-End

| ID | Nome | Objetivo | Status | Dependência | Resultado | SHA | Observação |
|----|------|----------|--------|-------------|-----------|-----|------------|
| 3.1 | Case → Evidence | Verificar integridade da cadeia Case → Evidence | PENDING | — | — | — | — |
| 3.2 | Evidence → Analysis | Verificar integridade da cadeia Evidence → Analysis | PENDING | 3.1 | — | — | — |
| 3.3 | Analysis → Arguments | Verificar integridade da cadeia Analysis → Arguments | PENDING | 3.2 | — | — | — |
| 3.4 | Arguments → Document | Verificar integridade da cadeia Arguments → Document | PENDING | 3.3 | — | — | — |
| 3.5 | Document → Persistence | Verificar integridade da persistência de documentos | PENDING | 3.4 | — | — | — |
| 3.6 | Client → Server trust boundary | Verificar limite de confiança Client ↔ Server | PENDING | 3.5 | — | — | — |
| 3.7 | Correções | Aplicar correções identificadas nas subfases anteriores | PENDING | 3.6 | — | — | — |

---

## FASE 4 — Proteção de Dados / LGPD

| ID | Nome | Objetivo | Status | Dependência | Resultado | SHA | Observação |
|----|------|----------|--------|-------------|-----------|-----|------------|
| 4.1 | Dados pessoais | Verificar tratamento de dados pessoais | PENDING | — | — | — | — |
| 4.2 | Logs | Verificar adequação de logs à LGPD | PENDING | 4.1 | — | — | — |
| 4.3 | URLs | Verificar que URLs não expõem dados pessoais | PENDING | 4.2 | — | — | — |
| 4.4 | Storage / documentos | Verificar proteção de dados em storage | PENDING | 4.3 | — | — | — |
| 4.5 | Retenção / exclusão | Verificar política de retenção e exclusão | PENDING | 4.4 | — | — | — |
| 4.6 | Serviços externos | Verificar conformidade de serviços externos | PENDING | 4.5 | — | — | — |
| 4.7 | Secrets / credenciais | Verificar gestão de secrets e credenciais | PENDING | 4.6 | — | — | — |
| 4.8 | Correções | Aplicar correções identificadas nas subfases anteriores | PENDING | 4.7 | — | — | — |

---

## FASE 5 — Produção / Infraestrutura

| ID | Nome | Objetivo | Status | Dependência | Resultado | SHA | Observação |
|----|------|----------|--------|-------------|-----------|-----|------------|
| 5.1 | Environment | Verificar configuração de ambiente | PENDING | — | — | — | — |
| 5.2 | Secrets | Verificar gestão de secrets | PENDING | 5.1 | — | — | — |
| 5.3 | Configuração de produção | Verificar config de produção | PENDING | 5.2 | — | — | — |
| 5.4 | CORS / headers / HTTP security | Verificar headers de segurança HTTP | PENDING | 5.3 | — | — | — |
| 5.5 | APIs externas | Verificar APIs externas | PENDING | 5.4 | — | — | — |
| 5.6 | Comunicação entre serviços | Verificar comunicação interna | PENDING | 5.5 | — | — | — |
| 5.7 | Rate limiting / abuso | Verificar controles de rate limiting | PENDING | 5.6 | — | — | — |
| 5.8 | Erros / stack traces | Verificar tratamento de erros em produção | PENDING | 5.7 | — | — | — |
| 5.9 | Logs de segurança | Verificar logs de segurança | PENDING | 5.8 | — | — | — |
| 5.10 | Correções | Aplicar correções identificadas nas subfases anteriores | PENDING | 5.9 | — | — | — |

### Instruções básicas — FASE 5

**5.1 — Environment**
- Ler `.env`, `.env.example` e configurações usadas em produção.
- Verificar valores, defaults, ambientes e configurações inseguras.
- Não expor secrets no relatório.
- Registrar somente problemas comprovados.

**5.2 — Secrets**
- Inventariar todas as credenciais usadas pela aplicação.
- Verificar origem, uso server-side e ausência de secrets no frontend/logs/repositório.
- Não rotacionar nem alterar credenciais sem evidência de necessidade.
- Registrar `KNOWLEDGE_GAP` quando a gestão externa não puder ser comprovada.

**5.3 — Configuração de produção**
- Mapear configurações efetivamente usadas em produção.
- Comparar configuração real com defaults de desenvolvimento/teste.
- Verificar modos `production`, `development`, `test` e flags críticas.
- Corrigir somente configurações comprovadamente inseguras.

**5.4 — CORS / headers / HTTP security**
- Auditar CORS, CSP, HSTS, X-Content-Type-Options e demais headers efetivamente aplicados.
- Verificar origem permitida, métodos e credenciais.
- Testar comportamento real dos endpoints HTTP.
- Não adicionar header sem necessidade demonstrada.

**5.5 — APIs externas**
- Inventariar cada API externa realmente utilizada.
- Verificar autenticação, timeout, TLS, tratamento de erro e exposição de dados.
- Confirmar que secrets não chegam ao cliente.
- Registrar `KNOWLEDGE_GAP` quando retenção/DPA/provedor não puder ser comprovado.

**5.6 — Comunicação entre serviços**
- Mapear chamadas entre frontend, backend, workers, banco e serviços externos.
- Verificar autenticação e autorização entre serviços.
- Verificar TLS e validação de destino quando aplicável.
- Não assumir segurança apenas pela rede interna.

**5.7 — Rate limiting / abuso**
- Identificar endpoints de alto custo ou alto risco de abuso.
- Verificar rate limiting real, limites de payload e proteção contra repetição.
- Priorizar autenticação, upload, OCR, geração e integrações externas.
- Não criar limites arbitrários sem justificativa técnica.

**5.8 — Erros / stack traces**
- Provocar erros controlados nos principais endpoints.
- Verificar resposta HTTP, logs e mensagens retornadas ao cliente.
- Confirmar que stack traces, paths internos, SQL e secrets não são expostos.
- Preservar detalhes úteis somente em logs seguros.

**5.9 — Logs de segurança**
- Mapear eventos de autenticação, autorização, falhas e ações privilegiadas.
- Verificar conteúdo, nível de detalhe e exposição de dados pessoais/secrets.
- Confirmar que eventos relevantes podem ser investigados posteriormente.
- Não adicionar logging indiscriminado.

**5.10 — Correções**
- Consolidar somente achados comprovados das subfases 5.1–5.9.
- Corrigir o mínimo necessário.
- Criar testes para cada correção relevante.
- Validar novamente antes de marcar a fase como concluída.

---

## FASE 6 — Testes / Release Candidate

| ID | Nome | Objetivo | Status | Dependência | Resultado | SHA | Observação |
|----|------|----------|--------|-------------|-----------|-----|------------|
| 6.1 | Inventário de testes | Inventariar testes existentes | PENDING | — | — | — | — |
| 6.2 | Autenticação | Verificar testes de autenticação | PENDING | 6.1 | — | — | — |
| 6.3 | Autorização | Verificar testes de autorização | PENDING | 6.2 | — | — | — |
| 6.4 | Upload / Evidence | Verificar testes de upload e evidências | PENDING | 6.3 | — | — | — |
| 6.5 | Geração de defesa | Verificar testes de geração de defesa | PENDING | 6.4 | — | — | — |
| 6.6 | Pagamento | Verificar testes de pagamento | PENDING | 6.5 | — | — | — |
| 6.7 | Onboarding | Verificar testes de onboarding | PENDING | 6.6 | — | — | — |
| 6.8 | E2E crítico | Verificar testes E2E de caminhos críticos | PENDING | 6.7 | — | — | — |
| 6.9 | Build / lint / TypeScript | Verificar build, lint e TypeScript | PENDING | 6.8 | — | — | — |
| 6.10 | Release Candidate | Preparar e validar release candidate | PENDING | 6.9 | — | — | — |

### Instruções básicas — FASE 6

**6.1 — Inventário de testes**
- Listar testes unitários, integração, auditoria e E2E existentes.
- Identificar testes duplicados, quebrados e áreas sem cobertura.
- Não alterar testes apenas para melhorar métricas.
- Definir o conjunto mínimo necessário para release.

**6.2 — Autenticação**
- Testar login, sessão, expiração e acesso sem autenticação.
- Cobrir caminhos positivos e negativos.
- Confirmar que endpoints protegidos rejeitam chamadas anônimas.
- Não aceitar mocks como substitutos de fluxos críticos reais quando o teste exigir integração.

**6.3 — Autorização**
- Testar ownership, roles e recursos de outros usuários.
- Criar casos adversariais para IDs manipulados.
- Verificar que negar acesso não vaza dados.
- Cobrir endpoints e ações privilegiadas.

**6.4 — Upload / Evidence**
- Testar tipo, tamanho, conteúdo e autorização dos arquivos.
- Testar caminhos inválidos e acesso cruzado entre usuários/cases.
- Verificar persistência e leitura das evidências.
- Não tratar nome de arquivo ou metadado como prova jurídica.

**6.5 — Geração de defesa**
- Testar Case → Evidence → Analysis → Arguments → Document.
- Testar dados ausentes, placeholders e argumentos não autorizados.
- Confirmar comportamento fail-closed.
- Confirmar que conteúdo jurídico não é inventado por fallback.

**6.6 — Pagamento**
- Testar criação, consulta, webhook, status e falhas.
- Cobrir sandbox/production sem misturar comportamentos.
- Verificar ownership do pagamento.
- Não usar valores reais ou credenciais reais nos testes.

**6.7 — Onboarding**
- Testar fluxo completo do primeiro acesso até a criação/uso do case.
- Cobrir retomada, refresh, sessão e dados incompletos.
- Verificar que estados inválidos não liberam etapas indevidamente.
- Priorizar o fluxo atualmente ativo em produção.

**6.8 — E2E crítico**
- Executar os caminhos críticos de ponta a ponta.
- Priorizar autenticação, case, upload/evidence, análise, documento e pagamento.
- Registrar falhas reproduzíveis com evidência.
- Não mascarar falhas com aumento arbitrário de timeout ou relaxamento de asserts.

**6.9 — Build / lint / TypeScript**
- Executar `npm run test:unit`.
- Executar `npm run lint`.
- Executar `npx tsc --noEmit`.
- Executar `npm run build`.
- Registrar resultados reais, inclusive warnings relevantes.

**6.10 — Release Candidate**
- Congelar o conjunto de mudanças aprovado.
- Executar a suíte final de validação.
- Confirmar working tree limpa e commit identificável.
- Só considerar RC pronto quando os gates definidos estiverem verdes.

---

## FASE 7 — Auditoria Final

| ID | Nome | Objetivo | Status | Dependência | Resultado | SHA | Observação |
|----|------|----------|--------|-------------|-----------|-----|------------|
| 7.1 | Regressão | Verificar regressão geral | PENDING | — | — | — | — |
| 7.2 | Critical paths | Verificar caminhos críticos | PENDING | 7.1 | — | — | — |
| 7.3 | Security final | Auditoria final de segurança | PENDING | 7.2 | — | — | — |
| 7.4 | Legal integrity final | Verificar integridade legal final | PENDING | 7.3 | — | — | — |
| 7.5 | Persistence / payments | Verificar persistência e pagamentos | PENDING | 7.4 | — | — | — |
| 7.6 | Production configuration | Verificar configuração de produção | PENDING | 7.5 | — | — | — |
| 7.7 | Observability / recovery | Verificar observabilidade e recuperação | PENDING | 7.6 | — | — | — |
| 7.8 | Auditoria final independente | Auditoria independente | PENDING | 7.7 | — | — | — |
| 7.9 | Score de readiness | Calcular score de readiness | PENDING | 7.8 | — | — | — |
| 7.10 | GO / NO-GO | Decisão final de produção | PENDING | 7.9 | — | — | — |

### Instruções básicas — FASE 7

**7.1 — Regressão**
- Executar a suíte completa definida no projeto.
- Comparar falhas com o baseline conhecido.
- Investigar qualquer regressão antes de avançar.
- Não ignorar testes por serem antigos sem evidência de obsolescência.

**7.2 — Critical paths**
- Reexecutar os fluxos críticos completos.
- Verificar autenticação, case, evidence, análise, documento e pagamento.
- Confirmar entradas, saídas e persistência em cada fronteira.
- Registrar qualquer divergência como achado.

**7.3 — Security final**
- Revisar autenticação, autorização, IDOR, upload, secrets, APIs e produção.
- Revalidar correções das fases anteriores.
- Testar casos adversariais críticos.
- Não declarar seguro o que não foi efetivamente verificado.

**7.4 — Legal integrity final**
- Verificar que somente conteúdo jurídico autorizado é usado.
- Confirmar fail-closed para dados insuficientes e placeholders.
- Confirmar vigência e fonte quando houver regra temporal.
- `KNOWLEDGE_GAP` quando a base jurídica não puder ser comprovada.

**7.5 — Persistence / payments**
- Verificar que dados importantes persistem corretamente.
- Conferir ownership e integridade de registros financeiros.
- Testar idempotência e webhooks quando aplicável.
- Confirmar que falhas não geram estados financeiros inconsistentes.

**7.6 — Production configuration**
- Revalidar environment, secrets, CORS, headers, URLs e integrações.
- Confirmar que configurações de teste/sandbox não estão ativas indevidamente.
- Conferir dependências externas críticas.
- Registrar diferenças entre ambiente auditado e produção real.

**7.7 — Observability / recovery**
- Verificar logs, métricas, alertas e rastreabilidade dos erros críticos.
- Testar recuperação de falhas relevantes quando possível.
- Confirmar que logs não expõem secrets ou PII desnecessária.
- Documentar limitações reais de recuperação.

**7.8 — Auditoria final independente**
- Reavaliar o sistema sem assumir que fases anteriores estão corretas.
- Procurar inconsistências, regressões e lacunas.
- Revisar evidências e SHAs registrados no roadmap.
- Não alterar o escopo para criar artificialmente novos achados.

**7.9 — Score de readiness**
- Basear o score somente em evidências verificadas.
- Separar `PASS`, `FAIL`, `BLOCKED` e `KNOWLEDGE_GAP`.
- Não compensar um bloqueio crítico com pontos de outras áreas.
- Registrar claramente os critérios utilizados.

**7.10 — GO / NO-GO**
- Consolidar todos os bloqueadores críticos.
- Confirmar testes, segurança, integridade legal e produção.
- `NO-GO` se existir bloqueador crítico não resolvido.
- `GO` somente com evidência suficiente para os critérios definidos.

---

## Notas

- Este arquivo é a **fonte de verdade** do andamento das fases.
- Cada atualização de status deve incluir evidência concreta.
- SHAs devem ser registrados apenas quando uma correção for implementada e verificada.
- Não inventar resultados — registrar apenas o que foi efetivamente realizado.
- Storage: operações sobre objetos devem usar a API de Storage; consultas SQL são somente para evidência/auditoria. As policies RLS são versionadas em migrations.
- As instruções adicionadas nas FASES 5–7 são orientação operacional básica; não substituem a auditoria concreta nem autorizam mudanças fora do escopo da subfase.
