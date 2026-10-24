# Pós-abordagem: demonstração personalizada e caminhos de contratação

- **Status:** decisão de produto documentada; ainda não implementada.
- **Escopo:** experiência após o potencial cliente abrir o link recebido na abordagem, até sua decisão de contratar e a definição do caminho de entrega.
- **Ordem de implementação:** primeiro consolidar e validar a demonstração e o fluxo comercial; depois estruturar as opções A e C; implementar a opção B por último, após validação técnica e comercial da integração de hospedagem.
- **Fora do escopo desta etapa:** implementar integração Hostinger, checkout, registro de domínio, publicação em produção ou mudanças de infraestrutura.

## 1. Objetivo

Converter a abordagem comercial em uma experiência individualizada: o potencial cliente abre um link, reconhece seu negócio na demonstração, compara estilos de site e entende como poderá contratar. A experiência deve ser simples, confiável e sem prometer serviços ainda indisponíveis.

A demonstração não equivale à contratação nem à publicação de um site. Ela é uma proposta comercial interativa, vinculada ao lead e à versão apresentada.

## 2. Jornada proposta

1. A pessoa recebe uma mensagem de abordagem com link personalizado.
2. O link abre uma página de demonstração identificada para o negócio abordado.
3. A página apresenta, de forma transparente, a proposta de presença digital e os elementos do negócio que foram verificados.
4. A pessoa pode alternar entre até três estilos visuais na mesma experiência, sem precisar receber ou abrir três links diferentes.
5. O conteúdo e os serviços apresentados são personalizados apenas com informações confirmadas. Informações desconhecidas devem ser omitidas ou claramente sinalizadas; nunca inventadas.
6. A pessoa escolhe o estilo preferido e pode indicar interesse em contratar.
7. O interesse e a versão selecionada são associados ao lead, preservando o contexto para o próximo passo comercial.
8. Só depois dessa decisão é que o fluxo de contratação deve conduzir à opção de entrega/publicação adequada.

### Requisitos da demonstração

- Link individualizado e associado ao lead correto.
- Experiência responsiva, especialmente em dispositivos móveis, considerando que o acesso pode vir do WhatsApp.
- Carregamento rápido e chamada para ação clara.
- Alternância de estilos na própria página; a escolha não deve apagar a personalização do conteúdo.
- Indicação visível de que se trata de uma demonstração/proposta, não de um site já publicado.
- Registro da versão visual selecionada e do estado comercial, respeitando consentimento, privacidade e políticas de contato.
- Evitar solicitar dados desnecessários antes de permitir que a pessoa examine a proposta.
- Não afirmar que a análise do site atual é completa se ela tiver sido parcial ou se o negócio não possuir site.

## 3. Opções de continuidade

As opções abaixo representam caminhos de entrega/publicação, não três versões da demonstração. Os nomes A, B e C devem permanecer estáveis na documentação para facilitar decisões futuras.

### Opção A — Entrega do código-fonte ao cliente

**Para quem:** cliente que já dispõe de desenvolvedor, equipe técnica ou prefere administrar a hospedagem por conta própria.

**Proposta:** após a contratação, entregar os arquivos do site gerado e instruções suficientes para que um profissional consiga revisar, executar e publicar o projeto.

**A entrega deve definir:**
- arquivos e código incluídos;
- dependências, ferramentas e requisitos de execução;
- configuração necessária, deixando segredos fora do código;
- instruções de build e publicação;
- recursos externos utilizados e eventuais custos de terceiros;
- limites de garantia, correções incluídas e suporte posterior.

**Limite importante:** entregar o código não significa migrar o site, configurar o servidor, comprar domínio, publicar ou prestar suporte ilimitado. Esses serviços precisam ser explicitados e, quando aplicável, contratados separadamente.

**Critério de prontidão:** conseguir gerar um pacote portátil e reproduzível, com documentação de execução/publicação e sem credenciais ou segredos embutidos.

