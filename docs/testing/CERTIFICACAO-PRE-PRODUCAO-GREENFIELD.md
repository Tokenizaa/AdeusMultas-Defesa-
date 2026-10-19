# Certificação de pré-produção — suíte greenfield

**Status:** especificação obrigatória para a nova suíte.  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Rota pública canônica:** `/novo-caso`  
**Componente canônico:** `src/components/onboarding/OnboardingWizard.tsx`

## Decisão de arquitetura

A certificação E2E anterior está aposentada. Seus cenários, fixtures, dados sintéticos, executores, validadores, seletores e pressupostos **não são fonte de requisitos nem modelo para a nova suíte**. A implementação nova deve ser derivada de leitura direta do código atual e dos contratos atuais da aplicação.

Não migrar nem adaptar a antiga infraestrutura. Não tentar reparar seus cenários. Os testes legados de certificação serão removidos no mesmo conjunto de mudanças em que a nova suíte independente for introduzida. Testes unitários e de contrato que não façam parte da antiga bateria E2E não devem ser apagados indiscriminadamente; serão avaliados por seu papel no código, não usados como modelo para jornadas E2E.

## Princípios inegociáveis

1. **Código atual como fonte de verdade.** Antes de escrever cada cenário, identificar o componente, endpoint, tipo de domínio, persistência e gate de qualidade atualmente responsáveis pelo comportamento.
2. **Sete identidades persistentes, cada uma com bateria própria.** Cada identidade passa pelo cadastro inicial no sistema, autenticação e retornos subsequentes. A primeira execução registra o cadastro; execuções seguintes provam login e recuperação da mesma conta. Não criar uma identidade descartável por serviço.
3. **Jornadas cruzadas.** A mesma pessoa pode abrir uma defesa de multa, retornar depois e iniciar outro serviço, por exemplo indicação de condutor, suspensão ou cassação, sem perder nem sobrescrever o caso anterior.
4. **Execução serial por serviço.** Um serviço só é liberado depois que todos os cenários e usuários atribuídos a ele passarem nos gates obrigatórios. Uma falha interrompe a progressão; não se contorna a falha avançando para o próximo serviço.
5. **Persistência comprovada no servidor.** Não aceitar estado React, sessionStorage, resposta otimista ou mensagem visual como prova de persistência.
6. **Sem pagamentos reais automatizados.** A certificação regular deve usar uma proteção de pré-produção que impeça criação de cobranças e chamadas a gateways reais. Qualquer Golden Path que movimente dinheiro é uma execução separada, com autorização explícita.
7. **Sem limpeza destrutiva automática.** Casos, usuários, documentos, auditorias e registros financeiros não podem ser apagados automaticamente. Cada execução usa identificadores exclusivos e evidencia a reconciliação.
8. **Sem mocks disfarçados de integração.** Testes de unidade podem isolar dependências. Uma evidência E2E deve identificar claramente o que foi real, simulado ou bloqueado.
9. **Falha fechada.** Segredo ausente, alvo incorreto, integração não configurada, análise ausente, documento inválido ou persistência não confirmada bloqueia a certificação.
10. **Rota única.** A navegação e os testes usam `/novo-caso`. Não usar `/novo-caso-rebuild` como destino canônico.

## Pré-requisitos para começar

- URL HTTPS de pré-produção explicitamente identificada e validada; não usar localhost, preview arbitrário ou produção como substituto silencioso.
- Ambiente isolado com configuração equivalente à aplicação atual, mas com pagamentos bloqueados no servidor.
- Sete contas de teste controladas, com credenciais obtidas exclusivamente por secrets/variáveis protegidas. Nunca gravar senhas, tokens, CPF real ou dados pessoais em repositório, logs ou artifacts.
- Confirmação de como o ambiente trata confirmação de e-mail; não contornar o fluxo real com inserção direta no banco.
- Banco e serviços de análise/documentos acessíveis no ambiente de pré-produção, com consultas de reconciliação somente leitura quando possível.
- Limite de taxa e dados sintéticos únicos por execução definidos.
- Relatórios Playwright, traces, screenshots e logs com redação de dados pessoais e segredos.
- Verificação de que a proteção de pagamento bloqueia tanto a UI quanto o backend e não cria ordem nem chama VenoPag/PagBank.
- Versões e commit da aplicação testada registrados no relatório.

