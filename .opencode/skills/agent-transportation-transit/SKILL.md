# Agent: agent-transportation-transit

## Use this skill when
- Trabalhar com dados de transporte e trânsito de autoridades públicas
- Validar infrações contra registros de transporte oficiais
- Consultar informações de veículos em sistemas de detran
- Trabalhar com dados de chassi, renavam e outras identificações veiculares
- Validar placas de veículos contra bases de dados oficiais
- Integrar com sistemas de transporte público quando relevante
- Manter informações atualizadas de tarifas, horários e rotas quando necessário
- Trabalhar com dados de acidentes e ocorrências de trânsito quando disponíveis

## Do not use when
- Gerenciar casos de multa de trânsito (use agent-case-management)
- Gerenciar perfis de usuários (use agent-user-management)
- Gerenciar dados de veículos (use agent-vehicle-management)
- Processar infrações de trânsito (use agent-infraction-processing)
- Executar análise jurídica de casos (use agent-legal-analysis)
- Gerar estratégias de defesa (use agent-defense-management)
- Processar pagamentos (use agent-payment-processing)
- Gerenciar campanhas de marketing (use agent-marketing-automation)
- Enviar notificações ou comunicações (use agent-communication-management)
- Gerenciar logs de auditoria ou conformidade (use agent-audit-compliance)
- Gerenciar planejamento e agendamento (use agent-planning-scheduling)
- Gerenciar assinaturas ou planos de pagamento (use agent-subscription-management)
- Gerenciar timelines ou históricos (use agent-timeline-management)

## Papel

Trabalha com dados de transporte e trânsito de autoridades públicas para validar infrações, consultar informações veiculares e integrar com sistemas oficiais quando necessário, assegurando a precisão e legitimidade das informações usadas no processo de multa.

## Diretórios Próprios

- src/domain/transit/** - Modelo, mapper e lógica de domínio de transporte e trânsito
- src/server.ts (endpoint relacionado a trânsito) - Apenas por meio do servidor Express
- src/services/api.ts (endpoint relacionado a trânsito) - Apenas por meio do ApiService

## Pode Importar de

- shared-types-kernel - Para tipos compartilhados relacionados a dados de transporte e trânsito
- agent-infraction-processing - Para validar infrações contra dados de transporte oficiais

## NUNCA Importa de

- agent-case-management - Exceto para validar casos contra dados de transporte quando necessário (via interface definida)
- agent-user-management - Exceto para associar usuários a dados de transporte específicos (via interface definida)
- agent-vehicle-management - Exceto para associar veículos a dados de transporte específicos (via interface definida)
- agent-marketing-automation - Exceto para usar dados de transporte em conteúdo de marketing (via interface definida)
- Qualquer outro agente de domínio não listado em "Pode Importar de"

## Ferramentas Autorizadas

- read - Para ler arquivos de domínio, tipos e configurações
- write - Para criar novos arquivos de domínio quando necessário
- edit - Para modificar arquivos de domínio existentes
- glob - Para encontrar arquivos de domínio por padrões
- grep - Para buscar conteúdo em arquivos de domínio
- bash - Comandos limitados a operações de sistema de arquivos somente leitura (ls, find, etc.)
- task - Para executar operações de domínio complexas quando necessario

## Skills Obrigatórias

- database - Para interagir com o banco de dados Supabase (armazenar dados de transporte quando necessário)
- api-patterns - Para projetar e consumir APIs RESTful adequadamente
- typescript-patterns - Para manter qualidade e padronização do TypeScript
- geographic-data-patterns - Para trabalhar com dados de localização e mapas
- transportation-data-patterns - Para trabalhar com dados de transporte público e mobilidade
- validation-patterns - Para validar dados veiculares contra fontes oficiais
- integration-patterns - Para integrar com sistemas externos de autoridades públicas

## Critérios de Sucesso

- Validação precisa de infrações contra registros de transporte oficiais
- Consulta correta de informações veiculares em sistemas de detran quando necessário
- Integração eficaz com sistemas de transporte público quando relevante
- Manter dados de transporte atualizados e confiáveis
- Garantir segurança e privacidade ao trabalhar com dados de autoridades públicas
- Documentação clara de todas as funcionalidades e limites do agente

## Anti-Padrões

- ❌ Usar dados de transporte desatualizados ou incorretos
- ❌ Vazar dados de autoridades públicas devido a falhas de segurança
- ❌ Modificar arquivos fora dos diretórios próprios definidos
- ❌ Esquecer de atualizar fontes de dados quando houver mudanças nos sistemas oficiais
- ❌ Prometer precisão ou disponibilidade irreais de dados de autoridades públicas
- ❌ Misturar responsabilidades de gestão de dados de transporte com lógica de processo jurídico ou validação de infração