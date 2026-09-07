# FASE 8-PROD — AUDITORIA OPERACIONAL DE PRODUÇÃO / VERCEL

## Objetivo

Auditar exclusivamente a operação real do Adeus Multas no Vercel Production, sem iniciar uma nova refatoração e sem corrigir código sem evidência suficiente.

A auditoria deve fechar dois pontos que permanecem abertos após a validação de produção:

1. pipeline de IA: determinar se a ausência de NVIDIA é apenas configuração opcional ou se deixa a produção sem provider operacional;
2. rate limiting / trust proxy: determinar a topologia real de proxies antes de qualquer configuração de `trust proxy`.

O deployment auditado atualmente é:

- Projeto Vercel: `defesai`
- Production deployment: `dpl_7ts5xoqUXCv2xWSUj9yrfDcjokc8`
- Commit: `751632b6d279d48844dfecbd1e7d5e42da1309a2`
- Branch: `main`
- Região: `iad1`
- Domínios principais: `www.defesai.shop`, `defesai.shop`, `adeusmultas.defesai.shop`

## REGRA PRINCIPAL

> Primeiro provar. Depois decidir. Só corrigir se houver achado comprovado.

Não fazer `trust proxy = 1` ou `trust proxy = 2` por tentativa.

Não alterar secrets.

Não expor valores de Environment Variables.

Não fazer deploy apenas para testar.

Não transformar `KNOWLEDGE_GAP` em PASS.

Não inventar funcionamento de fallback.

---

## 1. AUDITAR O PIPELINE DE IA

### 1.1 Código

Localizar no repositório:

- `NVIDIA_API_KEY`
- `NVIDIA_API_KEY_2`
- `NVIDIA_API_KEY_3`
- `NINEROUTER_KEY`
- `NINEROUTER_URL`
- NVIDIA key rotator
- provider selection
- fallback
- chamadas de geração de IA

Mapear:

```text
entrada da aplicação
    ↓
provider selection
    ↓
NVIDIA?
    ↓
fallback?
    ↓
9Router / outro provider
    ↓
resultado
```

### 1.2 Produção

O Vercel registrou em runtime:

```text
[NVIDIA Key Rotator] No valid NVIDIA API keys found
```

Isso é evidência real, mas NÃO prova que a IA esteja quebrada.

Determinar:

- NVIDIA é provider obrigatório?
- NVIDIA é provider preferencial?
- ausência de NVIDIA deveria acionar fallback?
- qual fallback é efetivamente implementado?
- existe rota/fluxo seguro que permita comprovar o fallback em produção?

### 1.3 Secrets

É proibido:

- imprimir secrets;
- registrar valores em logs;
- copiar secrets para arquivos;
- expor secrets no relatório.

Se a conexão Vercel não permitir confirmar somente a existência/target da variável:

```text
KNOWLEDGE_GAP
```

### 1.4 Resultado esperado

Classificar somente em um dos casos:

```text
NVIDIA ausente + fallback comprovadamente funcional
→ P2/configuração incompleta
```

```text
NVIDIA ausente + fallback inexistente/inoperante
→ P1 produção
```

```text
NVIDIA presente + rotator rejeita as chaves
→ investigar validação/configuração
```

```text
não foi possível comprovar
→ KNOWLEDGE_GAP
```

---

## 2. AUDITAR TRUST PROXY / RATE LIMITING

### Evidência já confirmada em produção

O runtime atual registra:

```text
ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
ERR_ERL_FORWARDED_HEADER
```

em `/api/index`.

Também foi confirmado:

- `X-Forwarded-For` presente;
- `Forwarded` presente;
- Express com `trust proxy = false`;
- `express-rate-limit` detectando a inconsistência.

### 2.1 NÃO corrigir ainda

Não adicionar:

```ts
app.set('trust proxy', 1)
```

nem:

```ts
app.set('trust proxy', 2)
```

sem provar a cadeia real.

### 2.2 Determinar topologia

Investigar exclusivamente evidências disponíveis em:

- Vercel Project;
- deployment;
- domínio `www.defesai.shop`;
- DNS/documentação versionada;
- `vercel.json`;
- Cloudflare configuration/documentação existente no projeto;
- headers reais da produção;
- configuração do servidor Express.

