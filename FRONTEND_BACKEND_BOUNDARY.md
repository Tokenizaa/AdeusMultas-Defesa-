# FRONTEND & BACKEND BOUNDARY AUDIT
## Projeto: DefesAi / Adeus Multa

### 1. Princípio de Fonte da Verdade
- **Frontend (Apresentação / Coleta)**:
  - Não armazena chaves privadas nem tokens da Meta/PagBank.
  - Não define status de pagamento como "Aprovado" por conta própria; consome a resposta oficial do backend.
  - Não faz bypass de regras de negócio.
- **Backend (Decisão / Execução / Persistência)**:
  - Valida todas as transições de status de casos (`draft`, `analyzed`, `paid`, `defense_ready`, `protocolado`).
  - Executa a IA (Gemini 3.7 Flash) em ambiente protegido pelo servidor.
  - Controla o ciclo e despacho autônomo dos 7 agentes de marketing.

### 2. Interface de Administração de Configurações
- A rota `/admin/settings` na UI opera apenas como painel de controle; a gravação e aplicação de credenciais e parâmetros operacionais é feita de forma estritamente controlada via `/api/settings` com auditoria persistida.
