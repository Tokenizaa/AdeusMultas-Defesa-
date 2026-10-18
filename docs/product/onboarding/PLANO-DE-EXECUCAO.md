# Plano de ação: reconstrução do onboarding

**Projeto:** AdeusMultas  
**Decisão relacionada:** [DECISAO-RECONSTRUCAO.md](./DECISAO-RECONSTRUCAO.md)  
**Status geral:** reconstrução greenfield já iniciada em `onboarding/rebuild-canonico-clean`; Fase 1 de triagem do legado concluída  
**Data:** 2026-10-17

## Objetivo

Entregar um onboarding novo e limpo, preservando as interações de UX aprovadas, integrado aos serviços existentes e validado do primeiro dado coletado até a minuta final.

O plano é organizado em fases completas. Não avançar automaticamente para a fase seguinte se a anterior terminar com bloqueios críticos ou evidências insuficientes.

## Regras de execução

- Trabalhar sobre uma branch de trabalho apropriada; nunca substituir ou descartar alterações locais preexistentes.
- Antes de editar, inspecionar branch, commit, estado do working tree, arquivos não rastreados e documentação existente.
- Atualizar este status e os relatórios de evidência ao concluir cada fase.
- Evitar reimplementar sistemas que já existem sem provar que não podem ser reaproveitados.
- Não realizar deploy, migração, alteração destrutiva de banco ou cobrança real como parte das fases de desenvolvimento.
- Se for necessário testar no navegador da produção, usar `https://adeusmulta.defesai.com.br` conforme orientação do produto; não presumir que existe uma pré-produção equivalente. Testes com escrita em produção permanecem bloqueados até haver isolamento e reconciliação confiáveis, usam somente dados sintéticos e não podem disparar cobranças.
- Todo resultado deve ser classificado como aprovado, bloqueado ou inconclusivo com evidência reproduzível.

## Fase 1 — Compreensão e triagem do legado

**Status: CONCLUÍDA.** Esta fase existe para entender o legado e decidir o que será preservado como requisito, reaproveitado como serviço, reescrito ou descartado. Não exige corrigir o onboarding antigo nem executar seus testes antes de iniciar o greenfield.

### Entregáveis concluídos
- Inventário estático do fluxo, componentes, regras, OCR, persistência, análise e geração documental.
- Matriz explícita do que preservar, reutilizar, reescrever, substituir ou descartar em `FASE-1-DECISAO-PRESERVACAO.md`.
- Registro de problemas do legado para impedir que sejam transportados ao novo fluxo.
- Identificação da linha greenfield existente `onboarding/rebuild-canonico-clean`, com Fases 1–5 documentadas como concluídas e Fase 6 iniciada.

### Fora do critério de saída desta fase
- Build, lint, testes unitários ou E2E do legado.
- Confirmação do deployment de produção.
- Correção de defeitos no onboarding que será arquivado.

Essas validações devem incidir sobre a nova implementação antes da ativação. O checkout local deve ser preservado quando o trabalho for retomado, sem reset/clean ou sobrescrita de alterações preexistentes.

## Fase 2 — Matriz de preservação e diagnóstico

Classificar os elementos encontrados em:

| Classificação | Significado |
|---|---|
| Preservar | Comportamento de UX aprovado e funcional. |
| Reaproveitar após validação | Regra, serviço, componente ou contrato com evidência suficiente. |
| Corrigir antes de integrar | Implementação útil com defeito confirmado. |
| Reconstruir | Organização de interface, fluxo ou estado que não atende ao objetivo. |
| Descartar com justificativa | Duplicação ou código obsoleto cuja substituição já esteja demonstrada. |

### Áreas mínimas a inspecionar
- Botões grandes, combos, modais, progresso, navegação e acessibilidade.
- Validação de campos e semântica dos dados.
- Leitura/OCR: formato enviado, resposta recebida, erros e confirmação pelo usuário.
- Motor determinístico e significado de cada resultado exibido.
- Recuperação do caso, persistência, repetição e idempotência.
- Pesquisa/proveniência de fontes jurídicas e tratamento de fontes indisponíveis.
- Geração da minuta e Quality Gate.
- Limites entre onboarding gratuito, geração documental, autenticação e pagamento.

### Critérios de saída
- Cada decisão de preservar, reaproveitar, corrigir ou reconstruir tem justificativa.
- Nenhuma regra de negócio é descartada apenas por estar ligada à interface antiga.

## Fase 3 — Especificação UX, funcional e de contratos

### Trabalho
1. Definir o fluxo principal e as ramificações por serviço.
2. Criar um mapa de telas/etapas e estados, incluindo caminhos de retorno e edição.
3. Definir campos obrigatórios, opcionais, confirmados, negados, desconhecidos e contraditórios.
4. Definir contratos de entrada e saída para interface, análise, OCR, persistência, recuperação e documento.
5. Definir o que permite avançar, o que exige confirmação e o que bloqueia o fluxo.
6. Definir mensagens de erro, carregamento, sucesso, indisponibilidade, repetição e retomada.
7. Especificar privacidade, minimização de dados e recuperação segura sem expor dados pessoais em armazenamento inadequado.
8. Criar wireframes simples ou especificação visual suficiente para orientar a implementação.

### Fluxo-alvo
1. Identificar situação/serviço.
2. Coletar dados relevantes.
3. Ler documentos e confirmar os dados extraídos.
4. Validar completude, contradições, competência e prazos.
5. Executar análise preliminar fundamentada.
6. Explicar achados, pendências e limitações.
7. Gerar minuta individualizada.
8. Executar controle de qualidade e disponibilizar o documento.

