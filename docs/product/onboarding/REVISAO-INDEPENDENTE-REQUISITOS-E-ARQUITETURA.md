# AdeusMulta — revisão independente antes da reconstrução

## Decisão de engenharia

**Nenhuma regra de negócio, contrato, serviço, arquitetura, fluxo ou documento existente é presumido correto.** O legado e o rebuild atual são fontes para descoberta de hipóteses e casos de uso, não bases obrigatórias para a nova implementação.

A branch `onboarding/rebuild-canonico-clean` não é uma arquitetura aprovada nem a implementação oficial por inércia. Não continuar F6 até concluir a revisão de requisitos e decidir explicitamente o que será reconstruído, substituído ou eventualmente reutilizado.

Esta revisão não declara validação jurídica ou técnica concluída. Ela define o processo e os critérios necessários para obtê-la.

## Objetivo

Especificar e construir um serviço de autoatendimento para preparar documentos relacionados à defesa de autuações de trânsito, com resultados individualizados, fundamentação verificável e limites explícitos. O produto não deve se apresentar como órgão público, despachante, escritório de advocacia, garantia de cancelamento de multa ou protocolo automático quando isso não existir.

## Princípios obrigatórios

1. **Zero pressupostos herdados:** regra, fluxo, esquema, pontuação, serviço e contrato existente precisam ser reavaliados.
2. **Fonte primária antes de opinião:** texto legal oficial, atos vigentes e decisões oficiais relevantes têm precedência sobre blogs, páginas comerciais e conteúdo gerado por IA.
3. **Validade temporal e territorial:** toda regra precisa registrar jurisdição, modalidade de processo, vigência, alterações e data da última conferência.
4. **Rastreabilidade ponta a ponta:** cada conclusão importante do documento deve apontar para fatos informados, evidências e fontes normativas aplicáveis.
5. **Sem inferência como fato:** campo ausente, ilegível, contraditório ou incerto não pode virar valor presumido. Pedir confirmação ou declarar a limitação.
6. **Sem probabilidade fabricada:** não exibir percentual de sucesso, chance de deferimento ou classificação equivalente sem método validado, dados adequados, calibração demonstrável e revisão jurídica do uso.
7. **Sem promessa falsa de execução:** análise concluída, pagamento aprovado, documento gerado, documento baixado e protocolo realizado são estados diferentes.
8. **Reutilização é exceção justificada:** só reutilizar código ou serviço depois de avaliar correção, contrato, segurança, manutenção, dependências e custo de substituição. Compatibilidade com o legado não é critério suficiente.
9. **Revisões independentes:** aprovação jurídica e aprovação técnica são registros separados, com evidências, responsáveis e pendências.
10. **Mudanças controladas:** alteração normativa invalida a aprovação das regras afetadas até nova revisão.

## Frente jurídica — trabalho exigido

Mapear, sem assumir que a lista seja exaustiva:

- Código de Trânsito Brasileiro e alterações vigentes.
- Resoluções CONTRAN aplicáveis, incluindo procedimentos de defesa/recurso e regras de autuação/notificação; confirmar vigência e alterações antes de codificar.
- Requisitos e práticas do órgão autuador, respeitando diferenças entre órgãos e etapas processuais.
- Legitimidade, representação, assinatura, documentos exigidos, prazo e canal de apresentação.
- Diferenças entre defesa da autuação, recurso contra penalidade e outros procedimentos; não tratá-los como um fluxo único.
- Regras específicas por tipo de infração e meio de constatação, quando pertinentes.
- LGPD, finalidade e base legal do tratamento, minimização, retenção, segurança, direitos do titular e fornecedores envolvidos.
- Limites profissionais e de comunicação do produto, incluindo quando encaminhar para avaliação humana especializada.

### Registro obrigatório de cada regra jurídica

Cada regra candidata deve ter:

