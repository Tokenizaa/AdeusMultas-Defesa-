# Agent: agent-legal-analysis

## Use this skill when
- Executar análise jurídica de infrações de trânsito
- Identificar fundamentos de nulidade em autos de infração
- Gerar teses e argumentos para defesa em processos de trânsito
- Processar texto extraído de documentos via OCR para análise jurídica
- Fornecer probabilidades de sucesso e tiers de confiança
- Trabalhar com precedentes jurídicos e teses consolidadas
- Associar análises a casos específicos de multa
- Manter base de conhecimento jurídico atualizada

## Do not use when
- Gerenciar casos de multa de trânsito (use agent-case-management)
- Gerenciar perfis de usuários (use agent-user-management)
- Gerenciar dados de veículos (use agent-vehicle-management)
- Processar infrações de trânsito (use agent-infraction-processing)
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

Executa análise jurídica de infrações de trânsito para identificar fundamentos de nulidade, gerar teses de defesa e fornecer avaliações de probabilidade de sucesso, fundamentando as estratégias de defesa dos casos.

## Diretórios Próprios

- src/domain/analysis/** - Modelo, mapper e lógica de domínio de análise jurídica
- src/server.ts (endpoints relacionados a análise Gemini) - Apenas por meio do servidor Express
- src/services/api.ts (endpoints relacionados a análise) - Apenas por meio do ApiService
- src/components/*analysis* - Componentes de interface relacionados a análise
- src/features/*/components/*analysis* - Componentes de recursos relacionados a análise

## Pode Importar de

- agent-infraction-processing - Para obter dados validados de infrações para análise
- shared-types-kernel - Para tipos compartilhados como AIAnalysisResult, enums relacionados a análise, etc.

## NUNCA Importa de

- agent-case-management - Exceto para receber casos para análise e retornar resultados (via interface definida)
- agent-defense-management - Exceto para fornecer análises para geração de defesa (via interface definida)
- agent-marketing-automation - Exceto para análises usadas em conteúdo de marketing (via interface definida)
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

- database - Para interagir com o banco de dados Supabase (armazenar análises)
- api-patterns - Para projetar e consumir APIs RESTful adequadamente
- typescript-patterns - Para manter qualidade e padronização do TypeScript
- ai-prompt-engineering - Para elaborar prompts eficazes para modelos de IA
- legal-research-patterns - Para pesquisar e aplicar precedentes jurídicos
- pattern-recognition - Para identificar padrões em documentos jurídicos

## Critérios de Sucesso

- Identificação precisa de fundamentos de nulidade em autos de infração
- Geração de teses jurídicas sólidas e bem fundamentadas
- Fornecimento de probabilidades de sucesso realistas e bem fundamentadas
- Integração correta com domínios de infração e caso quando apropriado
- Uso eficaz de IA para análise de documentos jurídicos
- Manutenção de base de conhecimento jurídico atualizada e relevante
- Documentação clara de todas as funcionalidades e limites do agente

## Anti-Padrões

- ❌ Fornecer análises jurídicas genéricas ou não fundamentadas
- ❌ Vazar dados sensíveis de casos em respostas de análise
- ❌ Depender exclusivamente de IA sem validação jurídica humana
- ❌ Modificar arquivos fora dos diretórios próprios definidos
- ❌ Esquecer de atualizar a base de conhecimento quando houver mudanças na jurisprudência
- ❌ Prometer probabilidades de sucesso irreais ou não fundamentadas
- ❌ Misturar responsabilidades de análise jurídica com geração de estratégias de defesa