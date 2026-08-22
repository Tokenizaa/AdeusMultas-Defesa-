# ARCHITECTURE GAPS AUDIT
## Projeto: DefesAi / Adeus Multa

### 1. Separação de Camadas (Tiering)

- **Frontend Tier**: Single Page Application (React 18) responsável apenas pela coleta de dados, visualização de painéis e orquestração de UX. Nenhuma lógica de precificação arbitrária ou chave de API privada reside no bundle cliente.
- **Backend Tier**: Express REST API executada via `node dist/server.cjs` ou `tsx server.ts`, responsável pela integridade dos dados, autorização, comunicação com APIs externas e execução de agentes.
- **Data Tier**: `CaseRepository` com abstração `CanonicalMapper` que padroniza objetos de domínio TypeScript para as tabelas PostgreSQL do Supabase.

---

### 2. Lacunas Identificadas e Mitigadas

1. **Gestão de Segredos vs. Interface Admin**:
   - *Risco*: Exposição de tokens em telas de configuração.
   - *Mitigação*: `/api/settings` mascara todos os valores confidenciais (`pk_***`, `Bearer ***`) e exige payload autenticado para escrita.
2. **Resiliência do RAG**:
   - *Risco*: Queda ou indisponibilidade temporária de provedores LLM.
   - *Mitigação*: `RagPipeline` implementa fallback determinístico de montagem jurídica estruturada baseado no catálogo do CTB quando o Gemini 3.7 Flash não responde.
3. **Idempotência de Webhooks**:
   - *Risco*: PagBank reenviar webhooks repetidos de transações pagas.
   - *Mitigação*: `paymentRepository` e `auditService` registram e verificam IDs de transação antes de acionar a liberação da defesa.