Se qualquer pré-requisito estiver ausente, a execução termina como **BLOCKED**, sem gravar casos.

## Modelo das sete jornadas

Cada usuário tem um identificador estável (U1–U7), uma conta persistente e uma matriz de cenários própria. Todos passam por cadastro inicial e login. Em cada execução posterior, todos fazem login e verificam recuperação de perfil e histórico. Não atribuir um serviço exclusivo a um usuário.

A matriz deve cruzar os sete usuários com os sete serviços comerciais vigentes:
- `defesa_previa`
- `recurso_jari`
- `recurso_cetran`
- `suspensao`
- `cassacao`
- `indicacao_condutor`
- `conversao_advertencia`

A cobertura pode variar por usuário para representar jornadas realistas, mas a matriz agregada deve cobrir todos os pares usuário/serviço necessários, retorno entre sessões, casos múltiplos, falhas negativas e isolamento entre contas. Cada novo caso deve ter AIT sintético exclusivo e dados coerentes com o serviço. Nunca reutilizar um AIT de uma execução anterior.

## Gates obrigatórios por caso

### A. Identidade e autorização
- Cadastro real pela interface no ciclo inicial e confirmação do estado resultante.
- Login pela interface em cada jornada.
- Perfil e identidade do usuário carregados do servidor.
- Caso visível apenas para o titular; tentativa de acesso cruzado negada.

### B. Criação e análise
- Caso criado com ID canônico retornado pelo servidor.
- Tipo de serviço e AIT correspondem aos dados informados.
- A análise foi executada pelo mecanismo atual e persistida, com identificador/versão e dados suficientes para auditoria.
- O resultado recuperado do servidor corresponde ao caso, não a outro caso nem a estado local.
- Regras, fatos, inconsistências e argumentos são rastreáveis; não aprovar texto genérico como análise concluída.
- Falha ou análise vazia deve ser exibida como falha/bloqueio, nunca sucesso.

### C. Qualidade jurídica e documento
- Avaliar análise e documento como gates separados.
- Documento/minuta efetivamente gerado pelo caminho canônico do código atual.
- Conteúdo corresponde ao usuário, caso, AIT, serviço, autoridade e dados fornecidos.
- Ausência de placeholders, campos obrigatórios vazios, dados de terceiros, contradições entre análise e minuta e afirmações sem suporte nos fatos.
- Regras normativas e argumentos são consistentes com o procedimento selecionado; resultado do quality gate canônico aprovado.
- Artefato final recuperável do servidor/storage, com identificador e vínculo verificáveis.
- Se o fluxo exige pagamento para gerar o documento, usar somente o mecanismo seguro de pré-produção aprovado. Sem isso, documentar o gate como BLOCKED; não fingir geração nem liberar pagamento real.

### D. Persistência e retorno
- Sair da conta e autenticar novamente.
- Reabrir cada caso anterior e recuperar análise/documento persistidos.
- Criar um segundo caso com outro serviço e confirmar que o primeiro permanece inalterado.
- Confirmar contagem, IDs e vínculos no backend/banco.
- Confirmar isolamento entre U1–U7.

## Execução serial e parada

Ordem de execução:
1. Pré-flight sem escrita.
2. Cadastro inicial e autenticação das sete identidades.
3. Piloto ponta a ponta com um usuário e um caso, incluindo reconciliação de análise/documento.
4. Gate de serviço 1 com todos os usuários/cenários atribuídos.
5. Aprovação explícita do relatório do serviço; somente então avançar ao próximo.
6. Repetir até os sete serviços.
7. Regressão cruzada: segundo serviço, login em nova sessão, histórico anterior, documentos e isolamento.
8. Relatório final consolidado.

Uma falha em qualquer requisito obrigatório bloqueia o serviço e a progressão global. Não usar retry automático para esconder falhas de produção/pré-produção; retries manuais devem gerar um novo identificador de execução e preservar as evidências anteriores.

## Evidências por cenário

Cada resultado registra:
- run ID, commit SHA, ambiente/URL e timestamp;
- usuário lógico U1–U7 (sem credenciais);
- serviço, cenário, ID do caso, AIT sintético;
- IDs de análise e documento, quando aplicáveis;
- verificações da UI e reconciliação server-side;
- resultado por gate: PASS / FAIL / BLOCKED / NOT_RUN;
- motivo detalhado, logs redigidos e links para artifacts;
- informação explícita de integrações reais versus simuladas.