- ID estável e título claro.
- Questão jurídica que pretende resolver e escopo de aplicação.
- Fonte primária oficial, URL, artigo/dispositivo, versão ou ato, data de publicação e data de acesso.
- Situação de vigência, alterações, revogações e dependências normativas verificadas.
- Fatos necessários para aplicar a regra e origem de cada fato.
- Condição de aplicação em linguagem simples e representação formal testável.
- Resultado esperado, exceções, ambiguidades e cenários em que não se deve concluir.
- Exemplos positivos, negativos, limítrofes e contraditórios.
- Parecer/revisão de profissional jurídico qualificado, identificação do revisor, data, decisão e ressalvas.
- Casos de teste vinculados e versão de implementação.

**Uma pesquisa na internet ou uma resposta de IA não equivale a parecer jurídico.** A aprovação deve ser feita por profissional habilitado, com escopo e responsabilidade definidos. Questões ambíguas ficam bloqueadas ou são apresentadas como inconclusivas; não se resolvem por palpite.

## Frente técnica — trabalho exigido

Comparar alternativas arquiteturais a partir dos requisitos e riscos, não da estrutura existente. Avaliar pelo menos:

- Modelo de domínio e ciclo de vida do caso, com transições explícitas e invariantes.
- Separação entre captura de dados, OCR, confirmação humana, análise determinística, geração documental, pagamento e protocolo, conforme o fluxo canônico em produção.
- Esquema de dados e migrações, integridade referencial, idempotência, concorrência, recuperação e auditoria.
- Segurança de autenticação/autorização, isolamento entre usuários, tokens de reivindicação, upload e armazenamento de documentos, segredos, rate limits e proteção contra abuso.
- Privacidade e ciclo de vida dos dados pessoais e documentos.
- Proveniência e versionamento das fontes jurídicas e das regras aplicadas a cada caso.
- Geração de documentos com templates versionados, fundamentação e fatos rastreáveis; evitar texto inventado ou referências não verificadas.
- Tratamento de falhas, retentativas, estados parciais, observabilidade sem vazamento de dados sensíveis e recuperação operacional.
- Custos, dependências, manutenção, simplicidade e possibilidade de trocar fornecedores.
- Acessibilidade, usabilidade móvel e compreensão por pessoas sem conhecimento jurídico.
- Estratégia de testes: unitários, propriedades/invariantes, integração, autorização negativa, regressão jurídica, testes de contrato, E2E e avaliação documental por revisores humanos.

Usar referências reconhecidas como guias de verificação, adaptadas ao risco do produto; não alegar conformidade apenas por citá-las. No mínimo, avaliar OWASP ASVS para requisitos verificáveis de segurança e NIST SSDF para práticas de desenvolvimento seguro.

## Arquitetura e implementação — regra de decisão

Não importar componentes, hooks, estado, regras ou contratos do onboarding legado ou do rebuild atual por conveniência. Para cada possível reutilização, produzir uma decisão curta:

- **Recriar:** requisito válido, implementação descartada.
- **Substituir:** serviço/abordagem inadequado ou sem evidência suficiente.
- **Reutilizar após validação:** componente isolado, contrato conhecido, testes e revisão satisfatórios.
- **Não implementar:** necessidade não comprovada ou fora do escopo.
- **Pendente de decisão:** evidência insuficiente; não esconder como implementação concluída.

Uma tabela de comparação deve registrar alternativa considerada, benefício, risco, custo operacional, evidência e decisão. O resultado pode ser uma arquitetura completamente diferente da existente.

## Portões de aprovação

### Portão A — requisitos e evidências
- Inventário das jornadas e resultados que o produto precisa oferecer.
- Matriz jurídica de regras, fontes e lacunas.
- Requisitos técnicos e de segurança verificáveis.
- Nenhuma regra crítica sem fonte e estado de revisão explícitos.

### Portão B — validação jurídica
- Revisão por profissional jurídico habilitado e independente da implementação.
- Casos de teste jurídicos aprovados, incluindo exceções e cenários em que a conclusão deve ser inconclusiva.
- Registro de parecer, ressalvas e itens bloqueados.
- Sem aprovação, a regra não pode gerar afirmação jurídica categórica em produção.

