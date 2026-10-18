# Decisão: reconstrução do onboarding

**Projeto:** AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Produção:** https://adeusmulta.defesai.com.br  
**Status:** decisão aprovada; implementação ainda não autorizada por este documento  
**Data:** 2026-10-17

## Decisão

Reconstruir a experiência do onboarding como um fluxo novo, limpo e coerente, em vez de continuar acumulando remendos sobre a interface atual. A reconstrução é da experiência e da organização do fluxo; não é uma autorização para descartar o motor jurídico, regras, integrações ou trabalho existente sem inspeção e validação.

O onboarding é parte central da promessa do produto: coletar dados, identificar fatos relevantes, realizar uma análise fundamentada e gerar uma minuta individualizada. A interface nova só será considerada bem-sucedida se a experiência e o fluxo de dados funcionarem de ponta a ponta.

## Características de UX que devem ser preservadas

- Botões grandes, claros e fáceis de selecionar nas etapas.
- Combos de seleção quando forem mais simples e seguros do que texto livre.
- Modais para explicações, confirmações e detalhes complementares.
- Etapas curtas, com uma decisão principal por tela.
- Linguagem simples, acessível a quem não tem conhecimento jurídico.
- Progresso compreensível, mensagens claras e orientação do próximo passo.
- Extração assistida de documentos com confirmação explícita dos dados.
- Aparência limpa, hierarquia visual forte e ausência de controles redundantes.

Essas características são requisitos de produto, não detalhes opcionais de implementação.

## O que será reconstruído

- Composição, navegação e sequência das etapas.
- Modelo de estado do onboarding e transições entre etapas.
- Validação e apresentação de erros, carregamento, sucesso e retomada.
- Contratos da interface com análise, persistência e geração documental, se a auditoria identificar que precisam ser corrigidos.
- Comportamentos específicos para cada serviço, evitando perguntas irrelevantes.

## O que não deve ser refeito automaticamente

- Regras jurídicas e motor determinístico.
- Integrações de backend e banco de dados.
- Gerador de documentos, fontes e controles de qualidade.
- Componentes de UX que comprovadamente funcionem.
- Testes, documentação e artefatos existentes.

Cada item será classificado como preservar, reaproveitar após validação, corrigir, reconstruir ou descartar com justificativa.

## Princípios de arquitetura e confiabilidade

1. A interface não deve conter uma segunda cópia das regras jurídicas.
2. A análise precisa usar dados confirmados e diferenciar fatos confirmados, negados, desconhecidos e contraditórios.
3. Falha de backend ou de persistência nunca pode aparecer silenciosamente como sucesso.
4. Os dados exibidos, persistidos, analisados e utilizados na minuta devem ser rastreáveis e consistentes.
5. O usuário deve conseguir compreender o que falta e por que não pode avançar.
6. Uma pontuação heurística não deve ser apresentada como probabilidade real de êxito sem validação e calibração.
7. A minuta deve ser individualizada, ter fundamentos verificáveis e não inventar fatos, normas ou precedentes.
8. A qualidade visual não substitui a validação jurídica, funcional, de segurança e de integridade dos dados.
9. Nenhuma interface pode garantir o resultado de decisão administrativa ou judicial.
10. Preservar os arquivos e alterações locais existentes; não executar reset, limpeza destrutiva ou troca de branch que possa perder trabalho.

## Escopo funcional

O planejamento deve cobrir os sete serviços existentes:

- Defesa prévia.
- Recurso JARI.
- Recurso CETRAN.
- Processo de suspensão.
- Processo de cassação.
- Indicação de condutor.
- Conversão em advertência.

Componentes compartilhados são desejáveis, mas os requisitos, perguntas, impedimentos e documentos de cada serviço devem ser específicos quando necessário.

## Limites desta decisão

- Não autoriza deploy, alteração de produção, migrações ou alterações destrutivas de banco.
- Não autoriza cobranças reais.
- Testes de navegador na produção, se forem posteriormente autorizados, devem usar a URL real `https://adeusmulta.defesai.com.br`, dados sintéticos identificáveis, proteção contra efeitos financeiros e limpeza estritamente limitada aos registros criados pelo próprio teste.
- A execução de testes que escrevam em produção só pode começar após o mecanismo de reconciliação e isolamento estar demonstravelmente seguro.
- Não declara a implementação atual aprovada nem certifica a qualidade jurídica do produto.

## Critério de sucesso

Um onboarding mais simples para o usuário e tecnicamente confiável de ponta a ponta: coleta → confirmação → análise → persistência → recuperação → minuta → validação → entrega. A conclusão exige evidências reproduzíveis, não apenas inspeção visual ou testes unitários isolados.
