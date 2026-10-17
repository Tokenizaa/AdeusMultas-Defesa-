# Diretriz de simplificação — Operação de Marketing

**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Status:** diretriz funcional documentada; ainda não implementada.  
**Escopo:** módulo administrativo Crescimento → Operação de Marketing.

## 1. Objetivo

Enxugar o módulo, removendo fluxos e interfaces que duplicam recursos já disponíveis no Planner do Meta Business Suite.

O sistema deve concentrar-se em preparar, revisar e produzir conteúdo. Quando o conteúdo estiver pronto para publicação nos canais Meta conectados, o fluxo deve encaminhar o usuário para o agendamento no Planner da Meta, em vez de manter um segundo sistema interno de calendário, fila ou Kanban.

**Princípio central:** preparar no AdeusMultas; agendar e acompanhar no Planner da Meta, dentro dos recursos efetivamente suportados pela integração.

## 2. Fluxo funcional pretendido

1. **Preparar:** definir tema, objetivo, canal e formato do conteúdo.
2. **Criar:** redigir a copy e produzir ou selecionar os materiais visuais.
3. **Revisar:** conferir texto, arte, links e informações antes de encaminhar.
4. **Encaminhar para publicação:** utilizar a integração Meta disponível para enviar o conteúdo ou abrir o fluxo apropriado de publicação/agendamento.
5. **Concluir:** informar claramente ao usuário o resultado da ação e, quando aplicável, fornecer acesso ao Planner da Meta para concluir ou conferir o agendamento.

O comportamento exato do passo 4 depende das capacidades autorizadas e implementadas pela integração Meta. Não se deve apresentar uma publicação como agendada se o sistema apenas abriu o Planner ou preparou o conteúdo.

## 3. Componentes a simplificar

| Componente atual | Diretriz |
|---|---|
| Kanban Editorial | Remover como área autônoma. Não manter um Kanban interno para reproduzir o planejamento de publicação. |
| Agendamento & Fila | Remover a fila e o calendário internos como destino operacional. O agendamento deve ficar no Planner da Meta. |
| Automações de Postagem | Não manter uma tela separada que replique fila ou agendamento. Preservar apenas automações necessárias à preparação e à integração, se comprovadas no levantamento técnico. |
| Biblioteca de Conteúdos | Reavaliar como área simples de conteúdos preparados e reutilizáveis; não confundir biblioteca com calendário ou fila de publicação. |
| Estúdio Criativo IA | Manter como ferramenta de criação de textos e materiais, integrada ao fluxo de preparação. |
| Canais Conectados | Manter para configuração e estado da conexão Meta necessários ao encaminhamento do conteúdo. |
| Dashboard Geral | Reduzir ao essencial, sem indicadores ou controles que dependam da fila interna que será retirada. |
| Análise de Resultados | Manter somente indicadores com origem e significado claros. Métricas disponíveis no Meta devem ser aproveitadas pela integração, se houver acesso autorizado; não presumir que já estejam sincronizadas. |
| Inbox Unificado | Tratar como função separada de atendimento/conversas; não remover automaticamente por causa da simplificação do agendamento. |
| Configurações de Marca | Manter apenas parâmetros efetivamente usados na preparação e revisão do conteúdo. |

## 4. O que não deve ser construído

- Um segundo Planner ou calendário editorial para publicações Meta.
- Uma fila interna cuja finalidade seja reproduzir o estado de agendamento já gerenciado no Meta.
- Um Kanban mantido apenas para representar etapas que não agregam função própria.
- Indicadores de “agendado” ou “publicado” sem confirmação verificável da plataforma responsável.
- Novos serviços, tabelas ou workers antes de mapear o que já existe e definir o que será removido ou preservado.

## 5. Limites e dependências a verificar antes da implementação

O código atual contém referências a publicação via Meta, conexão de canal, workers e estados de publicação. Antes de alterar ou excluir qualquer um deles, é necessário mapear:

- Qual endpoint e quais permissões da Meta são utilizados.
- Se a integração consegue efetivamente criar e agendar publicações, ou se apenas publica imediatamente/abre uma etapa externa.
- Quais formatos e canais são suportados pela integração existente.
- Onde os conteúdos e seus materiais ficam armazenados.
- Quais dados de status são retornados pela Meta e quais são estados internos.
- Quais jobs, workers, rotas e testes dependem dos componentes de fila/publicação.
- Como evitar perder conteúdo já preparado durante a remoção das interfaces atuais.

Não presumir que a API da Meta permita reproduzir todas as operações do Planner. A experiência final deve refletir a capacidade real da integração e direcionar o usuário ao Planner quando for necessária uma ação externa.

## 6. Critério de conclusão desta diretriz

A interface resultante deve ter um caminho curto e compreensível: **preparar → criar → revisar → encaminhar ao Planner da Meta**.

A remoção de telas e código só deve começar depois de concluir o mapeamento de dependências. Esta documentação não autoriza, por si só, a exclusão de dados, rotas, workers ou integração existentes.