Não considerar como prova isolada: HTTP 200, texto de sucesso, registro sem conteúdo, contagem de testes verdes ou screenshot sem reconciliação.

## Critérios de conclusão

A certificação só pode ser declarada concluída quando:
- todos os pré-requisitos estiverem satisfeitos;
- os sete usuários tiverem jornadas individuais completas e repetíveis;
- os sete serviços estiverem aprovados sequencialmente;
- análise e documento passarem em validação de conteúdo, qualidade e persistência;
- histórico, múltiplos serviços e isolamento entre usuários estiverem comprovados;
- não houver gate obrigatório BLOCKED, FAIL ou NOT_RUN;
- relatório e artifacts permitirem reproduzir e auditar a execução.

**Estado inicial:** não certificado. A criação desta especificação não constitui execução nem aprovação dos testes.


## Registro de execução — fases 1 a 3 (2026-10-19)

### Fase 1 — pré-flight e isolamento

- **PASS:** branch de trabalho `rebuild/preproduction-certification-greenfield`; PR #40 permanece direcionado a `main`, sem merge.
- **PASS:** o workflow `.github/workflows/cloudflare-deploy.yml` foi inspecionado. O job de PR executa os testes de contrato; o passo `Build and deploy to Cloudflare` exige simultaneamente evento `push`, branch `main` e mensagem contendo `[DEPLOY-PRODUCTION]`. Na execução do PR #40, o workflow terminou com sucesso e não publicou deploy.
- **PASS:** o job `production-golden-path` foi ignorado, conforme sua condição de execução manual específica.
- **PASS:** os testes unitários/auditoria passaram na execução inicial do CI.
- **BLOCKED:** o typecheck falhou; o build subsequente foi ignorado. A certificação não pode avançar para bateria completa até a falha ser diagnosticada e corrigida sem enfraquecer as verificações.

### Fase 2 — contratos de identidade, persistência e bloqueio financeiro

- **PASS:** a suíte greenfield verifica a exigência de sete identidades persistentes U1–U7 e a recuperação de histórico após novo contexto de navegador.
- **PASS:** foi acrescentado `cloudflare/routes/cases-payment-gate.test.ts`, que verifica que um caso não pago recebe HTTP 402 antes de executar análise, montar documento ou persistir alterações. O resultado deste novo teste deve ser confirmado no CI do commit que o introduziu.
- **BLOCKED:** não há URL HTTPS de pré-produção isolada confirmada nem credenciais protegidas de sete contas fornecidas no contexto desta execução. Nenhuma conta foi criada e nenhuma escrita de caso foi iniciada.

### Fase 3 — piloto ponta a ponta com documento

- **BLOCKED:** o piloto real de navegador não foi executado porque faltam o alvo isolado confirmado, as sete identidades protegidas e o mecanismo de pagamento de pré-produção seguro.
- **BLOCKED:** o endpoint canônico `POST /api/cases/:id/generate-defense` exige `cases.is_paid = true`, valida os dados do requerente e aplica o Quality Gate antes de persistir a minuta. Não foi contornado esse gate nem criada uma confirmação de pagamento artificial.
- **NOT_RUN:** geração real, Quality Gate em documento gerado no ambiente, persistência de documento e recuperação após novo login.
- Nenhum deploy, migração, pagamento real ou alteração em produção foi executado nesta sequência.

### Próxima delegação

A Fase 4 está especificada em [FASE-4-AGENTE-LOCAL.md](./FASE-4-AGENTE-LOCAL.md). O agente local deve primeiro resolver o typecheck e comprovar o pré-flight/piloto; se algum pré-requisito continuar ausente, deve encerrar como BLOCKED sem iniciar a bateria dos sete serviços. A Fase 4 não está autorizada a usar produção, executar deploy/migrações ou pagamentos reais.


### Atualização do diagnóstico do typecheck

O log de CI identificou a causa concreta do primeiro typecheck: dois arquivos remanescentes do executor legado importavam `src/server/services/e2e-test-runner-service.ts`, já removido. Na branch foram removidos também `src/server/routes/e2e-tests.ts` e `src/server/db/e2e-test-repository.ts`. A remoção foi feita na branch do PR; aguardar o CI do HEAD atual para confirmar se o typecheck e o build passam. Até esse resultado, a correção está aplicada, mas não validada.
