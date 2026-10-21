# Runbook de Incidentes — DefesAi

**Status**: obrigatório para resposta a incidentes de segurança, disponibilidade e pagamentos.
**Projeto**: DefesAi (AdeusMultas-Defesa-)
**Branch canônica**: `main`
**Última revisão**: 2026-10-21

> Este runbook é um documento operacional. Não modifica código de produção. Qualquer alteração neste arquivo deve ser revisada pelo time de documentação (@documentacao) antes de entrar em vigor. Em caso de suspeita de vazamento de dados pessoais, a LGPD se aplica — consulte a seção 3 imediatamente.

---

## 1. Como usar este runbook

1. Identifique o tipo de incidente (seções 2–5).
2. Siga os passos de contenção na ordem indicada.
3. Contate as pessoas/fornecedores listados na seção 6.
4. Execute a remediação (seção 7).
5. Preencha o template de pós-mortem (seção 8) dentro de 24–48h após a resolução.

**Regra de ouro**: em caso de dúvida sobre a gravidade, trate como incidente crítico (P1) e escale para o Tech Lead e responsável de segurança.

---

## 2. Classificação de gravidade

| Nível | Definição | Exemplo | Tempo de resposta alvo | Quem lidera |
|-------|-----------|---------|------------------------|-------------|
| **P1 — Crítico** | Serviço indisponível para todos, vazamento de dados, segredo exposto, pagamentos duplicados em massa | Site down, vazamento de LGPD, chave exposta no Git | < 15 min | Tech Lead + on-call |
| **P2 — Alto** | Funcionalidade principal degradada (ex: não é possível gerar defesa, webhook de pagamento falhando) | WhatsApp não envia, OCR com erro recorrente | < 1 hora | Engenheiro responsável |
| **P3 — Médio** | Degradação parcial ou funcionalidade secundária afetada | Relatórios lentos, um endpoint específico com erro | < 4 horas | Engenheiro de plantão |
| **P4 — Baixo** | Problema cosmético ou com workaround disponível | Texto incorreto na UI, link quebrado | Próximo sprint | Qualquer desenvolvedor |

---

## 3. Vazamento de dados (LGPD)

> **Obrigatório**: o DefesAi lida com dados pessoais (CPF, CNH, placa, endereço, documentos de multa) e documentos jurídicos. Qualquer suspeita de acesso não autorizado a esses dados é um incidente de segurança da informação sob a LGPD (Lei 13.709/2018).

### 3.1 Sinais de vazamento

- Acesso não detectado a tabelas do Supabase com dados pessoais
- Download/exportação em massa de `cases`, `defesas`, `documentos`
- E-mails ou arquivos contendo dados pessoais enviados para destinatários não autorizados
- Notificação do Supabase/Cloudflare de acesso suspeito
- Usuário reporta que viu dados de outra pessoa

### 3.2 Passos de contenção (executar nesta ordem)

| Passo | Ação | Comando / ferramenta |
|-------|------|----------------------|
| 1 | Suspender acessos suspeitos (revogar sessões/tokens) | Supabase Auth → revogar tokens; alterar `SUPABASE_SERVICE_ROLE_KEY` se exposta |
| 2 | Isolar o recurso afetado (tabela/bucket/Instância) | Revogar RLS policies temporariamente; restringir bucket de storage no Supabase |
| 3 | Bloquear IPs de origem no Cloudflare (se identificados) | Cloudflare WAF → regra de bloqueio de IP |
| 4 | Preservar logs (não apagar) | Exportar logs do Supabase, Cloudflare, Evolution API |
| 5 | Notificar o DPO / responsável legal | E-mail + canal de operações — dentro de prazo legal |

### 3.3 Notificação LGPD (prazos)

- **ANPD (Autoridade Nacional de Proteção de Dados)**: comunicar em **até 2 dias úteis** após tomar conhecimento do incidente que possa gerar risco ou dano relevante aos titulares.
- **Titulares afetados**: comunicar de forma clara, com descrição do ocorrido, dados envolvidos, riscos e medidas de mitigação.
- **Documentar tudo**: registro do incidente, data/hora da descoberta, dados afetados, medidas tomadas e responsáveis.

> A não comunicação no prazo pode gerar multas administrativas. Consulte o responsável legal/DPO antes de qualquer comunicação externa.

---

## 4. Outros procedimentos de incidente

### 4.1 Site down (disponibilidade)

**Sinais**: `GET /health` não responde, Cloudflare retorna 502/503/522, usuários reportam erro de carregamento.

