# FASE 7 — REVISÃO PRÉ-EXECUÇÃO DA AUDITORIA FINAL

## Objetivo

A Fase 7 é a **última fase da auditoria**. Ela não deve funcionar como mais uma rodada genérica de testes. Seu objetivo é consolidar evidências das fases anteriores, procurar regressões e inconsistências residuais e produzir uma decisão objetiva de produção: **GO, NO-GO ou BLOCKED**.

A metodologia deve ser baseada em evidência, risco e reprodução. O OWASP ASVS 5.0 é uma referência para estabelecer confiança nos controles técnicos; o WSTG recomenda mapear a superfície, caminhos principais e registrar testes reproduzíveis antes de concluir uma avaliação. citeturn0search14turn0search4turn0search1turn0search2

Esta revisão **não implementa correções da Fase 7**. Ela prepara o agente local para executar a auditoria final sem transformar ausência de evidência em aprovação.

---

# Regra central da Fase 7

A Fase 7 deve responder:

```text
O sistema que está em main neste momento
é suficientemente comprovado para produção?
```

Não responder:

```text
O sistema parece pronto?
```

Nem:

```text
Todos os testes passaram, então está pronto.
```

A decisão final precisa considerar simultaneamente:

```text
regressão
+
critical paths
+
segurança
+
integridade jurídica
+
persistência/pagamentos
+
configuração de produção
+
observabilidade/recuperação
+
auditoria independente
+
gaps/bloqueios
```

---

# Estado esperado antes de iniciar

A Fase 7 depende da Fase 6, mas **não deve assumir que a Fase 6 está correta apenas porque foi marcada como concluída**.

Antes de começar:

```bash
git fetch origin
git status
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
```

Confirmar:

1. branch correta;
2. working tree limpa ou alterações explicitamente justificadas;
3. SHA atual da `main`;
4. último SHA registrado para cada fase/subfase;
5. documentação das fases 1–6 disponível;
6. gaps e bloqueios anteriores conhecidos;
7. nenhuma alteração local não auditada.

Se a `main` estiver atrás de `origin/main`, sincronizar antes da auditoria.

---

# 7.1 — Regressão

## Objetivo

Provar que as correções acumuladas das fases anteriores não quebraram funcionalidades previamente válidas.

## O agente deve

1. identificar o baseline relevante;
2. identificar os commits de correção das fases anteriores;
3. executar a suíte oficial completa;
4. comparar falhas atuais com o baseline conhecido;
5. classificar cada diferença como:
   - regressão real;
   - teste obsoleto;
   - falha ambiental;
   - dependência externa;
   - flaky;
   - comportamento deliberadamente alterado;
   - `KNOWLEDGE_GAP`.

6. Não aceitar simplesmente uma suíte verde como prova de ausência de regressão.

## Deve ser revisado especialmente

- autenticação;
- authorization/ownership;
- cases;
- evidence/upload;
- OCR/analysis;
- arguments;
- document assembly;
- persistência;
- payments;
- onboarding;
- integrações externas.

## Critério

Qualquer regressão funcional ou de segurança não explicada bloqueia o fechamento da Fase 7.

---

# 7.2 — Critical Paths

## Objetivo

Reexecutar os caminhos de negócio completos e verificar as fronteiras entre domínios.

## Caminho crítico principal

```text
usuário
→ autenticação
→ onboarding/case
→ evidence
→ analysis
→ recommended/permitted arguments
→ document assembly
→ persistência
```

## Caminho financeiro

```text
case
→ pagamento
→ webhook/retorno
→ estado persistido
→ recurso liberado somente quando autorizado
```

## Caminho adversarial

```text
usuário A
→ tenta acessar/manipular recurso de B
→ operação negada
→ nenhum dado de B exposto
→ nenhum estado alterado
```

## Caminho de falha

```text
dependência crítica indisponível
→ operação falha
→ estado seguro
→ sem documento falso
→ sem pagamento falso
→ sem acesso indevido
```

## Regra

Testar não apenas entrada e saída. Verificar:

