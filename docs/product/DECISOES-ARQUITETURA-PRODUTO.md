# Decisões de produto e governança de repositório

Atualizado em: 2026-10-17

## 1. Onboarding do AdeusMultas — OCR eliminado

**Decisão:** reconstruir o onboarding do zero sem OCR e sem extração automática de dados de notificações.

### Motivo
O produto atende notificações de diversos DETRANs e órgãos autuadores, com layouts, campos, qualidade de imagem e condições físicas imprevisíveis. Não existe um conjunto controlado de documentos padronizados por cliente que torne a extração suficientemente previsível. O OCR adicionaria custo, caminhos de falha e risco de dados plausíveis porém incorretos, que poderiam contaminar a análise jurídica e a minuta.

### Diretrizes obrigatórias
- O fluxo principal começa com preenchimento guiado pelo usuário; upload/OCR não é etapa do onboarding.
- Cada campo deve explicar o que significa, onde localizar a informação e como responder quando ela não estiver disponível.
- Perguntas adicionais devem ser progressivas e derivadas de requisitos de análise juridicamente validados.
- Dados ausentes, contraditórios ou incertos não podem ser inventados nem tratados como confirmados.
- Validar formato e consistência; pedir esclarecimento quando necessário.
- A análise e a minuta só podem usar dados confirmados e fundamentos jurídicos com fontes verificáveis.
- Não portar dependências de OCR, processamento de imagens ou metadados OCR para a nova implementação.
- Código legado de OCR pode permanecer apenas no legado até a sua revisão/arquivamento; não deve ser reintroduzido no novo fluxo.
- Esta decisão não proíbe, por si só, anexos documentais em outras partes do produto quando houver necessidade jurídica/operacional específica. Não implementar esse caso sem requisito validado.

## 2. Reconstrução independente

- A reconstrução parte de requisitos e evidências, não de branches existentes.
- Nenhuma arquitetura, regra de negócio, serviço, contrato, schema ou implementação antiga é considerada correta apenas por existir.
- Reutilização só ocorre após verificação explícita do requisito, contrato, segurança e testes.
- Revisão jurídica e revisão técnica são gates distintos para as regras e a geração de documentos.

## 3. Governança de branches e pull requests

**Diretriz operacional:** trabalhar diretamente na `main` para este esforço, sem abrir novas branches, PRs ou worktrees, preservando backups, stashes e alterações locais.

Antes de continuar a reconstrução:
1. Inventariar PRs abertos e branches remotas do repositório.
2. Classificar cada PR como necessária e atual, substituída/obsoleta, duplicada, já integrada ou bloqueada.
3. Verificar commits exclusivos em relação à `main`, relação com PRs, referências de deploy, migrações, alterações de dados e trabalho que precise ser preservado.
4. Fechar PRs obsoletas/substituídas após registrar a decisão e garantir que informações úteis estejam preservadas em documentação canônica na `main`.
5. Excluir branches remotas somente quando for confirmado que não contêm trabalho exclusivo necessário, não são usadas por deploy/automação e não estão protegidas por uma regra de preservação.
6. Não apagar branches locais, worktrees, backups ou stashes por inferência. Preservar alterações locais existentes e evitar comandos Git destrutivos.
7. Não considerar branch ou PR aberta como fonte de verdade, plano ativo ou requisito vigente sem confirmação explícita.
8. Manter um único registro canônico na `main` com decisões, estado e evidências, para evitar auditorias repetidas e comparações de branches antigas.

A limpeza do repositório não autoriza descartar trabalho exclusivo sem inspeção. A prioridade é reduzir ambiguidade sem perder dados ou alterações recuperáveis.
