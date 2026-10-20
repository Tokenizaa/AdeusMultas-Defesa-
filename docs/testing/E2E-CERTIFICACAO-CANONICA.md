# Especificação canônica — Certificação E2E dos sete serviços

**Status:** especificação de referência; os 70 testes ainda não foram implementados nem certificados.  
**Escopo:** definir um único procedimento para planejar, implementar e executar 70 cenários E2E, dez por serviço.  
**Branch de referência:** `main`.  
**Regra:** este arquivo é a única instrução operacional da certificação E2E. `AGENTS.md` continua sendo a governança geral obrigatória do repositório.

## 1. Objetivo e limites

Comprovar o comportamento integrado do produto a partir da interface real, usando dados sintéticos e verificações independentes de persistência. Um teste só passa quando o resultado de negócio esperado e os dados persistidos correspondem ao que foi informado no fluxo.

Esta especificação não autoriza:
- alterar comportamento de produção para fazer testes passarem;
- executar a bateria contra produção, realizar pagamentos reais ou fazer deploy sem autorização explícita;
- remover testes unitários, integração, auditoria ou segurança;
- recriar a antiga infraestrutura E2E por cópia;
- usar mocks para simular uma etapa que o próprio cenário declara estar validando como integração real.

## 2. Os 70 cenários oficiais

Cada serviço deve ter exatamente dez cenários identificados de `01` a `10`. Cada cenário tem dados próprios, objetivo verificável e resultado esperado. A reutilização de helpers é permitida; duplicar o mesmo teste com dados cosméticos diferentes não conta como cobertura independente.

| Serviço canônico | Quantidade |
|---|---:|
| `defesa_previa` | 10 |
| `recurso_jari` | 10 |
| `recurso_cetran` | 10 |
| `suspensao` | 10 |
| `cassacao` | 10 |
| `indicacao_condutor` | 10 |
| `conversao_advertencia` | 10 |
| **Total** | **70** |

Os identificadores acima são canônicos. Rótulos de interface e nomes internos alternativos não devem criar serviços extras nem substituir esses identificadores.

### Matriz de cobertura por serviço

Cada serviço implementa os dez objetivos abaixo com entradas, expectativas e validações próprias daquele serviço:

| ID | Objetivo obrigatório | Critério mínimo de aprovação |
|---|---|---|
| 01 | Caminho válido do serviço | Usuário conclui o fluxo principal e o serviço selecionado permanece correto. |
| 02 | Validação de campos obrigatórios | Entrada incompleta é rejeitada; não há criação indevida de caso. |
| 03 | Validação de dados inválidos ou inconsistentes | A aplicação impede ou sinaliza a entrada inválida conforme o contrato real. |
| 04 | Preenchimento e criação do caso | O wizard canônico aceita os dados válidos e cria o caso conforme as regras atuais de autenticação e análise. |
| 05 | Recuperação/claim e handoff de autenticação | O mesmo caso e token autorizado são mantidos; não ocorre troca de identidade ou de caso. |
| 06 | Persistência e recuperação | O caso persistido pode ser recuperado após navegação/reload e corresponde aos dados enviados. |
| 07 | Análise e procedimento | Resultado, serviço e procedimento seguem as regras atuais e determinísticas aplicáveis ao cenário. |
| 08 | Documento e integridade | Documento real é gerado/persistido quando previsto; os campos relevantes correspondem ao caso e não a fallbacks. |
| 09 | Pagamento em ambiente de teste | Ordem e caso ficam associados corretamente; confirmação só ocorre pelo mecanismo de teste autorizado. |
| 10 | Falha, repetição e segurança | Falha controlada não cria estado falso, duplicação indevida, vazamento de dados ou associação cruzada. |

A matriz acima define os dez objetivos por serviço, não autoriza presumir que todos os endpoints ou resultados já existam. Antes de implementar, cada cenário deve ser confrontado com o código atual e receber: precondições, entrada sintética, ações de interface, oráculo de negócio, verificações de banco e evidência esperada. Se um comportamento não existir ou o contrato for contraditório, registrar o bloqueio; não inventar endpoint nem expectativa.

## 3. Fluxo que a certificação deve provar

Quando aplicável ao cenário e ao fluxo canônico atual:

1. Abrir a aplicação em contexto de navegador limpo.
2. Percorrer a interface pública e o wizard de onboarding atualmente implantado.
3. Selecionar um dos sete serviços canônicos.
4. Informar dados sintéticos únicos de condutor, veículo e autuação.
5. Submeter os dados pela interface e capturar o identificador real do caso.
6. Verificar persistência no banco autorizado, sem substituir a jornada por inserções diretas.
7. Validar análise e procedimento conforme as regras atuais.
8. Executar pagamento exclusivamente pelo mecanismo de teste/sandbox autorizado, quando fizer parte do cenário.
9. Verificar a associação entre caso, ordem de pagamento e documento.
10. Conferir o documento persistido e sua correspondência com os dados de entrada.