```text
entrada
→ transformação
→ autorização
→ persistência
→ saída
```

em cada fronteira relevante.

---

# 7.3 — Security Final

## Objetivo

Realizar a última revisão de segurança sem presumir que as fases anteriores eliminaram todos os riscos.

## Superfícies mínimas

### Autenticação

- tokens;
- sessão;
- expiração;
- endpoints protegidos;
- endpoints públicos legítimos;
- falhas de autenticação.

### Autorização

- ownership;
- IDOR/BOLA;
- BOPLA/mass assignment;
- admin;
- documentos;
- evidências;
- pagamentos;
- parâmetros manipuláveis.

### Input / upload

- MIME;
- tamanho;
- extensão;
- traversal;
- SSRF;
- redirects;
- URLs externas;
- payloads inesperados.

### Secrets

- frontend;
- logs;
- respostas HTTP;
- fixtures;
- scripts;
- artefatos de build;
- repositório.

### HTTP / produção

- CORS;
- headers;
- TLS onde verificável;
- cookies/tokens;
- mensagens de erro;
- rate limiting;
- exposição de endpoints.

O WSTG trata configuração, autenticação, autorização, validação de entrada, tratamento de erros, criptografia, lógica de negócio e APIs como áreas distintas de teste; a auditoria final deve evitar reduzir segurança a um único checklist. citeturn0search4turn0search6turn0search10

## Regra

Não marcar `SECURITY PASS` por ausência de achados.

Marcar somente quando os controles críticos tiverem sido efetivamente testados ou quando uma limitação estiver documentada.

---

# 7.4 — Legal Integrity Final

## Objetivo

Esta é a última barreira contra conteúdo jurídico inventado ou conclusões jurídicas produzidas sem evidência suficiente.

## Verificar

### Conteúdo jurídico

- somente argumentos autorizados;
- catálogo canônico preservado;
- nenhuma tese inventada por fallback;
- nenhum pedido jurídico genérico sem fundamento autorizado;
- nenhum fato fabricado;
- nenhum fato inferido a partir da ausência de dados.

### Pipeline

```text
Case
→ Analysis
→ Arguments
→ Document
```

Verificar que nenhuma fronteira amplia indevidamente o conteúdo recebido.

### Fail closed

Confirmar:

```text
placeholder não resolvido
→ documento não pronto

validation inválida
→ documento não pronto

dado obrigatório ausente
→ sem conclusão jurídica

argumento não autorizado
→ não entra no documento

base jurídica não comprovada
→ KNOWLEDGE_GAP
```

### Vigência

Quando uma regra depende de data:

```text
norma
+
data da infração
+
vigência comprovada
=
regra aplicável
```

Nunca aplicar automaticamente norma atual a fato histórico.

## Critério P0

Qualquer possibilidade de documento jurídico válido ser produzido com conteúdo inventado ou dados obrigatórios ausentes é **NO-GO** até correção e teste de regressão.

---

# 7.5 — Persistence / Payments

## Objetivo

Verificar que o estado persistido corresponde ao estado observado pelo usuário e que operações financeiras são consistentes.

## Persistência

Verificar:

- criação;
- atualização;
- exclusão;
- ownership;
- relações Case/Evidence/Analysis/Document;
- consistência após falhas;
- transações/idempotência quando aplicável;
- ausência de estado fantasma.

## Payments

Verificar:

- criação;
- identificação do usuário/case;
- valor efetivamente usado pelo backend;
- webhook;
- assinatura/autenticidade quando aplicável;
- replay;
- idempotência;
- transições de status;
- falha do provedor;
- sandbox/production;
- ausência de acesso cruzado.

## Regra

Não considerar pagamento aprovado porque o cliente exibiu um estado de sucesso.

O estado autoritativo deve ser determinado pela fonte persistida e pelo fluxo backend comprovado.

---

# 7.6 — Production Configuration

## Objetivo

Realizar uma última verificação de que o artefato candidato não depende acidentalmente de configuração de desenvolvimento/teste.

## Revisar

