# Agent: agent-vehicle-management

## Use this skill when
- Gerenciar dados de veículos associados a infrações de trânsito
- Criar, atualizar, buscar ou excluir registros de veículos
- Trabalhar com informações de marca, modelo, ano e placa de veículos
- Associar veículos a casos de infração e proprietários
- Validar placas de veículos conforme padrões do Detran
- Trabalhar com informações de chassi e renavam quando disponíveis
- Gerenciar histórico de veículos quando relevante para processos

## Do not use when
- Gerenciar casos de multa de trânsito (use agent-case-management)
- Gerenciar perfis de usuários (use agent-user-management)
- Processar infrações de trânsito (use agent-infraction-processing)
- Executar análise jurídica de casos (use agent-legal-analysis)
- Gerar estratégias de defesa (use agent-defense-management)
- Processar pagamentos (use agent-payment-processing)
- Gerenciar campanhas de marketing (use agent-marketing-automation)
- Enviar notificações ou comunicações (use agent-communication-management)
- Gerenciar logs de auditoria ou conformidade (use agent-audit-compliance)
- Trabalhar com dados de transporte ou trânsito (use agent-transportation-transit)
- Gerenciar planejamento e agendamento (use agent-planning-scheduling)
- Gerenciar assinaturas ou planos de pagamento (use agent-subscription-management)
- Gerenciar timelines ou históricos (use agent-timeline-management)

## Papel

Gerencia tudo relacionado a veículos no contexto de infrações de trânsito, incluindo armazenamento de dados, associação a casos e proprietários, e validação de informações veiculares.

## Diretórios Próprios

- src/domain/vehicle/** - Modelo, mapper e lógica de domínio de veículos
- src/services/api.ts (endpoints relacionados a veículos) - Apenas por meio do ApiService
- src/server.ts (rotas relacionadas a veículos) - Apenas por meio do servidor Express
- src/components/*vehicle* - Componentes de interface relacionados a veículos
- src/features/*/components/*vehicle* - Componentes de recursos relacionados a veículos

## Pode Importar de

- shared-types-kernel - Para tipos compartilhados como VehicleModel, tipos relacionados a veículos, etc.
- agent-user-management - Para obter informações do proprietário do veículo quando necessário

## NUNCA Importa de

- agent-case-management - Exceto para associar veículos a casos (via interface definida)
- agent-infraction-processing - Exceto para validar veículos em conexão com infrações (via interface definida)
- agent-marketing-automation - Exceto para veículos usados em campanhas de marketing (via interface definida)
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
- validation-patterns - Para validar dados veiculares conforme padrões estabelecidos
- geographic-data-patterns - Para trabalhar com dados de localização quando relevante

## Critérios de Sucesso

- CRUD completo de veículos implementado com testes passando
- Validação rigorosa de placas de veículos conforme padrões do Detran
- Integração correta com domínios de caso e usuário quando apropriado
- Evitar duplicação desnecessária de registros de veículos
- Manter histórico preciso quando relevante para processos legais
- Documentação clara de todas as funcionalidades e limites do agente

## Anti-Padrões

- ❌ Armazenar dados veiculares incompletos ou incorretos
- ❌ Vazar dados pessoais vinculados a veículos em respostas de API
- ❌ Criar registros duplicados de veículos sem necessidade
- ❌ Modificar arquivos fora dos diretórios próprios definidos
- ❌ Esquecer de atualizar ou remover veículos quando não mais relevantes
- ❌ Permitir associação incorreta entre veículos e casos
- ❌ Misturar responsabilidades de dados de veículos com lógica de processo jurídico