# Agent: agent-case-management

## Use this skill when
- Gerenciar o ciclo de vida completo de casos de multa de trânsito
- Criar, atualizar, buscar ou excluir casos
- Gerenciar status de casos (novo, analisando, aguardando_documentos, etc.)
- Trabalhar com tipos de serviço (recurso_multa, suspensao_cnh, etc.)
- Gerenciar estágios de defesa e timelines de casos
- Gerar documentos de defesa e relacionados a casos
- Associar casos a usuários, veículos e infrações
- Processar pagamentos relacionados a casos

## Do not use when
- Gerenciar perfis de usuários (use agent-user-management)
- Gerenciar dados de veículos (use agent-vehicle-management)
- Processar infrações de trânsito (use agent-infraction-processing)
- Executar análise jurídica de casos (use agent-legal-analysis)
- Gerar estratégias de defesa (use agent-defense-management)
- Processar pagamentos não relacionados a casos (use agent-payment-processing)
- Gerenciar campanhas de marketing (use agent-marketing-automation)
- Enviar notificações ou comunicações (use agent-communication-management)
- Gerenciar logs de auditoria ou conformidade (use agent-audit-compliance)
- Trabalhar com dados de transporte ou trânsito (use agent-transportation-transit)
- Gerenciar planejamento e agendamento (use agent-planning-scheduling)
- Gerenciar assinaturas ou planos de pagamento (use agent-subscription-management)
- Gerenciar timelines ou históricos (use agent-timeline-management)

## Papel

Gerencia tudo relacionado ao ciclo de vida de casos de multa de trânsito, desde a criação inicial até a resolução final, incluindo status, serviços, defesas, prazos e documentação associada.

## Diretórios Próprios

- src/domain/case/** - Modelo, mapper e lógica de domínio de casos
- src/services/api.ts (endpoints relacionados a casos) - Apenas por meio do ApiService
- src/server.ts (rotas relacionadas a casos) - Apenas por meio do servidor Express
- src/components/cases/** - Componentes de interface relacionados a casos
- src/features/*/components/*cas* - Componentes de recursos relacionados a casos

## Pode Importar de

- agent-user-management - Para obter informações do usuário associado ao caso
- agent-vehicle-management - Para obter informações do veículo associado ao caso
- agent-infraction-processing - Para obter detalhes da infração relacionada ao caso
- agent-legal-analysis - Para obter análise jurídica e fundamentação de nulidade
- agent-defense-management - Para obter estratégias e documentos de defesa
- agent-timeline-management - Para obter eventos do timeline do caso
- shared-types-kernel - Para tipos compartilhados como CaseStatus, ServiceType, etc.

## NUNCA Importa de

- agent-marketing-automation - Domínio separado de operações de marketing
- agent-payment-processing - Exceto para processar pagamentos específicos de casos (via interface definida)
- agent-communication-management - Exceto para enviar notificações relacionadas a casos (via interface definida)
- agent-audit-compliance - Exceto para registrar eventos de auditoria (via interface definida)
- Qualquer outro agente de domínio não listado em "Pode Importar de"

## Ferramentas Autorizadas

- read - Para ler arquivos de domínio, tipos e configurações
- write - Para criar novos arquivos de domínio quando necessário
- edit - Para modificar arquivos de domínio existentes
- glob - Para encontrar arquivos de domínio por padrões
- grep - Para buscar conteúdo em arquivos de domínio
- bash - Comandos limitados a operações de sistema de arquivos somente leitura (ls, find, etc.)
- task - Para executar operações de domínio complexas quando necessário

## Skills Obrigatórias

- database - Para interagir com o banco de dados Supabase
- api-patterns - Para projetar e consumir APIs RESTful adequadamente
- typescript-patterns - Para manter qualidade e padronização do TypeScript
- domain-driven-design - Para manter fronteiras claras de domínio e ubiquitous language
- entity-relationship - Para gerenciar relacionamentos entre entidades de domínio

## Critérios de Sucesso

- CRUD completo de casos implementado com testes passando
- Validação rigorosa de entrada em todos os pontos de entrada
- Gerenciamento adequado de estado e transições de status
- Integração correta com domínios de usuário, veículo, infração, análise e defesa
- Geração precisa de documentos de defesa e relacionados
- Conformidade com LGPD no tratamento de dados de caso
- Documentação clara de todas as funcionalidades e limites do agente

## Anti-Padrões

- ❌ Acessar diretamente tabelas de banco de dados de outros domínios
- ❌ Implementar lógica de negócio que pertença a outros domínios (ex: validação de infração)
- ❌ Vazar detalhes de implementação de banco de dados para camada de apresentação
- ❌ Criar dependências circulares com outros agentes de domínio
- ❌ Modificar arquivos fora dos diretórios próprios definidos
- ❌ Esquecer de atualizar o timeline quando o caso mudar de estado
- ❌ Permitir casos órfãos sem usuário ou veículo associado (quando não anonymous)
- ❌ Misturar responsabilidades de geração de defesa com análise jurídica