- `NODE_ENV`;
- URLs públicas;
- URLs internas;
- CORS;
- secrets;
- sandbox/production;
- debug;
- flags experimentais;
- endpoints de teste;
- dados demo/sample;
- workers;
- jobs;
- Redis;
- Supabase;
- APIs externas;
- webhooks;
- portas/configuração de servidor;
- configurações de build.

## Regra

Não afirmar que produção está correta quando somente o repositório foi inspecionado e a configuração real não foi disponibilizada.

Nesse caso:

```text
KNOWLEDGE_GAP
```

com indicação exata do que não pôde ser comprovado.

O WSTG destaca a necessidade de revisar configurações e remover/debugar componentes que não deveriam estar presentes em produção. citeturn0search10

---

# 7.7 — Observability / Recovery

## Objetivo

Verificar se uma falha crítica pode ser detectada, investigada e recuperada de maneira conhecida.

## Observabilidade

Verificar:

- logs estruturados;
- request/correlation ID;
- eventos de autenticação/autorização;
- falhas críticas;
- falhas de integração;
- pagamentos;
- jobs/workers;
- erros de geração de documentos;
- alertas existentes, quando comprováveis.

## Recovery

Testar, quando possível e seguro:

- reinício do serviço;
- indisponibilidade de dependência;
- retry;
- job interrompido;
- webhook duplicado;
- falha durante persistência;
- recuperação sem duplicar estado financeiro/documental.

## Limitação

Não inventar RTO, RPO, SLA ou política de backup.

Se não houver evidência operacional:

```text
KNOWLEDGE_GAP
```

---

# 7.8 — Auditoria Final Independente

## Objetivo

Reavaliar o produto como se fosse uma auditoria nova, sem confiar cegamente nas conclusões anteriores.

## Procedimento

1. Ler o roadmap inteiro.
2. Ler os relatórios das fases 1–6.
3. Conferir os SHAs.
4. Conferir se os commits realmente correspondem aos achados descritos.
5. Escolher amostras de cada domínio.
6. Reexecutar controles críticos.
7. Procurar inconsistências entre documentação e código.
8. Procurar inconsistências entre testes e comportamento real.
9. Procurar funcionalidades declaradas mas não comprovadas.
10. Procurar gaps classificados como resolvidos sem evidência suficiente.

## Regra

A auditoria independente deve poder chegar a:

```text
FINDING
```

mesmo que todas as fases anteriores estejam marcadas como `VERIFIED`.

Não reabrir fases por mera preferência de estilo. Reabrir somente quando houver evidência de inconsistência ou risco material.

---

# 7.9 — Score de Readiness

## Objetivo

Criar uma avaliação quantitativa somente para facilitar a decisão, nunca para esconder bloqueadores.

## Modelo recomendado

Separar dimensões:

| Dimensão | Estado |
|---|---|
| Funcional | PASS / FAIL / BLOCKED |
| Segurança | PASS / FAIL / BLOCKED |
| Jurídico | PASS / FAIL / BLOCKED / KNOWLEDGE_GAP |
| Persistência | PASS / FAIL / BLOCKED |
| Pagamentos | PASS / FAIL / BLOCKED |
| Produção | PASS / FAIL / BLOCKED / KNOWLEDGE_GAP |
| Observabilidade | PASS / FAIL / BLOCKED / KNOWLEDGE_GAP |
| Testes/E2E | PASS / FAIL / BLOCKED |

## Regra fundamental

Não fazer média simples para esconder um bloqueador.

Exemplo proibido:

```text
9 áreas PASS
1 área crítica FAIL
= 90% → GO
```

Um bloqueador crítico deve permanecer bloqueador independentemente do score.

## O score deve registrar

- evidência;
- critério;
- resultado;
- severidade;
- limitação;
- responsável pela decisão, quando aplicável.

---

# 7.10 — GO / NO-GO

## Objetivo

Produzir a decisão final da auditoria.

### GO

Somente quando:

