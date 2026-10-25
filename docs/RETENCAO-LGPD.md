# Política de Retenção e Eliminação de Dados Pessoais — DefesAi (LGPD)

**Versão:** 1.0  
**Data:** 24/10/2026  
**Controlador:** DefesAi — Encarregado (DPO): dpo@defesai.com.br  
**Base legal:** Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018), arts. 16, 18 e 19.

---

## 1. Princípio aplicável

Dados pessoais são mantidos apenas pelo período necessário ao cumprimento das finalidades para as quais foram coletados, ou enquanto houver obrigação legal de retenção. Findada a finalidade e expirado o prazo legal, os dados são **eliminados ou anonimizados de forma irreversível** (art. 16, LGPD).

Não é aceitável reter dados "por precaução" ou "para uso futuro não especificado". Cada campo coletado tem finalidade, base legal e prazo definidos neste documento.

---

## 2. Dados por categoria — prazo e base legal

| Categoria | Campos exemplares | Finalidade | Base legal | Prazo de retenção | Ação após o prazo |
|-----------|-------------------|------------|------------|-------------------|-------------------|
| Cadastro do titular (usuário autenticado) | nome, e-mail, CPF, telefone, CNH, endereço, dados de auth (Supabase/Firebase) | Autenticação, prestação do serviço, contato | Execução de contrato / consentimento | Enquanto a conta estiver ativa | Eliminação a pedido do titular ou inativação da conta + prazo legal de guarda de registros de acesso |
| Caso de trânsito (tabela `cases`) | nome, CPF, telefone, e-mail do condutor/requerente; placa, RENAVAM, marca/modelo do veículo; AIT, autuador, data/local da infração; dados do condutor real (indicação) | Análise de autuação, geração de defesa/recurso, protocolo perante órgão de trânsito | Execução de contrato / consentimento | Até o trânsito em julgado da decisão administrativa ou prescrição da infração (CTB) | Eliminação completa (delete físico) a pedido do titular ou automaticamente ao expirar o prazo |
| Documentos gerados (PDF da defesa) + `documents` + Storage (`case-documents`) | minuta de defesa contendo dados pessoais do requerente | Entrega ao titular para protocolo | Execução de contrato | Mesmo prazo do caso vinculado | Exclusão do arquivo no Storage e da linha em `documents` junto com o caso |
| Pagamentos / reconciliação (`payment_orders`) | valores, IDs de transação gateway, status PIX, datas | Conciliação de pagamento interno | Execução de contrato / obrigação legal | Até a confirmação de pagamento e período de chargeback/contestação do gateway | Eliminação da reconciliação interna; o registro fiscal definitivo permanece no gateway de pagamento (VenoPag/PagBank), que detém a obrigação legal de retenção de transações financeiras |
| Logs de auditoria (`audit_logs`) | ator, ação, alvo, data/hora, correlação | Prova de conformidade, detecção de incidentes, accountability | Obrigação legal (art. 16, III — cumprimento de obrigação legal) | Indefinido, enquanto necessário para comprovar conformidade | Não eliminado a pedido do titular (é a trilha de prova, não dado pessoal a ser apagado) |
| Casos anônimos (`is_anonymous = true`, `claim_token`) | mesmo conjunto do caso acima, mas sem `user_id` | Análise gratuita preliminar sem cadastro | Consentimento | Até solicitação de eliminação pelo titular via `claim_token` | Eliminação completa (delete físico) via endpoint `/api/cases/anonymous/:id` com `claim_token` |

---

## 3. Direitos do titular (Art. 18 LGPD) — como exercer

| Direito | Endpoint / canal | Autenticação | Prazo de resposta |
|---------|------------------|--------------|-------------------|
| Acesso (confirmação + cópia dos dados) | `GET /api/cases/:id/export` (DSAR) | Login do titular ou admin | Imediato (síncrono) |
| Correção de dados incompletos/inexatos | `PUT /api/cases/:id`, `POST /api/cases/:id/qualification` | Login do titular | Imediato |
| Eliminação de dados pessoais | `DELETE /api/cases/:id` (autenticado) <br> `DELETE /api/cases/anonymous/:id` + `claim_token` (anon) | Login do titular / `claim_token` | Imediato (delete físico) |
| Revogação do consentimento | contato com DPO: dpo@defesai.com.br | — | Até 15 dias (art. 19) |
| Portabilidade | `GET /api/cases/:id/export` (JSON estruturado) | Login do titular | Imediato |

**Exceção à eliminação:** quando houver obrigação legal de retenção (ex.: registros fiscais do gateway), a eliminação se aplica aos dados pessoais sob controle da DefesAi; o registro fiscal definitivo permanece com o gateway de pagamento.

---

## 4. Eliminação — o que "excluído" significa aqui

- **Delete físico da linha** em `public.cases`, não anonimização de campos (o endpoint anterior apenas mascarava campos e mantinha a linha — isso **não** é eliminação).
- **Exclusão em cascata** de dependências diretas: `documents` (linha + arquivo no bucket `case-documents`) e `payment_orders` (reconciliação interna).
- **Verificação pós-exclusão:** o endpoint reconsulta o caso e falha com erro se a linha ainda existir.
- **Auditoria preservada:** o fato da exclusão é registrado em `audit_logs` (prova de conformidade); os logs de auditoria não são dados pessoais do titular sujeitos a eliminação a pedido.
- **Idempotência:** excluir um caso já excluído retorna 404 (não revela se existiu, para evitar enumeração).

---

## 5. Expiração automática (planejada)

Não há ainda job automatizado de expiração por data. Até a implementação de um worker cron de retenção:

- A eliminação é acionada pelo titular via endpoints acima.
- O DPO pode acionar eliminação em lote para casos cujos prazos prescricionais expiraram, com base neste documento e registro em `audit_logs`.

**Próximo passo:** implementar job agendado (Cloudflare Cron / Supabase pg_cron) que varra `cases` com `updated_at` expirado e execute eliminação física, exceto quando houver `payment_orders` com obrigação fiscal vigente.

---

## 6. Dados pessoais em texto plano (risco conhecido)

A tabela `public.cases` armazena campos de identificação (CPF, telefone, e-mail, placa, AIT, nome do condutor real) em colunas de texto plano, além de colunas `_enc` (bytea) criptografadas que não são preenchidas pela aplicação atual. Toda eliminação/exportação opera sobre as colunas texto plano, que são a fonte de verdade dos dados pessoais. A criptografia em repouso do Supabase (nível de infraestrutura) está ativa, mas a aplicação deve tratar essas colunas como texto plano sensível em logs, traces e backups.

---

## 7. Contato

Encarregado de Proteção de Dados (DPO): **dpo@defesai.com.br**  
Plataforma: https://adeusmulta.defesai.com.br  
Prazo de resposta a solicitações do titular: até 15 dias (art. 19, LGPD).