Determinar se o caminho real é:

```text
cliente → Vercel → Express
```

ou:

```text
cliente → Cloudflare → Vercel → Express
```

ou outra cadeia comprovada.

Não inferir quantidade de proxies.

### 2.3 Rate limiting

Mapear:

- limiter global;
- limiter estrito;
- keyGenerator;
- uso de `req.ip`;
- endpoints protegidos;
- comportamento quando headers forwarded existem.

Determinar se o rate limiting está:

- funcional;
- apenas gerando warning;
- identificando incorretamente clientes;
- potencialmente vulnerável a spoofing.

Se não houver evidência suficiente:

```text
KNOWLEDGE_GAP
```

---

## 3. AUDITAR PAGAMENTOS EM PRODUÇÃO

Sem acessar secrets.

Verificar no código:

- `PAYMENT_MODE`;
- `PAYMENT_ACTIVE_GATEWAY`;
- `GGPIX_ENABLED`;
- gateway efetivo;
- rotas de criação/consulta;
- webhook;
- idempotência;
- proteção de produção.

O `.env.example` não deve ser tratado como prova do Vercel Production.

Provar, através do comportamento do deployment e dos logs permitidos, se:

```text
production
    ↓
gateway esperado
    ↓
webhook protegido
    ↓
idempotência
```

está operacional.

Se sandbox/production não puder ser distinguido com evidência suficiente:

```text
KNOWLEDGE_GAP
```

---

## 4. AUDITAR DEPLOYMENT

Confirmar:

- deployment atual está `READY`;
- commit corresponde ao `main` auditado;
- build terminou sem erro;
- warnings relevantes estão documentados;
- não existe 5xx atual significativo;
- source maps não estão publicamente expostos;
- headers de segurança continuam presentes;
- domínio HTTPS funciona.

Não transformar warnings de bundle em bloqueador sem evidência de impacto.

---

## 5. NÃO ALTERAR NESTA FASE

Não modificar:

- autenticação;
- autorização;
- banco;
- RLS;
- arquitetura jurídica;
- `ARGUMENTS_CATALOG`;
- Rule Engine;
- RAG;
- DocumentAssemblyEngine;
- pagamentos;
- onboarding;
- infraestrutura externa;
- secrets;
- `vercel.json` apenas para silenciar warning;
- trust proxy sem topologia comprovada.

Não fazer refatoração.

---

## 6. TESTES / EVIDÊNCIAS

Executar, quando aplicável:

```bash
npm run test:unit
npm run lint
npx tsc --noEmit
npm run build
```

Além disso, executar somente smoke tests de produção que não alterem dados financeiros nem dados de usuários.

Não usar credenciais reais em testes locais.

Não criar dados de produção apenas para satisfazer o gate.

---

## 7. RESULTADO OBRIGATÓRIO

Produzir relatório:

```text
FASE 8-PROD — AUDITORIA VERCEL

Deployment:
<id>

Commit:
<SHA>

Status:
PASS / GO WITH LIMITATION / BLOCKED / NO-GO

IA / NVIDIA:
- ...

Fallback de IA:
- ...

Trust Proxy:
- ...

Rate Limiting:
- ...

Pagamentos:
- ...

Deployment / Build:
- ...

5xx:
- ...

Source Maps:
- ...

Headers:
- ...

P1:
- ...

P2:
- ...

KNOWLEDGE_GAP:
- ...

Correções necessárias:
- ...

Arquivos alterados:
- ...
```

## 8. REGRA DE COMMIT

Esta etapa é primeiro uma auditoria.

Se não houver correção de código comprovadamente necessária:

- NÃO inventar alteração funcional;
- atualizar somente documentação/roadmap se necessário;
- criar um único commit de encerramento da auditoria;
- push para `main`.

Se houver correção funcional comprovada:

1. alterar somente o código diretamente relacionado ao achado;
2. adicionar testes;
3. executar gates;
4. revisar diff;
5. criar UM ÚNICO commit;
6. push para `main`;
7. aguardar/verificar novo deployment Vercel;
8. reportar SHA completo e deployment.

Nunca fazer uma correção especulativa para `trust proxy`.

Nunca acessar ou expor valores de secrets.

Não iniciar outra fase após esta auditoria.
