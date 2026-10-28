# Correção 04 — início manual, retomada e reinício do onboarding

**Objetivo:** impedir que o usuário seja devolvido automaticamente a uma etapa antiga sem escolha e oferecer ações claras para começar, continuar ou reiniciar o rascunho.

**Base investigada:** `main` antes da correção, arquivo `src/components/onboarding/OnboardingWizard.tsx`.  
**Commits funcionais:**  
- [ee66b58c — tela de início](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/ee66b58cc8a1048eedf8e03abf546363b0e68563)
- [473d1576 — integração do início/retomada/reinício](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/473d1576e296691acf319b5cd7273087b1d5a740)
- [ef0f97ab — testes da tela de início](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/ef0f97abc94b5e6962e1e47c83d2850908a2005b)
- [b3555f7d — ajuste de asserção do botão](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/b3555f7decdc7722a2447948598ae8451e185ae9)
- [e4b59ed7 — atualização do teste de texto INMETRO](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/e4b59ed7ebb7c50e2317d4adacb57453c5ba67ad)

## 1. Diagnóstico confirmado por leitura do código

1. O estado inicial do wizard era `savedState?.step ?? 1`, então o componente restaurava automaticamente a última etapa salva.
2. A gravação do estado de navegação ocorria sempre que a etapa mudava; não havia uma tela inicial para perguntar se o usuário queria continuar ou recomeçar.
3. A função `clearWizardFormData()` limpava somente a chave de `sessionStorage`, embora o mesmo rascunho também fosse escrito em `localStorage`.
4. `loadWizardFormData()` lia apenas `sessionStorage`, apesar de existir cópia do formulário em `localStorage`.
5. Não havia teste específico da tela inicial/retomada do wizard no conjunto de testes de copy já incluído no Vitest.
6. O avanço e o retrocesso são controlados por handlers entre as etapas 1–10. O mapa desses handlers continua precisando de validação interativa/E2E; a existência dos handlers não prova que todos os caminhos estão corretos.

## 2. Implementação

- Novo componente `src/components/onboarding/OnboardingStartScreen.tsx`.
- Ao abrir o onboarding, a pessoa vê uma tela de início, sem ser enviada automaticamente para a etapa anterior.
- Sem progresso relevante, a ação disponível é **Começar**.
- Com rascunho detectado, a tela oferece **Continuar de onde parei** e **Começar do zero**.
- O wizard só grava a etapa e o formulário depois de a pessoa iniciar explicitamente.
- Há um botão **Recomeçar do zero** dentro do wizard a partir da etapa 2, com confirmação para evitar perda acidental do rascunho.
- Reiniciar limpa apenas as chaves locais do rascunho do onboarding e reinicializa o estado React do wizard; não apaga conta nem outros casos remotos.
- A leitura do formulário usa `sessionStorage` e, como fallback, a chave local já existente em `localStorage`.
- A limpeza remove o rascunho de ambos os armazenamentos.
- A etapa restaurada é validada como inteiro entre 1 e 10; um valor inválido é descartado.
- O autoavanço após autenticação só pode ocorrer depois de a pessoa optar por retomar o wizard, não enquanto está na tela inicial.

## 3. Testes adicionados/ajustados

No arquivo já incluído pelo gate do Vitest, `src/components/onboarding/steps/onboarding-copy-regression.test.tsx`:
- testa que a tela sem rascunho oferece **Começar**;
- testa que a tela com progresso oferece **Continuar de onde parei** e **Começar do zero**;
- verifica que a copy deixa claro que o reinício não apaga conta nem outros casos;
- atualiza a regressão de texto da etapa de radar para refletir a remoção da alegação categórica sobre aferição acima de 12 meses e os novos rótulos opcionais do INMETRO.

Esses testes usam renderização server-side para verificar o conteúdo renderizado. **Eles não substituem o teste real de clique, navegação, persistência ou retorno à etapa.**

## 4. Estado de validação

- [x] Causa de restauração automática identificada no código.
- [x] Tela explícita de início/retomada criada.
- [x] Ação de reinício local implementada.
- [x] Limpeza de rascunho cobre sessionStorage e localStorage.
- [x] Testes de renderização adicionados ao arquivo incluído no gate Vitest.
- [ ] CI do commit mais recente concluído com sucesso.
- [ ] Typecheck e build concluídos com sucesso.
- [ ] Teste manual/E2E de início, retomar, reiniciar, avançar, voltar e recarregar.
- [ ] Deploy de produção confirmado.

### Workflows relevantes

- [CI/CD Pipeline — run 40786481945, commit e4b59ed7](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786481945): estava na fila na última consulta.
- [Cloudflare Deploy — run 40786481969, commit e4b59ed7](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786481969): estava na fila na última consulta.
- Falha conhecida do deploy: [run 40786343401](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786343401) parou no passo `Discover canonical E2E matrix (read-only)`; o comando listou apenas 3 testes quando o workflow espera 70 cenários canônicos. Não desativar esse gate para forçar publicação.
- Falha conhecida do CI no commit anterior: [run 40786343544](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40786343544) tinha uma asserção antiga que ainda exigia o texto removido sobre aferição de radar. A asserção foi atualizada no commit e4b59ed7; aguardar o workflow desse commit para confirmar.

## 5. Próximas ações

1. Consultar os workflows do commit e4b59ed7 e ler os logs se falharem.
2. Corrigir qualquer falha real de Vitest/typecheck/build antes de tentar publicar.
3. Resolver a descoberta da matriz E2E conforme o contrato verdadeiro dos testes; não inventar cenários nem enfraquecer a verificação.
4. Com CI aprovado, executar/acompanhar teste de navegador para:
   - primeira entrada → tela inicial → Começar → etapa 1;
   - progresso na etapa 5 → sair/recarregar → tela inicial;
   - Continuar → retorna à etapa salva;
   - Começar do zero → etapa 1 com campos de rascunho limpos;
   - botão de reinício dentro do wizard → confirmação → reinício;
   - avanço e retrocesso entre as etapas e serviços que pulam fases;
   - formulário salvo em sessionStorage e fallback localStorage;
   - perfil do usuário preservado e outros casos remotos não excluídos.
5. Só depois de CI aprovado e gate E2E resolvido, confirmar autorização/condições de deploy e verificar o resultado real de produção.

**Status:** alteração implementada na `main`; validação automatizada e deploy ainda não aprovados.
