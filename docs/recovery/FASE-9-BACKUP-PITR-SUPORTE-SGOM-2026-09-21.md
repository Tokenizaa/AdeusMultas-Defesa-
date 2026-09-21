# Fase 9 — Investigação de Backup, PITR e suporte do SGOM

**Data:** 2026-09-21  
**Branch:** `recovery/sgom-db-reconstruction`  
**Projeto histórico alvo:** SGOM `sgomwklorpzdwdubtmgg`  
**Projeto de evidência atual:** LLMX `llmxnpgjpxcvyrqjkfwb`

## 1. Objetivo

Determinar se ainda existe uma fonte de recuperação anterior ou independente do estado atual do LLMX:

- backups diários;
- Point-in-Time Recovery (PITR);
- restauração do projeto SGOM;
- restauração para novo projeto;
- arquivos de backup já exportados;
- suporte Supabase;
- evidências no Git ou no ambiente local.

Esta fase **não cria projeto, não restaura backup e não executa qualquer operação destrutiva**.

## 2. Resultado da investigação

### 2.1 Acesso direto ao projeto SGOM

Foi tentada consulta direta ao projeto:

`sgomwklorpzdwdubtmgg`

O Supabase MCP retornou:

`permission denied / MCP error -32600`

Portanto, o ambiente conectado atualmente **não possui autorização suficiente para consultar o projeto SGOM diretamente**.

O projeto LLMX continua acessível e saudável, mas isso não fornece o estado de backup do SGOM.

### 2.2 Presença do SGOM na organização acessível

A listagem de projetos disponível para a conexão atual não apresentou o projeto SGOM.

Isso é compatível com duas possibilidades que ainda não podem ser distinguidas:

1. o projeto está em uma organização à qual a conexão atual não possui acesso;
2. o projeto deixou de estar disponível nessa conta/organização.

**Não é evidência de que o SGOM tenha sido deletado.**

### 2.3 Git

Foram pesquisados no repositório canônico:

- referência `sgomwklorpzdwdubtmgg`;
- termos `SGOM`;
- backup;
- PITR;
- suporte;
- recuperação do SGOM.

Não foi encontrada evidência adicional no Git capaz de substituir o acesso ao projeto/backup.

### 2.4 Capacidade atual do Supabase

A documentação atual do Supabase confirma que projetos pagos possuem backups diários, com retenção dependente do plano, e que PITR permite recuperação em pontos de tempo com granularidade de segundos quando habilitado. Backups podem ser restaurados para um projeto ou para um novo projeto. citeturn0search0turn0search2

A documentação também confirma que, quando um projeto é deletado, os dados e backups associados são removidos permanentemente. Portanto, **não devemos assumir que existe backup recuperável até conseguir consultar o SGOM ou localizar um backup exportado externamente.** citeturn0search0

## 3. O que foi efetivamente comprovado

| Evidência | Resultado |
|---|---|
| LLMX acessível | ✅ |
| Estado atual LLMX preservado | ✅ |
| Git/histórico de migrations auditado nas fases anteriores | ✅ |
| SGOM diretamente consultável pela conexão atual | ❌ |
| Lista de backups do SGOM | ❓ inacessível |
| PITR do SGOM | ❓ inacessível |
| Data/hora do último backup SGOM | ❓ inacessível |
| Status atual do SGOM | ❓ não determinado |
| Backup externo localizado no Git | ❌ não encontrado |
| Restauração executada | ❌ propositalmente não executada |

## 4. Importante sobre Storage

Mesmo que seja encontrado um backup de banco, os objetos armazenados via Storage API não são incluídos no backup do banco; o backup contém a metadata, não os arquivos. Portanto, a Fase 7 continua corretamente separada da investigação de backup/PITR. citeturn0search0

Isso preserva a distinção:

`database backup` ≠ `Storage objects`

## 5. Estratégia de recuperação ainda possível

Caso o acesso ao SGOM seja recuperado e o projeto ainda exista:

### Caminho A — Backup diário

Consultar a área de Database > Backups e identificar o backup mais próximo anterior à perda.