### Opção B — Domínio próprio e hospedagem com jornada integrada

**Para quem:** cliente que não possui domínio/hospedagem e quer publicar em um domínio próprio, mas prefere uma experiência guiada.

**Proposta futura:** permitir pesquisar opções de domínio, consultar planos de hospedagem e reduzir a quantidade de etapas externas. A Hostinger é uma candidata a parceira, mas a integração não está aprovada nem implementada por este documento.

**Jornada desejada, sujeita à validação técnica:**
1. O cliente informa ou pesquisa o domínio desejado dentro da plataforma.
2. A experiência consulta disponibilidade e apresenta alternativas, quando aplicável.
3. O cliente compara e escolhe um plano compatível com o site.
4. A plataforma apresenta claramente fornecedor, preço, prazo, renovação, condições e quem será o titular do domínio/serviço.
5. A etapa de pagamento segue o fluxo oficialmente permitido pelo fornecedor.
6. Após confirmação, a plataforma orienta ou automatiza a configuração e publicação, de acordo com o que as APIs e permissões realmente suportarem.

**Por que será a última opção a implementar:** depende de validar contratos de API, permissões de compra, fluxo de checkout, registro e titularidade do domínio, atribuição de afiliado/parceiro, tratamento de pagamentos assíncronos, suporte, falhas e responsabilidades comerciais. A existência de endpoints de API não prova, por si só, que toda a jornada de compra desejada é permitida ou viável.

**Regras obrigatórias antes de implementar:**
- O domínio deve ficar preferencialmente registrado em nome/conta controlada pelo cliente, com titularidade e acesso claramente documentados.
- Não armazenar token de API no navegador nem expô-lo ao cliente.
- Não prometer comissão ou atribuição de afiliado até que os termos e a atribuição via API sejam confirmados.
- Não simular compra nem registrar domínio real durante testes sem autorização explícita.
- Confirmar preços, renovação e condições diretamente com o fornecedor; não fixar valores desatualizados na interface.
- Definir como tratar indisponibilidade de domínio, falha de pagamento, pedido pendente, cancelamento e reembolso.
- Manter uma alternativa operacional documentada caso a integração não permita concluir o fluxo dentro da plataforma.

**Critério de prontidão:** prova de conceito validada com documentação oficial e permissões reais de teste, sem compra ou registro inadvertido, incluindo checkout, atribuição comercial, estado final do pedido e responsabilidades de suporte.

### Opção C — Publicação hospedada pela nossa plataforma

**Para quem:** cliente que prioriza simplicidade e quer que a plataforma cuide da publicação.

**Proposta:** hospedar o site em infraestrutura administrada pela plataforma e oferecer inicialmente um endereço sob domínio da própria plataforma. Domínio personalizado poderá ser considerado quando houver infraestrutura, processo e modelo comercial definidos.

**Pontos a definir antes de vender:**
- preço de criação versus eventual mensalidade de hospedagem/manutenção;
- limites de uso, armazenamento, tráfego e recursos;
- atualizações, backups, disponibilidade e suporte;
- propriedade do conteúdo e dos dados;
- procedimento de exportação, encerramento e migração;
- possibilidade e condições de conectar domínio próprio no futuro.

**Limite importante:** não anunciar hospedagem, SLA, backups, domínio personalizado ou migração como disponíveis antes de existirem e terem sido validados operacionalmente.

**Critério de prontidão:** processo reproduzível de publicação, domínio/URL estável, controles de acesso, monitoramento mínimo, procedimento de atualização e plano de saída/exportação.

## 4. Comparação resumida