**Quem contatar**:
1. Engenheiro de plantão (on-call) — imediato
2. Tech Lead — se não houver resposta em 15 min
3. Cloudflare — se o problema for DNS/edge/WAF
4. Supabase — se o problema for banco de dados

**Passos de contenção**:
1. Confirmar o escopo: apenas frontend, apenas backend, ou ambos?
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://multa.emprestamais.shop/api/agents/health
   curl -s -o /dev/null -w "%{http_code}\n" https://www.mult   # frontend
   ```
2. Verificar status do Cloudflare (dashboard → Workers → versões ativas).
3. Verificar status do Supabase (dashboard → Project → Database).
4. Se o deploy causou a queda, executar rollback imediato (`docs/deploy-runbook.md`, seção 6).
5. Se for infra (Cloudflare/Supabase), abrir chamado com os fornecedores e registrar IDs dos incidentes deles.

**Critério de retorno à normalidade**: `GET /health` retorna 200 e `GET /api/admin/overview` mostra serviços críticos `HEALTHY`.

### 4.2 Falha de pagamento (webhook duplicado / cobrança indevida)

**Sinais**: usuário reporta cobrança dupla, webhook do VenoPag/Stripe processado duas vezes, `payment_orders` duplicados no banco.

**Contexto**: conforme o commit `47d079a`, a migração foi para gateway **VenoPag** (PagBank/GGPIXAPI descontinuadas). Confirmar com o time de `@pagamentos-comercial` os endpoints e webhooks ativos.

**Passos de contenção**:
1. Suspender processamento de novos webhooks de pagamento se houver duplicação confirmada (bloquear endpoint `/api/payments/webhooks/pagbank` ou equivalente VenoPag via Cloudflare WAF temporariamente).
2. Identificar cobranças duplicadas na tabela de pedidos/pagamentos.
3. Não reembolsar automaticamente sem confirmação do time financeiro/comercial.
4. Contatar VenoPag e/ou Stripe para confirmar status das transações.

**Remediação**:
- Reembolsar cobrança indevida após confirmação financeira.
- Implementar idempotência nos webhooks (verificar `idempotency_key` antes de processar).
- Adicionar alerta de webhook duplicado no monitoramento.

### 4.3 Vazamento de segredos (rotação de chaves, revogação)

**Sinais**: chave API commiteada no Git, variável de ambiente exposta, token de serviço utilizado em origem desconhecida.

**Segredos relevantes no DefesAi**:
- `SUPABASE_SERVICE_ROLE_KEY`
- `EVOLUTION_API_KEY`
- `NVIDIA_API_KEY` (1, 2, 3)
- `NINEROUTER_KEY`
- `DOCUMENSO_API_TOKEN`
- `CLOUDFLARE_API_TOKEN`
- `META_APP_SECRET`, `FACEBOOK_APP_SECRET`
- Tokens de webhook (`EVOLUTION_WEBHOOK_SECRET`, `DOCUMENSO_WEBHOOK_SECRET`)

**Passos de contenção**:
1. **Revogar imediatamente** o segredo exposto no painel do fornecedor (Supabase, Evolution API, NVIDIA, Cloudflare, Meta, etc.).
2. **Rotacionar**: gerar novo valor e atualizar em todos os ambientes (produção e homologação).
   ```bash
   # Exemplo: rotacionar segredo no Cloudflare Workers
   npx wrangler secret put <NOME_DA_VAR> --name tokenizaa-defesa-f-cil
   ```
3. Verificar logs de uso do segredo exposto para avaliar o que foi acessado.
4. Se o segredo foi commiteado, fazer `git filter-repo` / `git filter-branch` para remover do histórico (apenas com autorização do Tech Lead — **não criar branch**; operar diretamente em `main` com cuidado).
5. Notificar o DPO se o segredo dava acesso a dados pessoais (tratar como vazamento de dados — seção 3).

---

## 5. Contatos de emergência

| Fornecedor / equipe | Contato | Canal | Quando acionar |
|---------------------|---------|-------|----------------|
| Tech Lead / responsável pela release | [preencher] | Slack/Teams + telefone | Qualquer incidente P1/P2 |
| Engenheiro de plantão (on-call) | [preencher] | Slack/Teams + telefone | Primeira linha de resposta |
| DPO / responsável legal (LGPD) | [preencher] | E-mail + telefone | Vazamento de dados pessoais |
| Supabase (banco + auth + storage) | dashboard.supabase.co | Suporte do plano contratado | Banco indisponível, falha de auth, vazamento de dados |
| Cloudflare (Workers / DNS / WAF) | dashboard.cloudflare.com | Suporte Cloudflare | Site down, DNS, WAF, Workers |
| Evolution API (WhatsApp) | [preencher instância/contato] | WhatsApp / e-mail do fornecedor | WhatsApp não envia/recebe, webhook falhando |
| VenoPag (pagamentos) | [preencher] | E-mail / dashboard do fornecedor | Cobrança indevida, webhook duplicado, pagamento não confirmado |
| Stripe (se aplicável) | support.stripe.com | Suporte Stripe | Cobrança indevida, webhook duplicado (se Stripe estiver ativo) |
| Documenso (assinatura digital) | app.documenso.com | Suporte Documenso | Falha na assinatura de documentos |
| Meta (Graph API / OAuth) | [preencher] | Suporte Meta para desenvolvedores | Falha de login social / integração Meta |
| NVIDIA / 9Router (IA) | [preencher] | Suporte do fornecedor | Falha de embeddings / IA jurídica |
| PagerDuty / Slack (alertas) | [preencher canal] | Slack | Receber e acknowledg de alertas |

> Preencher os contatos entre colchetes antes de qualquer necessidade real. Mantenha esta lista atualizada a cada troca de plantão ou mudança de fornecedor.

---

## 6. Passos gerais de remediação (todos os incidentes)

1. **Detecção e triagem**: classificar gravidade (seção 2) e abrir canal de incidente dedicado no Slack/Teams.
2. **Contenção**: parar o dano (isolamento, revogação, rollback, bloqueio de IP).
3. **Erradicação**: corrigir a causa raiz (patch, migração de correção, remoção de segredo exposto).
4. **Recuperação**: restaurar serviço, verificar health checks (`docs/deploy-runbook.md`, seção 5).
5. **Comunicação**: avisar usuários afetados (status page / e-mail), DPO e ANPD se aplicável (LGPD).
6. **Pós-mortem**: preencher template (seção 7) dentro de 24–48h.
7. **Ações de follow-up**: criar issues para evitar recorrência (alertas, testes, docs).

---

## 7. Template de pós-mortem

Copie este modelo para um novo documento em `docs/incidentes/` (ou issue vinculada) após cada incidente P1/P2.

```markdown
# Pós-mortem — Incidente [ID] — [Data]