### Portão C — decisão arquitetural
- Alternativas avaliadas e decisão documentada.
- Contratos e invariantes derivados dos requisitos aprovados.
- Plano de segurança, privacidade, testes e operação.
- Decisão explícita sobre o que descartar, substituir ou reutilizar.

### Portão D — validação técnica
- CI reproduzível, revisão de código e verificações automatizadas.
- Testes de fluxo completo e de falhas, incluindo autorização negativa e isolamento de dados.
- Casos de teste vinculados às regras jurídicas e à versão normativa.
- Avaliação humana de amostras de documentos, verificando factualidade, citações, coerência, individualização e ausência de fundamentos inventados.
- Falhas bloqueiam a ativação; não se substituem por checklists documentais ou declarações de conclusão.

### Portão E — liberação controlada
- Aprovação jurídica e técnica registradas separadamente.
- Monitoramento, suporte, retenção, resposta a incidentes e plano de reversão.
- Liberação gradual; não remover o legado antes de existir decisão operacional explícita e caminho de recuperação.

## Fontes oficiais e padrões de referência iniciais

Estas fontes são pontos de partida para a pesquisa, não uma lista completa nem uma declaração de que todos os dispositivos foram revisados em sua redação vigente.

### Direito de trânsito e processo administrativo

- CTB — Lei nº 9.503/1997, texto compilado no Planalto: https://planalto.gov.br/ccivil_03/leis/l9503compilado.htm
- Resolução CONTRAN nº 900/2022 — padronização de defesa prévia e recursos em 1ª e 2ª instâncias: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucao-contran-no-900-de-9-de-marco-de-2022
- Resolução CONTRAN nº 918/2022 — procedimentos relativos a multas e processo administrativo; conferir sempre a versão compilada e alterações: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes2/Resoluo918.compilada.pdf/view
- Índice oficial de resoluções CONTRAN e situação indicada pelo Ministério dos Transportes: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran
- LGPD — Lei nº 13.709/2018, texto compilado no Planalto: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm

### Engenharia e segurança

- OWASP Application Security Verification Standard (ASVS), versão estável indicada pelo projeto: https://owasp.org/www-project-application-security-verification-standard/
- NIST SP 800-218 — Secure Software Development Framework (SSDF): https://csrc.nist.gov/pubs/sp/800/218/final
- NIST SSDF — página de publicações, para acompanhar revisões e versões em rascunho: https://csrc.nist.gov/projects/ssdf/publications

## Dependência obrigatória: auditoria da Base de Conhecimento e RAG

Antes de aprovar requisitos e arquitetura, considerar a [auditoria da Base de Conhecimento, acervo jurídico e RAG](./AUDITORIA-BASE-CONHECIMENTO-RAG-ONBOARDING.md). A auditoria consultou o banco canônico em 2026-10-17 e encontrou 39 fontes, 66 documentos/versões, 58 chunks/embeddings, zero relações normativas e todos os 66 documentos com vigência e situação jurídica desconhecidas. O acervo físico ainda precisa ser comparado aos registros e o runtime RAG precisa ser avaliado ponta a ponta.

A base existente é um ativo a investigar, não um ativo validado. A experiência do onboarding deve ser desenhada em conjunto com a estratégia de curadoria jurídica e recuperação: coletar e confirmar fatos mínimos, fazer perguntas condicionais derivadas de requisitos jurídicos revisados, e só usar fontes elegíveis para fundamentar conclusões.

## Próxima execução

1. Levantar as jornadas reais e os tipos de processo que o produto pretende atender, sem importar as regras atuais como corretas.
2. Pesquisar as fontes oficiais e construir a matriz de regras com lacunas, conflitos, vigência e perguntas para revisão jurídica.
3. Mapear os riscos e requisitos técnicos e comparar arquiteturas alternativas.
4. Obter revisão jurídica e técnica independente antes de fechar contratos e começar a implementação.
5. Só então decidir se algum serviço existente merece reutilização; iniciar a nova implementação a partir dos requisitos aprovados, não da sequência de fases de uma branch existente.

Até a conclusão desses portões, o status correto é **requisitos em revisão independente; arquitetura e regras de negócio ainda não aprovadas**.