### Critérios de saída
- Fluxo e contratos documentados antes de codificar.
- Cada um dos sete serviços tem requisitos e bloqueios próprios identificados.
- Os estados de erro e recuperação não são tratados como sucesso.

## Fase 4 — Reconstrução da interface

### Trabalho
- Implementar o fluxo novo de forma integrada, sem criar uma aplicação ou um motor jurídico paralelo.
- Reutilizar os padrões aprovados de botões grandes, combos, modais e etapas curtas.
- Manter uma hierarquia visual simples e responsiva.
- Garantir que os componentes sejam acessíveis por teclado e tenham rótulos e mensagens claros.
- Centralizar o estado do fluxo e as transições para evitar divergência entre etapas.
- Conectar somente a contratos já especificados e manter o legado sem ativação em produção.
- Evitar redesenho desnecessário de páginas fora do onboarding.

### Critérios de saída
- Percurso visual completo e navegável em ambiente de desenvolvimento.
- Estados vazios, erro, carregamento e sucesso implementados.
- Nenhuma regra jurídica duplicada no frontend.
- Comparação documentada com as características de UX a preservar.

## Fase 5 — Integração ponta a ponta

Validar o percurso real:

`Formulário → confirmação dos dados → análise → persistência → recuperação → minuta → controle de qualidade → entrega`

### Testes mínimos
- Dados corretos e completos.
- Dados obrigatórios ausentes.
- Dados contraditórios.
- OCR inválido, indisponível ou parcialmente preenchido.
- Erro e timeout de API.
- Repetição de ação e submissão duplicada.
- Recarregar a página e retomar o caso.
- Falha de persistência depois de análise local.
- Fonte jurídica indisponível ou sem correspondência.
- Minuta recusada pelo Quality Gate.

### Critérios de saída
- Dados mostrados ao usuário correspondem aos persistidos e usados na análise/minuta.
- Nenhuma falha é mascarada como sucesso.
- Retomada e repetição são previsíveis e não duplicam casos ou cobranças.
- Cada resultado pode ser rastreado até a entrada e a versão do código.

## Fase 6 — Validação jurídica, documental, segurança e operação

### Casos e oráculos
Criar uma bateria de casos sintéticos para cada serviço, com resultado esperado definido antes da execução. Revisão jurídica especializada deve validar os oráculos e as minutas representativas; o teste técnico sozinho não certifica adequação jurídica.

### Verificações
- Fatos utilizados estão presentes e confirmados.
- Informação desconhecida não é convertida em negativa ou prova.
- Fundamentos e referências são pertinentes, atuais e rastreáveis.
- A minuta tem destinatário, procedimento, pedidos e dados necessários para o serviço.
- O conteúdo é individualizado e não depende apenas de texto genérico.
- Não há fatos, normas, precedentes ou resultados inventados.
- A pontuação apresentada é descrita corretamente e não simula probabilidade calibrada.
- Isolamento de usuários/casos, acesso aos documentos, RLS, logs e dados pessoais.
- Integridade após falhas, retries e retomadas.

### Serviços abrangidos
- `defesa_previa`
- `recurso_jari`
- `recurso_cetran`
- `suspensao`
- `cassacao`
- `indicacao_condutor`
- `conversao_advertencia`

### Critérios de saída
- Evidência por cenário, com estado `APROVADO`, `BLOQUEADO` ou `INCONCLUSIVO`.
- Nenhuma falha crítica ou alta de segurança sem mitigação.
- Critérios obrigatórios de qualidade documental atendidos.
- Bloqueios legais e funcionais explicitados; sem aprovação por média que esconda falha crítica.

## Fase 7 — Ativação controlada e rollback

### Pré-condições
- Fases 1–6 concluídas ou exceções formalmente aprovadas.
- Diferenças entre versão testada e publicada resolvidas.
- Relatório de validação concluído.
- Estratégia de ativação, monitoramento e rollback testada.
- Nenhuma migração ou alteração de produção não autorizada pendente.

### Trabalho
- Planejar ativação controlada.
- Validar o percurso completo após ativação com riscos e efeitos externos controlados.
- Monitorar falhas, persistência, conclusão do fluxo e geração de documentos.
- Manter caminho de rollback até comprovar estabilidade.
- Só remover o legado após aprovação explícita e comprovação de que não é mais necessário.

### Critérios de saída
- Decisão registrada: ativar, adiar ou rejeitar.
- Plano de rollback verificável.
- Nenhuma declaração de estabilidade sem evidência.

## Entregáveis documentais

- `docs/product/onboarding/DECISAO-RECONSTRUCAO.md`
- `docs/product/onboarding/PLANO-DE-EXECUCAO.md`
- `docs/product/onboarding/STATUS-E-EVIDENCIAS.md`
- Inventário técnico do legado.
- Matriz de preservação/reconstrução.
- Especificação de fluxo e contratos.
- Matriz de testes/oráculos por serviço.
- Relatório de validação ponta a ponta e qualidade documental.

## Próxima ação autorizada

Continuar a linha greenfield existente `onboarding/rebuild-canonico-clean` na Fase 6 — integrações reais. Não iniciar uma segunda UI paralela e não transportar componentes do onboarding legado. Fechar os contratos pendentes de qualificação, claim autenticado, PDF, pagamento e geração documental; em seguida executar testes automatizados e ponta a ponta na nova implementação. Não realizar deploy, migração ou cobrança real sem autorização explícita.
