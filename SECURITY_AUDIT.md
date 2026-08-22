# SECURITY & LGPD AUDIT
## Projeto: DefesAi / Adeus Multa

### 1. Diretrizes de Segurança (OWASP & Hardening)
- **Exposição de Segredos**: Zero segredos privados de backend expostos no bundle do Vite ou em variáveis `VITE_*`.
- **CORS e Ingress**: O servidor Express restringe e sanitiza requisições na porta 3000.
- **XSS & Injection**: Utilização de parâmetros sanitizados e tipados no pipeline de requisições.

### 2. Conformidade LGPD (Lei Geral de Proteção de Dados)
- **Minimização de Dados**: Coleta restrita a dados indispensáveis para o recurso de trânsito (CPF, CNH, Placa e Renavam).
- **Consentimento**: Banner de cookies e política de privacidade ativos na interface.
- **Trilha de Auditoria**: Registro de logs de visualização e alteração de dados de condutores no `audit_service`.