- nenhum P0/P1 bloqueante permanecer;
- critical paths comprovados;
- segurança crítica comprovada;
- integridade jurídica comprovada;
- persistência/pagamentos consistentes;
- configuração de produção suficientemente comprovada;
- testes/gates finais verdes;
- limitações restantes não forem bloqueantes;
- todos os `KNOWLEDGE_GAP`s relevantes estiverem documentados.

### NO-GO

Quando existir:

- vulnerabilidade crítica;
- regressão crítica;
- falha de autorização/ownership;
- documento jurídico que pode ser produzido com conteúdo inventado;
- pagamento inconsistente ou manipulável;
- configuração de produção insegura comprovada;
- teste crítico ausente que impeça comprovação do controle;
- bloqueador P0/P1 não corrigido.

### BLOCKED

Quando a decisão depender de evidência externa essencial que não está disponível, por exemplo:

- infraestrutura real não acessível;
- credenciais necessárias não disponíveis;
- provedor externo essencial indisponível;
- configuração de produção real não fornecida;
- requisito operacional que não pode ser verificado no ambiente atual.

`BLOCKED` não é `GO`.

---

# Evidência obrigatória do fechamento

O relatório final da Fase 7 deve registrar:

```text
FASE 7 — AUDITORIA FINAL

Baseline:
<sha>

Commit auditado:
<sha>

7.1 Regressão: PASS/FAIL/BLOCKED
7.2 Critical paths: PASS/FAIL/BLOCKED
7.3 Security final: PASS/FAIL/BLOCKED
7.4 Legal integrity: PASS/FAIL/BLOCKED/KNOWLEDGE_GAP
7.5 Persistence/payments: PASS/FAIL/BLOCKED
7.6 Production configuration: PASS/FAIL/BLOCKED/KNOWLEDGE_GAP
7.7 Observability/recovery: PASS/FAIL/BLOCKED/KNOWLEDGE_GAP
7.8 Independent audit: PASS/FAIL
7.9 Readiness score: <resultado>
7.10 Decision: GO/NO-GO/BLOCKED

P0:
- ...

P1:
- ...

P2:
- ...

KNOWLEDGE_GAP:
- ...

BLOCKED:
- ...

Testes:
- unit: ...
- integration: ...
- E2E: ...
- lint: ...
- tsc: ...
- build: ...

Commit final:
<SHA COMPLETO>
```

---

# Correções da Fase 7

A auditoria deve separar claramente:

```text
AUDIT FINDING
        ↓
DECISION
        ↓
CORRECTION REQUIRED?
        ↓
CORRECTION
        ↓
REGRESSION TEST
        ↓
RE-AUDIT
```

Não corrigir e declarar resolvido na mesma evidência sem revalidação.

Se houver correções funcionais:

1. aplicar somente o mínimo necessário;
2. criar testes de regressão;
3. executar os gates;
4. revisar `git diff`;
5. criar **um único commit funcional de fechamento da Fase 7**;
6. push para `main`;
7. registrar SHA completo;
8. reexecutar a auditoria final sobre esse SHA.

Se não houver correção funcional:

- criar **um único commit de documentação/auditoria de fechamento**;
- não inventar alteração de código.

---

# Regras de encerramento do projeto

A Fase 7 é a última fase.

Portanto, depois de 7.10:

- não iniciar Fase 8;
- não criar uma nova fase sem nova decisão explícita de escopo;
- não declarar produção pronta apenas porque o score é alto;
- não apagar gaps para melhorar o relatório;
- não transformar `BLOCKED` em `PASS`;
- não transformar `KNOWLEDGE_GAP` em hipótese jurídica;
- não considerar documentação como prova de infraestrutura não observada;
- não considerar teste como prova de requisito que ele não verifica.

## Regra final

```text
EVIDÊNCIA
   ↓
VERIFICAÇÃO
   ↓
RESULTADO
   ↓
RISCO
   ↓
DECISÃO
```

A auditoria final deve ser capaz de explicar **por que** o sistema recebeu GO, NO-GO ou BLOCKED e apontar exatamente quais evidências sustentam essa decisão.