Um cenário que cobre somente UI deve ser rotulado como teste de contrato/UI e não pode ser apresentado como prova de persistência E2E real.

## 4. Integridade obrigatória

Os cenários que atravessam essas etapas devem conferir, conforme aplicável:

- o caso é o mesmo desde a criação até a geração documental;
- a identidade proprietária e as permissões são corretas;
- serviço e procedimento não são trocados silenciosamente;
- nome, CPF de teste, AIT, placa e órgão autuador correspondem aos dados fornecidos;
- análise e documento derivam dos dados persistidos e das regras autoritativas;
- pagamento está vinculado ao caso e ao usuário corretos;
- não aparecem dados de fallback conhecidos, como `Condutor Teste`, `123.456.789-09` ou `TEST-123456`, salvo se o próprio cenário os tiver informado deliberadamente;
- sucesso visual, HTTP 200 ou status `ready` isoladamente não comprovam persistência ou geração real.

Verificações diretas de banco servem para observar e confirmar o resultado. Não podem preparar previamente o caso de forma que pule o fluxo que o teste deveria validar.

## 5. Dados, isolamento e execução

- Usar exclusivamente dados sintéticos, identificados por um `E2E_TEST_RUN_ID` novo por execução.
- Preferir até cinco identidades sintéticas reutilizáveis quando o fluxo exigir usuário autenticado; cenários anônimos devem permanecer anônimos.
- Criar um caso separado por cenário e execução quando houver persistência. Nunca reutilizar um caso para simular dez cenários.
- Não criar usuário/caso durante descoberta ou listagem dos testes.
- Não apagar automaticamente usuários, casos, pagamentos, evidências ou dados persistidos.
- Exigir URL e projeto Supabase de teste explicitamente configurados; interromper se o alvo não puder ser confirmado.
- Bloquear pagamentos reais por padrão. Sandbox/test adapter só pode ser usado conforme o contrato real e a configuração segura do projeto.
- Executar sequencialmente por serviço: os dez cenários, o relatório do serviço e a verificação de resíduos antes de iniciar o seguinte.
- Reexecutar com um novo identificador, sem reaproveitar identificadores ou artefatos de execução anterior.

Nenhum nome de variável histórico é obrigatório por si só. Ao implementar, verificar os nomes e mecanismos realmente consumidos pelo código atual; não restaurar variáveis, flags ou scripts obsoletos só porque aparecem em relatórios antigos.

## 6. Evidências e resultado

Cada cenário deve registrar, sem segredos:
- identificador da execução, serviço e cenário;
- commit SHA, ambiente e versão do navegador;
- estado final `PASS`, `FAIL` ou `BLOCKED`;
- IDs dos registros relevantes, sem credenciais ou tokens;
- etapas executadas e verificações realizadas;
- screenshot/trace em falha e erros de console/rede relevantes;
- verificações de integridade e causa observada em caso de falha.

Cada serviço produz um resumo de 10 cenários. O relatório geral apresenta 70 cenários esperados, executados, aprovados, reprovados e bloqueados. `BLOCKED` não é `PASS`; um cenário não executado não pode ser contado como aprovado. Evidências não devem conter senhas, cookies, tokens, chaves ou dados pessoais reais.

## 7. Critérios de conclusão da certificação

A bateria só pode ser declarada concluída quando:
- os 70 cenários oficiais existem e foram descobertos pelo runner;
- cada serviço possui exatamente dez cenários únicos;
- todos os cenários executados têm resultado e evidência rastreáveis;
- não há `FAIL` ou `BLOCKED` ocultado, ignorado ou convertido em sucesso;
- os gates de integridade, segurança e pagamento aplicáveis passaram;
- resíduos e efeitos persistentes foram relatados; nenhuma limpeza destrutiva foi executada automaticamente;
- o relatório identifica o SHA exato testado e o ambiente usado.

A existência do código, a conclusão do build, testes unitários verdes ou uma execução parcial não equivalem à certificação dos 70 cenários.

## 8. Ordem de trabalho

1. Consolidar e validar a matriz de 70 cenários contra o código e contratos atuais, sem criar testes.
2. Resolver contradições documentais ou registrar bloqueios reais, sem corrigir produto automaticamente.
3. Implementar uma única suíte e um único runner canônicos, sem copiar a infraestrutura antiga.
4. Validar configuração e descoberta dos 70 cenários sem escritas persistentes.
5. Executar primeiro um cenário autorizado e revisar evidências.
6. Executar os dez cenários de cada serviço sequencialmente.
7. Publicar o relatório consolidado com resultados verificáveis.

## 9. Autoridade documental

Este arquivo é a única especificação operacional para a nova certificação dos 70 cenários. Documentos antigos de auditoria/execução são registros históricos, não instruções para reconstruir ou executar a suíte. Em caso de divergência, seguir este documento e `AGENTS.md`; confirmar o comportamento real no código atual antes de definir o oráculo do teste.

Não restaurar arquivos, comandos, fixtures, workflows ou flags da suíte removida sem uma necessidade demonstrada pelo desenho novo.
