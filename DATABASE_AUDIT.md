# DATABASE AUDIT
## Projeto: DefesAi / Adeus Multa

### 1. Schema & Tipagem Supabase
- **Tabelas Mapeadas**:
  - `cases`: Registro principal do condutor, veículo, auto de infração e status da defesa.
  - `audit_logs`: Trilha imutável de eventos com `correlation_id`, IP e ação executada.
  - `coupons`, `promotions`, `bonus_ledger`, `affiliates`: Módulos de precificação comercial.
  - `marketing_contents`, `marketing_agents`: Persistência do organismo autônomo.

### 2. Integridade e Mapper Canônico
- O `CanonicalMapper` (`src/core/mappers/canonical-mapper.ts`) atua como barreira anticorrupção entre o formato Snake_Case do banco de dados relacional e a interface camelCase do domínio da aplicação.

### 3. RLS e Segurança de Acesso
- O backend utiliza `getSupabaseServerClient()` com `SUPABASE_SERVICE_ROLE_KEY` de forma restrita e controlada apenas dentro dos repositories `/src/server/db/*`.