## Resumo executivo
- **Data/hora de início**: 
- **Data/hora de resolução**: 
- **Duração total**: 
- **Gravidade**: P1 / P2 / P3 / P4
- **Líder do incidente**: 
- **Impacto**: (usuários afetados, funcionalidades indisponíveis, dados envolvidos)

## Cronologia
| Hora | Ação | Responsável |
|------|------|-------------|
|  |  |  |
|  |  |  |

## Causa raiz
(Descrever a causa profunda, não apenas o sintoma. Ex: "migração executada antes do backup" ou "webhook sem idempotência".)

## O que funcionou bem
- 
- 

## O que deu errado / pode melhorar
- 
- 

## Ações corretivas (com owner e prazo)
| Ação | Owner | Prazo | Status |
|------|-------|-------|--------|
|  |  |  |  |
|  |  |  |  |

## Comunicação
- Usuários notificados: sim / não
- DPO notificado (LGPD): sim / não / não se aplica
- ANPD notificada: sim / não / não se aplica
- Fornecedores acionados: 

## Anexos
- Logs: [link]
- Métricas: [link]
- Screenshots: [link]
```

---

## 8. Checklist de resposta a incidente (cópia para colar)

```
[ ] Incidente detectado e classificado (P1-P4)
[ ] Canal de incidente aberto no Slack/Teams
[ ] Líder do incidente designado
[ ] Contenção executada (isolamento / revogação / rollback)
[ ] Fornecedores acionados (se aplicável — Supabase, Cloudflare, Evolution API, VenoPag, Stripe)
[ ] Health checks verificados após contenção
[ ] Usuários afetados comunicados (se aplicável)
[ ] LGPD / DPO / ANPD avaliados (se dados pessoais envolvidos)
[ ] Causa raiz documentada
[ ] Template de pós-mortem preenchido (≤ 48h)
[ ] Ações corretivas criadas como issues
[ ] Incidente encerrado formalmente
```

---

*Fim do runbook. Mantenha este documento atualizado sempre que houver mudança de fornecedor, contato ou procedimento de resposta a incidentes.*