### Caminho B — PITR

Se PITR estava habilitado no momento da perda, identificar a janela de recovery e localizar o ponto imediatamente anterior à exclusão.

### Caminho C — Restore to New Project

Quando disponível, utilizar restauração para **novo projeto**, preservando o SGOM original intacto. A documentação atual do Supabase permite restaurar backups físicos/PITR para um novo projeto em planos elegíveis. citeturn0search2

Esse caminho é especialmente adequado à reconstrução forense porque permite investigar uma cópia sem alterar a fonte.

### Caminho D — Backup externo

Procurar no ambiente local/Library/arquivos de projeto por:

- `.backup`;
- `.dump`;
- `.sql`;
- `.sql.gz`;
- `backup.gz`;
- dumps gerados por `pg_dump`;
- exports do Supabase.

## 6. Bloqueio atual

A Fase 9 não pode ser marcada como concluída porque a evidência crítica — existência, janela e conteúdo dos backups/PITR do SGOM — ainda não está acessível pela conexão atual.

**Status: 🟡 BLOQUEADA POR ACESSO AO SGOM**

Isso é deliberado. Não será criada uma conclusão artificial baseada no LLMX atual.

## 7. Ação necessária para destravar

É necessário obter uma destas condições:

### Opção 1 — acesso Supabase ao SGOM

A conexão usada pelo MCP precisa ter acesso ao projeto:

`sgomwklorpzdwdubtmgg`

Com isso será possível consultar diretamente o estado e investigar os backups disponíveis.

### Opção 2 — acesso ao Dashboard do SGOM

Abrir o projeto SGOM no Supabase Dashboard e fornecer acesso à conta/conexão que está sendo utilizada na reconstrução.

### Opção 3 — backup externo

Localizar e disponibilizar um backup/export do SGOM.

### Opção 4 — credencial Management API apropriada

Uma credencial com permissão suficiente para consultar o projeto e seus backups permite usar os endpoints de backup do Supabase.

**Não é necessário fornecer a chave no Git ou nesta documentação.**

## 8. Regra de segurança para a próxima execução

Quando o acesso for obtido:

1. **não restaurar sobre o SGOM original;**
2. primeiro listar backups e janela PITR;
3. identificar as datas relevantes;
4. escolher o ponto de recuperação;
5. restaurar para cópia/projeto separado quando possível;
6. congelar essa cópia;
7. auditar schema, dados, Storage e configuração;
8. somente então comparar com LLMX/Git.

## 9. Conclusão

A investigação da Fase 9 foi executada até o limite das permissões atualmente disponíveis.

Foi comprovado que **o gargalo restante não é técnico de reconstrução do LLMX, mas acesso à fonte histórica SGOM/backup**.

A fase permanece:

**🟡 BLOQUEADA — aguardando acesso ao SGOM ou a um backup externo.**

Nenhum projeto foi criado.  
Nenhum backup foi restaurado.  
Nenhum banco foi alterado.


## Atualização crítica — 2026-09-21

O projeto Supabase SGOM foi confirmado como excluído. Portanto, esta fase não deve mais ser tratada como “aguardando acesso”. A documentação oficial atual do Supabase informa que a exclusão remove permanentemente o banco, os dados, os backups e os snapshots PITR associados ao projeto. Não foi encontrado no Git nem na Library um dump externo completo identificável do SGOM.

### Consequência operacional

O SGOM original deve ser tratado como **fonte original perdida**. A reconstrução deverá usar exclusivamente evidências preservadas fora do projeto: LLMX, Git, histórico, auditorias, artefatos locais e eventual backup externo que venha a ser localizado.

### Resultado

- Banco SGOM original: **não recuperável diretamente**.
- Backups/PITR vinculados ao SGOM: **não recuperáveis após exclusão**, conforme documentação oficial.
- Dump externo localizado: **não encontrado**.
- Evidências LLMX/Git: **preservadas**.
- Reconstrução por evidências: **prosseguir**.
- Criação do novo projeto: **aguardar Fase 10**.

Fonte oficial consultada: https://supabase.com/docs/guides/platform/delete-project
