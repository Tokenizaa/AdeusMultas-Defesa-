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
| 1.1 | Upload | Verificar integridade e segurança do fluxo de upload de arquivos | IMPLEMENTED | — | 3 problemas → 3 correções: (1) `authenticateToken` adicionado em `src/server/routes/ocr.ts`; (2) SSRF protection com `validateFetchUrl` em `src/server/services/ocr-service.ts` (bloqueia private IPs, localhost, esquemas não-HTTP, metadata endpoints); (3) Limites de recursos: 5MB max download, 7MB max base64 | 1d4e0e86a20f70333376a706b38e40b2f12ee14c | Upload real não implementado — apenas nome do arquivo é enviado (não conteúdo). Severidades: Missing auth=Medium, SSRF=High, Upload não implementado=Low |
| 1.2 | Autorização / ownership de arquivos | Verificar que apenas o dono de um arquivo pode fazer upload associated a ele | PENDING | 1.1 | — | — | — |
| 1.3 | Storage / buckets / policies | Verificar configuração de storage e políticas de acesso | PENDING | 1.2 | — | — | — |
| 1.4 | Nome / caminho / isolamento | Verificar isolamento de caminhos e nomenclatura de arquivos | PENDING | 1.3 | — | — | — |
| 1.5 | Validação de arquivos | Verificar validação de tipo, tamanho e conteúdo de arquivos | PENDING | 1.4 | — | — | — |
| 1.6 | Correções dos achados | Aplicar correções identificadas nas subfases anteriores | PENDING | 1.5 | — | — | — |
| 1.7 | Download / acesso aos arquivos | Verificar que o download é seguro e autorizado | PENDING | 1.6 | — | — | — |

---

## FASE 2 — Autorização Global

| ID | Nome | Objetivo | Status | Dependência | Resultado | SHA | Observação |
|----|------|----------|--------|-------------|-----------|-----|------------|
| 2.1 | Endpoints protegidos | Mapear e verificar todos os endpoints protegidos | PENDING | — | — | — | — |
| 2.2 | Cases | Verificar autorização de acesso a cases | PENDING | 2.1 | — | — | — |
| 2.3 | Documents | Verificar autorização de acesso a documentos | PENDING | 2.2 | — | — | — |
| 2.4 | Evidence | Verificar autorização de acesso a evidências | PENDING | 2.3 | — | — | — |
| 2.5 | Payments | Verificar autorização de acesso a pagamentos | PENDING | 2.4 | — | — | — |
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
| 3.6 | Client → Server trust boundary | Verificar边界 de confiança Client ↔ Server | PENDING | 3.5 | — | — | — |
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

---

## Notas

- Este arquivo é a **fonte de verdade** do andamento das fases.
- Cada atualização de status deve incluir evidência concreta.
- SHAs devem ser registrados apenas quando uma correção for implementada e verificada.
- Não inventar resultados — registrar apenas o que foi efetivamente realizado.
