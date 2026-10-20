# Fase 2 — Implementação da suíte E2E

**Branch:** `main`  
**Escopo:** implementação e revisão estática dos specs; nenhum teste, build ou typecheck foi executado nesta fase.

## Entregas

- Sete specs independentes: `defesa_previa`, `recurso_jari`, `recurso_cetran`, `suspensao`, `cassacao`, `indicacao_condutor` e `conversao_advertencia`.
- Dez cenários por spec, com identificadores estáveis de `01` a `10`: total de 70.
- Runner Playwright serial, sem fallback para localhost, com screenshot, vídeo e trace em falha.
- Helpers que percorrem a UI de `/novo-caso`, selecionam dados sintéticos, usam o catálogo real de infrações e criam casos somente pela jornada do wizard.
- Guarda de escrita: os cenários que criam casos exigem `E2E_ALLOW_PERSISTENT_WRITES=true`.
- Recuperação de caso por token válido e rejeição de token inválido; o token não é usado como evidência nem registrado em relatórios.
- Cenário de pagamento bloqueado por padrão. Só tenta verificar o bloqueio de preview se `E2E_SAFE_PREVIEW=true` e `E2E_AUTH_TOKEN` estiverem explicitamente configurados; espera HTTP 503 e não aceita confirmação de cobrança.
- Comandos `test:e2e` e `test:e2e:list`; a suíte Vitest existente permanece preservada.

## Matriz por spec

Cada serviço cobre: entrada do fluxo, obrigatórios, placa inválida, criação via análise, rejeição de claim inválido, reload/recuperação sem duplicação, procedimento esperado, privacidade de sessionStorage, guarda de pagamento e prevenção de criação antes do envio explícito da análise.

## Limites desta fase

- **Não executado:** conforme o escopo desta fase, não houve execução de Playwright, build, typecheck, consulta ao banco, nem chamada de pagamento.
- **Não certificado:** a existência dos 70 testes não significa que passaram. A descoberta e a execução sequencial devem ocorrer na fase seguinte, no ambiente explicitamente autorizado.
- O cenário de pagamento permanece `BLOCKED` por padrão até que a configuração segura seja confirmada.
- A persistência é conferida pelo contrato real de recuperação do caso, além da resposta de criação; a bateria ainda precisa ser executada para confirmar esse comportamento no ambiente escolhido.

## Comandos

- `npm run test:e2e:list` — listar os cenários sem executar a bateria.
- `npm run test:e2e` — executar serialmente, somente após configurar URL, identificador de execução e autorização explícita para escritas persistentes.

Não usar `localhost` como fallback. Não executar contra produção sem autorização explícita. Não apagar automaticamente casos ou evidências persistidos.
