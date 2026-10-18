# Status e evidências — reconstrução do onboarding

**Data da atualização:** 2026-10-17  
**Branch documental:** `docs/onboarding-rebuild-plan`  
**Base:** `main` no momento da criação da branch  
**Status:** documentação inicial criada; Fase 1 ainda não executada

## Estado atual

| Item | Estado | Evidência / observação |
|---|---|---|
| Decisão de reconstruir a experiência | Registrada | `DECISAO-RECONSTRUCAO.md` |
| Plano por fases e critérios de saída | Registrado | `PLANO-DE-EXECUCAO.md` |
| Baseline técnico completo | Pendente | Ainda não executado nesta branch documental |
| Inventário do onboarding atualmente no repositório | Pendente | Requer inspeção de código e referências de linha |
| Identificação do código efetivamente publicado | Pendente | Não presumir que o commit do repositório corresponde à produção |
| Matriz de preservação/reconstrução | Pendente | Depende do inventário |
| Especificação de fluxo e contratos | Pendente | Depende do inventário e diagnóstico |
| Implementação nova | Não iniciada | Fora do escopo desta entrega |
| Alteração de produção, migração ou deploy | Não executada | Não autorizada por este plano |
| Testes com escrita em produção | Bloqueados | Smoke anterior não foi conclusivo; primeiro corrigir e provar reconciliação/isolation |
| Cobranças reais | Não executadas | Permanecem proibidas durante a validação |

## Achados prévios que precisam ser revalidados na Fase 1

Os itens abaixo vieram de uma auditoria anterior de um snapshot do repositório identificado como `0c9e30111e183ac869af90286dda9603992701ab`. Não presumir que esse snapshot seja igual ao código atual de `main` ou ao código publicado em produção. Confirmar cada item no baseline atual antes de alterar qualquer coisa.

1. A pontuação de êxito parecia ser calculada por regras fixas, sem evidência de calibração estatística; verificar cálculo, nomenclatura e apresentação na interface.
2. A interface parecia executar uma análise local antes de receber confirmação da criação remota do caso; verificar os estados de falha e o que é mostrado ao usuário.
3. A integração de OCR aparentava divergência entre formato enviado e formato esperado, além de diferenças no contrato de resposta; reproduzir em ambiente seguro.
4. Havia risco de campos visíveis com valores iniciais divergirem do payload enviado; comparar estado, payload e dados persistidos.
5. Alguns fundamentos pareciam depender de dados ausentes ou de semântica ambígua; confirmar se informação desconhecida é diferenciada de fato negativo.
6. A recuperação de sessão parecia guardar identificadores sem reidratar o caso completo; verificar fluxo real de retomada.
7. A pesquisa de fontes e a geração documental precisavam de evidências de completude, proveniência e bloqueio quando faltam dados ou fundamentos.
8. O fluxo de testes de onboarding anônimo na URL real de produção terminou inconclusivo em reconciliação de dados em tentativas anteriores. Os registros sintéticos daquela execução foram individualmente verificados e removidos segundo os relatórios prévios; o teste não foi aprovado e não houve pagamento real. Reconfirmar o estado antes de novas tentativas de escrita.

## Condições para iniciar implementação

- [ ] Fase 1 concluída com baseline e working tree protegidos.
- [ ] Commit publicado em produção identificado ou diferença registrada como bloqueio.
- [ ] Inventário técnico com caminhos e referências de linha.
- [ ] Matriz de preservação e reconstrução aprovada.
- [ ] Fluxo e contratos especificados.
- [ ] Plano de teste seguro definido, incluindo reconciliação de dados sintéticos.
- [ ] Nenhum teste de escrita em produção até demonstrar isolamento e limpeza por identificador exato.

## Próxima ação

Executar a **Fase 1 — Baseline e proteção do legado** conforme `PLANO-DE-EXECUCAO.md`. Não iniciar a reconstrução da interface até que o inventário mostre o que deve ser preservado e o que realmente precisa ser corrigido.

## Histórico desta documentação

- 2026-10-17: criada a decisão formal, o plano por fases e este registro de status em branch documental separada. Nenhum código de produto, dado de produção, migração ou deploy foi alterado nesta entrega.