| Critério | A — Código-fonte | B — Domínio + hospedagem integrada | C — Hospedagem da plataforma |
|---|---|---|---|
| Principal benefício | Autonomia técnica do cliente | Domínio próprio com jornada guiada | Menor esforço para o cliente |
| Quem administra a hospedagem | Cliente ou seu profissional | Cliente/fornecedor, conforme modelo validado | Nossa plataforma |
| Complexidade de implementação | Baixa a média, se o código for portátil | Alta | Média a alta |
| Dependência de fornecedor externo | Depende da escolha do cliente | Alta | Depende da infraestrutura escolhida |
| Recorrência potencial | Não necessariamente | Serviço do fornecedor e eventual suporte separado | Possível mensalidade de hospedagem/manutenção |
| Prioridade | Definir escopo e pacote de entrega | **Última opção a implementar** | Avaliar após definir a base de publicação |

## 5. Separação comercial e técnica

Manter separados os seguintes conceitos:

- **Demonstração:** proposta personalizada que o lead consegue visualizar e comparar.
- **Criação do site:** serviço contratado para transformar a proposta aprovada em um produto final.
- **Entrega de código (A):** entrega de artefatos e instruções; não implica publicação.
- **Publicação hospedada pela plataforma (C):** operação e hospedagem administradas por nós.
- **Domínio e hospedagem integrados (B):** jornada de aquisição/gestão com fornecedor externo, sujeita a validação.
- **Migração/publicação assistida:** serviço distinto, cujo escopo e preço dependem de avaliação técnica.

Não usar uma mesma promessa comercial para todos esses serviços. Preços só devem ser publicados depois de definidos escopo, custos, suporte e condições.

## 6. Ordem de trabalho

1. **Documentar e revisar o fluxo pós-abordagem** — escopo deste documento.
2. **Validar a experiência da demonstração** — conteúdo verificado, estilos alternáveis, responsividade, CTA e vínculo com o lead.
3. **Definir o contrato comercial da criação** — o que está incluído, revisões, prazo, pagamento, cancelamento e limites.
4. **Detalhar a opção A** — pacote exportável, instruções e limites de suporte.
5. **Definir a opção C** — infraestrutura, publicação, custo recorrente, operação e saída.
6. **Investigar e implementar a opção B por último** — somente após validar APIs, permissões, checkout, atribuição e titularidade.
7. **Testar a jornada completa** com cenários positivos e de falha antes de disponibilizar comercialmente.

A ordem de implementação entre A e C poderá ser confirmada após revisão técnica do que já existe. A opção B permanece explicitamente por último.

## 7. Questões que continuam em aberto

- Quais elementos da demonstração serão gerados automaticamente e quais exigirão revisão?
- Como o cliente poderá pedir correções antes de contratar e quantas estarão incluídas?
- Qual é o escopo exato da criação do site e quais formatos/tecnologias serão suportados?
- Como será registrada a versão aprovada e como ela será preservada durante a produção?
- Qual infraestrutura sustentará a opção C e qual será seu custo operacional?
- Como será oferecida migração ou publicação assistida sem confundir esse serviço com A, B ou C?
- Na opção B, quais ações a API do fornecedor realmente permite e como se comprovará a atribuição de afiliado/parceiro?

Essas questões não impedem a documentação do conceito, mas devem ser resolvidas antes de prometer funcionalidades ou iniciar implementações que dependam delas.

## 8. Fora do escopo e proteção contra avanço prematuro

Este documento **não autoriza**:
- implementar a integração Hostinger;
- efetuar compras ou registrar domínios;
- mudar banco de dados ou infraestrutura;
- publicar sites de clientes;
- definir preços finais sem validação;
- considerar a jornada pronta para produção apenas porque a documentação foi criada.

A próxima etapa deve revisar a demonstração e o momento em que o lead clica no link. A integração de hospedagem fica para uma fase posterior, sendo a opção B a última a ser executada.

## 9. Histórico da decisão

Esta documentação consolida a discussão de 23 de outubro de 2026 sobre a experiência após o primeiro contato comercial. Ela registra uma direção de produto para consulta futura; não declara funcionalidades implementadas ou certificadas.
