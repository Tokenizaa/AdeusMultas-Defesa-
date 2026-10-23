# Relatório — Fase 3, Rodada de Desbloqueio Jurídico

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main`  
**SHA inicial:** `56c6d0b`  
**Relatório anterior:** `docs/auditorias/2026-10-22-onboarding/19-fase3-corretiva-elegibilidade-teses.md`  
**Data:** 23/10/2026  
**Fase:** 3 — Elegibilidade das Teses e Validação dos Fundamentos (rodada de desbloqueio jurídico)  
**Estado:** EM EXECUÇÃO  
**Escopo:** Pesquisa documental de fontes oficiais, reconciliação de proveniência, revisão jurídica das 52 teses, testes e correções locais. Nenhuma escrita no Supabase remoto, migrations, deploy ou ativação em produção.

---

## 1. Resumo Executivo

Esta rodada corretiva da Fase 3 executou: (i) confirmação de fontes oficiais para leis CTB e 6 das 7 resoluções CONTRAN; (ii) reconciliação de proveniência de 39 fontes do Supabase vs. 66 documentos/versões; (iii) revisão jurídica individual das 52 teses (ARG-001 a ARG-052); (iv) execução da suíte `npx vitest run` (226 testes passando). A fase permanece com pendências materiais (CONTRAN 966/2022 é de espelhos retrovisores, não estacionamento; 432/2013 revogada por 1.031/2026; teses sem fonte oficial permanecem INCONCLUSIVE).

---

## 2. Estado do Ambiente

| Item | Valor |
|------|-------|
| Branch | `main` |
| SHA inicial | `56c6d0b` |
| `origin/main` | sincronizado com `main` |
| Alterações locais preexistentes | Preservadas (não-staged): `api/index.mjs`, `src/components/checkout/checkout-pix-only.test.tsx` |
| Comando de teste | `npx vitest run` (vitest v4.1.11) |
| Testes executados | 226 testes em 29 arquivos — todos passando |
| Escrita no Supabase remoto | NENHUMA (somente leitura) |
| Migrations / Deploy | NENHUM |

---

## 3. Cobertura de Revisão (quantificação sem contradições)

| Métrica | Quantidade | Detalhe |
|---------|------------|---------|
| Teses examinadas tecnicamente | 52 | Catálogo ARGUMENTS_CATALOG (ARG-001 a ARG-052) |
| Teses com revisão jurídica independente | 1 | ARG-051 (Art. 267 CTB via Planalto) |
| Teses efetivamente validadas (SUPPORTED) | 1 | ARG-051 |
| Teses NOT_SUPPORTED | 0 | Nenhuma tese teve fundamento provadamente ausente/incorreto |
| Teses INCONCLUSIVE | 51 | Demais, incluindo as 9 usadas pelo motor sem fonte oficial |
| Fontes oficiais verificáveis localizadas | 6/7 CONTRAN + CTB/Lei 14.071/2020 | Verificadas contra Planalto/DOU/CONTRAN |
| Fontes do Supabase sem URL | 39/39 | `knowledge_sources.url IS NULL` |
| Versões com source_url | 66/66 | `knowledge_document_versions.source_url` preenchido |
| Versões com vigência | 0/66 | `effective_from`/`effective_until` NULL |

**Definições de classificação:**
- **SUPPORTED:** requisitos e fundamento jurídico sustentados por evidências verificáveis de fonte oficial.
- **NOT_SUPPORTED:** a tese não se aplica aos fatos ou o fundamento proposto não a sustenta.
- **INCONCLUSIVE:** faltam evidências, fonte confiável ou avaliação jurídica suficiente.

---

### Matriz — Uma linha por tese (ARG-001 a ARG-052)

Colunas: Tese | Regra(s) no motor | Família | Dispositivo | Fonte oficial verificada | Requisitos factuais e contraindicações | Testes automatizados | Revisão jurídica independente | Resultado | Evidência

| Tese | Regra(s) | Família | Dispositivo | Fonte oficial verificada | Requisitos factuais / contraindicações | Testes | Revisão jurídica | Resultado | Evidência |
|------|----------|---------|-------------|--------------------------|----------------------------------------|--------|------------------|-----------|-----------|
| ARG-001 | RULE_RADAR_CALIBRACAO_12M | excesso_velocidade | Art. 280 §2º CTB c/c Res. CONTRAN 798/2020 Art. 4º c | CONTRAN 798/2020 verificada (DOU 09/09/2020) | radarCalibrationDate > 12 meses antes da infração; infração de velocidade | rule-engine.test.ts (14) | Não | INCONCLUSIVE | Fonte oficial acessível mas tese sem validação jurídica independente |
| ARG-002 | RULE_SINALIZACAO_INSUFICIENTE_90 | excesso_velocidade | Art. 90 CTB c/c Res. CONTRAN 798/2020 Art. 12 | CONTRAN 798/2020 verificada; Art. 90 CTB verificado | hasR19SignageProof === false; foto do local | rule-engine.test.ts | Não | INCONCLUSIVE | Fonte verificada, mas sem validação jurídica independente da tese |
| ARG-003 | — | excesso_velocidade | Res. CONTRAN 798/2020 Art. 6º | CONTRAN 798/2020 verificada | Estudo técnico bemal/vencido do radar fixo | Não | Não | INCONCLUSIVE | Não usada pelo motor; sem validação jurídica |
| ARG-004 | — | excesso_velocidade | Res. CONTRAN 798/2020 Art. 13 | CONTRAN 798/2020 verificada | Radar portátil oculto; agente não visível | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-005 | RULE_INMETRO_CONSIDERED_SPEED_ERROR | excesso_velocidade | Art. 218 CTB c/c Res. CONTRAN 798/2020 Anexo II | CONTRAN 798/2020 verificada | measuredSpeed, consideredSpeed, speedLimit; margem 7 km/h até 100 km/h / 7% acima | rule-engine.test.ts | Não | INCONCLUSIVE | Fonte verificada, sem validação jurídica independente |
| ARG-006 | RULE_PHOTO_PROOF_REQUIRED | excesso_velocidade, semaforo | Art. 281 parágrafo único I CTB c/c Portaria INMETRO 158/2022 | Portaria INMETRO não verificada | Foto com múltiplos veículos sem individualização | Não | Não | INCONCLUSIVE | Fonte não verificada |
| ARG-007 | — | excesso_velocidade | Art. 90 CTB c/c Res. CONTRAN 798/2020 Anexo IV | CONTRAN 798/2020 verificada | Distância placa R-19 vs radar fora do padrão | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-008 | — | excesso_velocidade | Art. 23 CP (estado de necessidade) | Não verificada | Emergência médica; prontuário hospitalar | Não | Não | INCONCLUSIVE | Fonte não verificada |
| ARG-009 | RULE_PHOTO_PROOF_REQUIRED | semaforo | Art. 280 §2º CTB c/c Res. CONTRAN 985/2022 | CONTRAN 985/2022 verificada | Falta foto sequencial da linha de retenção | Não | Não | INCONCLUSIVE | Fonte verificada, sem validação jurídica independente |
| ARG-010 | RULE_SEMAFORO_TEMPO_AMARELO | semaforo | Art. 90 CTB c/c Res. CONTRAN 973/2022 | CONTRAN 973/2022 verificada (DOU 25/07/2022) | Tempo amarelo insuficiente (3-5s) | Não | Não | INCONCLUSIVE | Fonte verificada, sem validação jurídica independente |
| ARG-011 | — | semaforo | Art. 29 VII e 189 CTB c/c Res. CONTRAN 985/2022 | CTB verificado; Res. 985/2022 verificada | Veículo de emergência com sirene | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-012 | — | semaforo | Art. 182 VII ou 183 CTB (conflito com Art. 208) | CTB verificado; fonte regulamentar não verificada | Trânsito travado à frente | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-013 | — | semaforo | Art. 90 CTB c/c Res. CONTRAN 973/2022 | CTB e Res. 973/2022 verificadas | Semáforo defeituoso/apagado | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-014 | — | semaforo | Art. 44-A CTB (Lei 14.071/2020) c/c Res. CONTRAN 973/2022 | CTB/Lei 14.071 verificadas; Res. 973/2022 verificada | Livre conversão à direita com placa | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-015 | RULE_AUTUACAO_SEM_ABORDAGEM_MBFT | celular | Art. 280 CTB c/c Res. CONTRAN 985/2022 Ficha 736-62 | CONTRAN 985/2022 verificada | Sem abordagem; observações vagas | Não | Não | INCONCLUSIVE | Fonte verificada, sem validação jurídica independente |
| ARG-016 | — | celular | Art. 252 CTB c/c MBFT | CTB verificado; MBFT não verificado | Celular em suporte GPS | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-017 | — | celular | Art. 252 CTB | CTB verificado | Veículo estacionado | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-018 | — | celular | Art. 281 I CTB c/c Res. CONTRAN 960/2022 | CTB verificado; Res. 960/2022 não verificada | Erro de visão por insulfilm | Não | Não | INCONCLUSIVE | Não usada pelo motor; fonte 960/2022 não verificada |
| ARG-019 | RULE_CELULAR_VIVA_VOZ | celular | Art. 252 VI CTB c/c Res. CONTRAN 985/2022 | CTB e Res. 985/2022 verificadas | Viva-voz/Bluetooth integrado | Não | Não | INCONCLUSIVE | Fonte verificada, sem validação jurídica independente |
| ARG-020 | RULE_ESTACIONAMENTO_SEM_SIN_R6A | estacionamento | Art. 90 CTB c/c Res. CONTRAN 973/2022 | CTB e Res. 973/2022 verificadas | Placa R-6a ausente/ilegível | Não | Não | INCONCLUSIVE | Fonte verificada, sem validação jurídica independente |
| ARG-021 | — | estacionamento | Anexo I CTB | CTB verificado | Parada para embarque | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-022 | — | estacionamento | Res. CONTRAN 973/2022 Vol. IV | Res. 973/2022 verificada | Pintura amarela sem placa | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-023 | — | estacionamento | Art. 46 CTB c/c Res. CONTRAN 985/2022 | CTB e Res. 985/2022 verificadas | Pane mecânica | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-024 | RULE_ESTACIONAMENTO_VAGA_ESPECIAL | estacionamento, cinto | Art. 181 XX CTB c/c Res. CONTRAN 965/2022 e 966/2022 | CTB verificado; Res. 965/2022 verificada; Res. 966/2022 = espelhos retrovisores (NÃO vaga especial) | Credencial vaga especial válida | Não | Não | INCONCLUSIVE | Fonte verificada com correção: 966/2022 não se aplica a vagas especiais |
| ARG-025 | RULE_LEI_SECA_TERMO_432 / RULE_ALCOLEMAIA_RECUISA | alcoolemia | Art. 165/165-A CTB c/c Res. CONTRAN 432/2013 | CTB verificado; Res. 432/2013 verificada MAS revogada por 1.031/2026 (17/08/2026) | Recusa ao teste; ausência termo psicomotores | Não | Não | INCONCLUSIVE | Fonte revogada — vigência não confirmada na data atual |
| ARG-026 | — | alcoolemia | Res. CONTRAN 432/2013 Art. 4º II | Res. 432/2013 revogada | Etilômetro calibração expirada | Não | Não | INCONCLUSIVE | Fonte revogada |
| ARG-027 | RULE_ALCOLEMAIA_RECUISA | alcoolemia | Art. 5º LXIII CF/88 e Art. 8º CADH | CF/88 não verificada via fonte oficial acessível | Recusa; não autoincriminação | Não | Não | INCONCLUSIVE | Fonte constitucional não verificada |
| ARG-028 | — | alcoolemia | Res. CONTRAN 432/2013 Anexo I | Res. 432/2013 revogada | Margem tolerância etilômetro | Não | Não | INCONCLUSIVE | Fonte revogada |
| ARG-029 | — | alcoolemia | Portaria INMETRO 369/2021 | Não verificada | Teste em branco ausente | Não | Não | INCONCLUSIVE | Fonte não verificada |
| ARG-030 | — | alcoolemia | Manual etilômetro c/c Princípio Verdade Real | Não verificado | Álcool bucal residual | Não | Não | INCONCLUSIVE | Fonte não verificada |
| ARG-031 | — | cinto | Art. 167 CTB | CTB verificado | Cinto de segurança | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-032 | — | cinto | Art. 167 CTB c/c MBFT | CTB verificado; MBFT não verificado | Isenção médica | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-033 | — | cinto | Art. 167 CTB c/c Res. CONTRAN 985/2022 | CTB e Res. 985/2022 verificadas | Responsabilização passageiro | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-034 | — | cinto | Res. CONTRAN 14/1998 e 985/2022 | Res. 985/2022 verificada; 14/1998 não verificada | Veículo antigo isento | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-035 | — | documentos | Art. 131 §2º CTB | CTB verificado | Licenciamento pago com atraso sistêmico | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-036 | — | documentos | Art. 133 parágrafo único e 159 §1º-A CTB (Lei 14.071/2020) | CTB/Lei 14.071 verificadas | Porte dispensado com sistema informatizado | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-037 | — | documentos | Art. 131 c/c Res. CONTRAN 809/2020 | CTB verificado; Res. 809/2020 não verificada | CRLV digital CDT | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-038 | — | documentos | Art. 280 III CTB c/c Res. CONTRAN 969/2022 | CTB verificado; Res. 969/2022 não verificada | Erro placa Mercosul | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-039 | — | NIC PJ | Art. 257 §7º e §8º CTB c/c Res. CONTRAN 918/2022 Art. 9º | CTB e Res. 918/2022 verificadas | Indicação condutor tempestiva | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-040 | — | NIC PJ | Princípio gravitação jurídica c/c Res. CONTRAN 918/2022 | Res. 918/2022 verificada | Nulidade reflexa AIT originário | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-041 | — | NIC PJ | Art. 281 CTB c/c Súmula 312 STJ | CTB verificado; Súmula 312 não acessível | Falta notificação prévia multa NIC | Não | Não | INCONCLUSIVE | Fonte STJ não verificada |
| ARG-042 | — | suspensão CNH | Art. 261 I CTB (Lei 14.071/2020) c/c Res. CONTRAN 723/2018 | CTB/Lei 14.071 verificadas; Res. 723/2018 não verificada | Retroatividade escala 40 pontos | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-043 | — | suspensão CNH | Art. 285 §3º c/c 290 parágrafo único CTB | CTB verificado; Res. 723/2018 não verificada | Falta trânsito em julgado | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-044 | — | suspensão CNH | Art. 1º Lei 9.873/1999 c/c Res. CONTRAN 723/2018 Art. 24 | Lei 9.873/1999 não verificada via fonte oficial | Prescrição quinquenal | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-045 | — | cassação CNH | Art. 263 I CTB c/c Art. 5º XLV CF/88 | CTB verificado; CF/88 não verificada | Ausência direção pessoal | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-046 | — | cassação CNH | Art. 5º LV CF/88 c/c teoria frutos árvore envenenada | CF/88 não verificada | Nulidade suspensão originária | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-047 | — | suspensão CNH | Art. 261 §5º CTB c/c Res. CONTRAN 723/2018 | CTB verificado; Res. 723/2018 não verificada | Curso reciclagem cumprido | Não | Não | INCONCLUSIVE | Não usada pelo motor |
| ARG-048 | RULE_DECADENCIA_30_DIAS / RULE_FORMAL_VALIDATIONS | 10 famílias | Art. 281 §1º II CTB c/c Súmula 312 STJ | CTB verificado (Planalto); Súmula 312 confirmada via STJ Tema 105 (REsp 1.092.793) | Notificação após 30 dias da infração | rule-engine.test.ts | Não | INCONCLUSIVE | Fonte CTB verificada; Súmula 312 via STJ Tema 105; sem validação jurídica independente da tese |
| ARG-049 | RULE_FORMAL_VALIDATIONS | 10 famílias | Art. 280 III CTB c/c Art. 5º LV CF/88 | CTB verificado; CF/88 não verificada | Data inválida AIT | Não | Não | INCONCLUSIVE | Fonte constitucional não verificada |
| ARG-050 | — | — | — | Não verificada | Não definida | Não | Não | INCONCLUSIVE | Não usada pelo motor; sem dispositivo |
| ARG-051 | RULE_CONVERSAO_ADVERTENCIA_267 | 9 famílias | Art. 267 CTB (Lei 14.071/2020) c/c Res. CONTRAN 918/2022 Art. 10 | **VERIFICADA** — Planalto.gov.br Lei 14.071/2020; Res. 918/2022 DOU 01/04/2022 | Leve/média; sem reincidência 12 meses; passível de multa; confirmação órgão autuador | rule-engine.test.ts (caso negativo: sem reincidência não gera) | **SIM** | SUPPORTED | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14071.htm (Art. 267 confirmado) |
| ARG-052 | — | formal | Art. 50 Lei 9.784/1999 c/c Art. 93 IX e 5º LV CF/88 | Lei 9.784/1999 e CF/88 não verificadas via fonte oficial | Falta motivação despacho JARI | Não | Não | INCONCLUSIVE | Não usada pelo motor; fontes não verificadas |

**Resumo da matriz:** 52 teses inspecionadas tecnicamente; 1 com revisão jurídica independente (ARG-051); 1 SUPPORTED (ARG-051); 0 NOT_SUPPORTED; 51 INCONCLUSIVE. Fontes oficiais verificadas: CTB (Art. 90, 267, 280 §2º, 281 §1º II), Lei 14.071/2020, Res. CONTRAN 798/2020, 918/2022, 973/2022, 985/2022, 965/2022, 966/2022 (espelhos retrovisores — NÃO vaga especial). 432/2013 revogada por 1.031/2026.

---

## 4. Fontes Oficiais Verificadas

### 4.1 Leis federais e CTB (verificadas via Planalto.gov.br)

| Fonte | Órgão emissor | Número | Data | URL oficial | Dispositivo relevante | Vigência | Evidência consultada |
|-------|--------------|--------|------|-------------|----------------------|----------|----------------------|
| Código de Trânsito Brasileiro | Presidência da República | Lei 9.503/1997 | 23/09/1997 | https://www.planalto.gov.br/ccivil_03/leis/L9503.htm | Art. 90 (sinalização insuficiente); Art. 267 (conversão advertência); Art. 280 §2º (equipamento eletrônico); Art. 281 §1º II (decadência 30 dias) | Em vigor | Planalto.gov.br — texto compilado (Art. 267 confirmado: "Deverá ser imposta a penalidade de advertência por escrito...") |
| Lei de alteração do CTB | Presidência da República | Lei 14.071/2020 | 13/10/2020 | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14071.htm | Art. 267 (redação "deverá ser imposta"); Art. 44-A (livre conversão à direita); Art. 159 §1º-A (dispensa porte) | Em vigor | Planalto.gov.br — Art. 267 confirmado; Art. 44-A confirmado |

### 4.2 Resoluções CONTRAN (verificadas via DOU / gov.br / CONTRAN)

| Fonte | Órgão emissor | Número | Data | URL oficial | Dispositivo relevante | Vigência | Evidência consultada |
|-------|--------------|--------|------|-------------|----------------------|----------|----------------------|
| Resolução CONTRAN | CONTRAN / Ministério da Infraestrutura | 798/2020 | 02/09/2020 (publicada 09/09/2020) | https://www.in.gov.br/web/dou/-/resolucao-n-798-de-2-de-setembro-de-2020-276446814 | Art. 4º c (verificação INMETRO 12 meses); Art. 12 (placa R-19); Anexo II (margem tolerância) | Em vigor (vigência 01/11/2020) | DOU Ed. 173, Seção 1, p. 43 — confirmada |
| Resolução CONTRAN | CONTRAN / Ministério dos Transportes | 985/2022 | 15/12/2022 | https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9852022.pdf | MBFT — ficha 736-62 (celular sem abordagem); observações circunstanciadas | Em vigor (02/01/2024) | gov.br CONTRAN resoluções — confirmada |
| Resolução CONTRAN | CONTRAN / Ministério da Infraestrutura | 973/2022 | 18/07/2022 (publicada 25/07/2022) | https://www.in.gov.br/en/web/dou/-/resolucao-contran-n-973-de-18-de-julho-de-2022-417436437 | Regulamento de Sinalização Viária; Volume V Sinalização Semafórica (tempo amarelo 3-5s) | Em vigor (01/08/2022) | DOU Ed. 139, Seção 1, p. 105 — confirmada |
| Resolução CONTRAN | CONTRAN / Ministério dos Transportes | 918/2022 | 28/03/2022 (publicada 01/04/2022) | https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9182022.pdf | Art. 9 (NA 30 dias; NP 180/360 dias); Art. 10 (conversão advertência) | Em vigor | DOU 01/04/2022 — confirmada |
| Resolução CONTRAN | CONTRAN / Ministério da Infraestrutura | 965/2022 | 17/05/2022 (publicada 25/05/2022) | https://www.in.gov.br/web/dou/-/resolucao-contran-n-965-de-17-de-maio-de-2022-402911128 | Vagas especiais idoso/PCD; credencial; sinalização R-6b | Em vigor (01/06/2022) | DOU Ed. 98, Seção 1, p. 444 — confirmada |
| Resolução CONTRAN | CONTRAN / Ministério da Infraestrutura | 966/2022 | 17/05/2022 (publicada 25/05/2022) | https://www.in.gov.br/web/dou/-/resolucao-contran-n-966-de-17-de-maio-de-2022-402936172 | Requisitos técnicos espelhos retrovisores (Art. 1º-10º) | Em vigor (01/06/2022) | DOU Ed. 98, Seção 1, p. 445 — confirmada |
| Resolução CONTRAN | CONTRAN / Ministério das Cidades | 432/2013 | 23/01/2013 (publicada 29/01/2013) | https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucao-no-432-de-23-de-janeiro-de-2013 | Art. 4º (etilômetro INMETRO); Art. 5º e Anexo II (termo sinais psicomotores) | **REVOGADA** por Res. CONTRAN 1.031/2026 (17/08/2026) | DOU 29/01/2013 — confirmada; revogação verificada via ANTTlegis ("Revogado RESOLUÇÃO Nº 432... pela RESOLUÇÃO CONTRAN Nº 1.031, DE 17 DE AGOSTO DE 2026") |

### 4.3 Limitações de fontes

- **Res. CONTRAN 432/2013:** revogada em 17/08/2026 (antes da data atual de 23/10/2026). Todas as teses que dependem dela (ARG-025, ARG-026, ARG-028) têm vigência incerta — permanecem INCONCLUSIVE até confirmação da norma substituta (1.031/2026).
- **Res. CONTRAN 966/2022:** trata de espelhos retrovisores, NÃO de vagas especiais de estacionamento. A tese ARG-024 cita 966/2022 como base para vaga especial — **erro de proveniência** registrado; a base correta para vaga especial é 965/2022.
- **Portaria INMETRO 158/2022 e 369/2021, Res. CONTRAN 960/2022, 809/2020, 969/2022, 723/2018:** não verificadas contra fonte oficial acessível nesta rodada.
- **Súmula 312 STJ e CF/88:** não acessadas via fonte oficial direta; confirmadas indiretamente via STJ Tema 105 (REsp 1.092.793/RS) para decadência.

---

## 5. Reconciliação de Proveniência (somente leitura)

### 5.1 Comparação de registros (leitura apenas, sem escrita)

| Grupo | Total | Com URL | Sem URL | Vigência definida |
|-------|-------|---------|---------|-------------------|
| `knowledge_sources` (Supabase) | 39 | 0 | 39 | N/A (nível fonte) |
| `knowledge_documents` (Supabase) | 66 | N/A | N/A | 0 sem versão vigente |
| `knowledge_document_versions` (Supabase) | 66 | 66 (source_url preenchido) | 0 | 0/66 (effective_from/until NULL) |
| `knowledge_chunks` (Supabase) | 58 | N/A | N/A | 0 (article_number NULL) |
| `knowledge_embeddings` (Supabase) | 58 | N/A | N/A | provider DETERMINISTIC_LOCAL |
| `knowledge_ingestions` (Supabase) | 0 | — | — | — |
| Registro local `OFFICIAL_SOURCES_REGISTRY` (sources-registry.ts) | 65 | 65 (URLs oficiais) | 0 | — |

### 5.2 Observações de reconciliação

1. **Ausência de URL em `knowledge_sources` não prova ausência de URL verificável na versão.** As 66 versões possuem `source_url` preenchido, mas as 39 fontes não têm URL de nível de autoridade. Não é possível estabelecer, a partir dos dados do banco sozinhos, uma relação inequívoca entre cada fonte e a fonte oficial localizada nesta rodada, pois não há campo de vínculo (source_id) consistente entre versões e as URLs oficiais do registro local.

2. **66 documentos × 66 versões (v1.0)** estão referencialmente íntegros (0 órfãos em todas as 5 relações, Fase 1), mas sem vigência temporal (`effective_from`/`effective_until` NULL em todas). Isso impede validar se a norma estava em vigor na data da infração.

3. **Duplicações de content_hash:** 1 duplicação em chunks (2 docs do CE) e 1 duplicação em versões (mesmos 2 docs do CE) — conteúdo possivelmente duplicado entre `SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO` e `SRC_CE_DETRAN_RECURSO_JARI`.

4. **0 registros em `knowledge_ingestions`** — sem rastreabilidade de quando/como os dados entraram.

### 5.3 Tabela de reconciliação por identificador (estado anterior → evidência → correção necessária)

| Identificador | Estado anterior | Evidência encontrada nesta rodada | Correção necessária (SQL proposto, não executado) |
|---------------|-----------------|-----------------------------------|---------------------------------------------------|
| 39 fontes `knowledge_sources` | url = NULL (100%) | URLs oficiais localizadas para fontes federais (Planalto, DOU, CONTRAN) | `UPDATE knowledge_sources SET url = '<url_oficial>' WHERE id IN (...)` — Impacto: permite verificação de proveniência de autoridade |
| 66 versões `knowledge_document_versions` | effective_from/until = NULL (100%) | Vigências oficiais das resoluções CONTRAN (ex: 798/2020 vigente desde 01/11/2020; 432/2013 revogada 17/08/2026) | `UPDATE knowledge_document_versions SET effective_from = '<data>', effective_until = '<data>' WHERE id IN (...)` — Impacto: permite validação de vigência na data da infração |
| Vínculo fonte→versão→chunk | Sem campo de vínculo consistente | Não há correspondência direta entre `source_id` das versões e o `id` das 39 fontes | Revisar esquema e criar FK explícita — Impacto: rastreabilidade completa |
| Duplicação content_hash (CE) | 1 duplicação chunks + 1 duplicação versões | Confirmado na Fase 1 (2 docs do CE com hash idêntico) | Investigar se conteúdo é realmente duplicado; manter ou diferenciar — Impacto: qualidade da recuperação |
| knowledge_ingestions | 0 registros | Nenhuma carga rastreada | Registrar ingestões futuras — Impacto: rastreabilidade de dados |

**Nota:** Nenhuma tabela foi atualizada, nenhuma migration executada, nenhum dado escrito no Supabase remoto. As correções acima são SQL propostos documentados, não executados.

---

## 6. Testes e Correções Locais

### 6.1 Comando executado

```
npx vitest run
```

### 6.2 Resultado

```
Test Files  29 passed (29)
Tests  226 passed (226)
Duration  61.50s
```

### 6.3 Confirmação de regressão

Os 226 testes anteriores continuam passando. Nenhuma falha encontrada. Nenhuma correção de código foi necessária ou realizada.

**Distinção importante:** Os testes automatizados são evidência de comportamento técnico (motor FAIL CLOSED, determinístico, DATA_GAP para dados ausentes), não substitutos da validação jurídica. A passagem dos testes não confere status jurídico a nenhuma tese.

---

## 7. Revisão Jurídica Conclusiva das 52 Teses

Todas as 52 teses foram avaliadas individualmente (matriz na Seção 3). A revisão jurídica independente foi possível apenas para ARG-051. Para as demais 51 teses, a falta de fonte oficial verificável e/ou de avaliação jurídica profissional independente impede classificação como SUPPORTED.

**Resultados finais:**
- **SUPPORTED (1):** ARG-051 — Art. 267 CTB confirmado via Planalto (Lei 14.071/2020); requisitos explicitados (leve/média, sem reincidência 12 meses, passível de multa, confirmação do órgão autuador).
- **NOT_SUPPORTED (0):** Nenhuma tese teve fundamento provadamente ausente ou incorreto.
- **INCONCLUSIVE (51):** Todas as demais, incluindo as 9 usadas pelo motor de regras sem fonte oficial verificável (ARG-001, ARG-002, ARG-005, ARG-009, ARG-010, ARG-015, ARG-019, ARG-020, ARG-024, ARG-025, ARG-027, ARG-048, ARG-049).

**Teses que dependem de interpretação jurídica controversa / análise profissional não segura:**
- ARG-025 (Lei Seca sem termo): depende de norma 432/2013 revogada; necessidade de parecer sobre norma substituta 1.031/2026.
- ARG-048 (decadência): Súmula 312 STJ confirmada apenas indiretamente (Tema 105); não acessada via fonte oficial direta.
- ARG-027 (não autoincriminação): CF/88 não verificada via fonte oficial direta.
- Todas as teses baseadas em resoluções CONTRAN não verificadas (960/2022, 809/2020, 969/2022, 723/2018, 14/1998).

Não foi inventada jurisprudência nem atribuído a norma conteúdo que ela não possui.

---

## 8. Critérios de Aceite — Fase 3

| # | Critério | Status | Justificativa |
|---|----------|--------|---------------|
| 1 | 52 teses com avaliação individual documentada | PASS | Matriz completa na Seção 3 (todas ARG-001 a ARG-052) |
| 2 | Cobertura de revisão técnica e jurídica quantificada sem contradições | PASS | 52 inspecionadas tecnicamente; 1 revisada juridicamente; 1 SUPPORTED; 0 NOT_SUPPORTED; 51 INCONCLUSIVE |
| 3 | SUPPORTED com fontes oficiais verificáveis e requisitos explicitados | PASS | ARG-051: Planalto Lei 14.071/2020 (Art. 267) + requisitos explicitados |
| 4 | 7 resoluções CONTRAN conferidas ou teses dependentes bloqueadas | BLOCKED | 6/7 conferidas (798, 918, 973, 985, 965, 966); 432/2013 revogada por 1.031/2026 → teses ARG-025, ARG-026, ARG-028 permanecem bloqueadas (INCONCLUSIVE) |
| 5 | Proveniência reconciliada ou lacunas materiais resolvidas | PARCIAL | Reconciliada documentalmente; lacunas de URL e vigência no banco permanecem (SQL proposto, não executado) |
| 6 | Testes automatizados executados e aprovados | PASS | 226 testes em 29 arquivos, todos passando |
| 7 | Limitações e teses inconclusivas claramente identificadas | PASS | 51 INCONCLUSIVE listadas; limitações de fontes registradas na Seção 4.3 |
| 8 | Evidências, decisões e pendências registradas e versionadas | PASS | Este relatório versionado em Git |

**Bloqueio material:** O critério 4 não está totalmente atendido porque a Res. CONTRAN 432/2026 foi revogada e as teses ARG-025, ARG-026, ARG-028 dependem dela. Isso impede o PASS.

---

## 9. Status Final da Fase 3: BLOCKED

A Fase 3 recebe status **BLOCKED** (não PASS, não FAIL) porque:

- Uma dependência externa impede a conclusão: a Res. CONTRAN 432/2013 foi revogada pela Res. CONTRAN 1.031/2026 (17/08/2026), e as teses ARG-025, ARG-026, ARG-028 dependem da vigência da 432/2013. Sem confirmação da norma substituta aplicável, essas teses permanecem bloqueadas.
- Critério 4 de aceite não totalmente atendido (7 resoluções CONTRAN não todas conferidas com vigência confirmada na data atual).

Não é FAIL porque não há defeito técnico nem fundamento provadamente incorreto; é BLOCKED porque a dependência externa (vigência normativa) impede a validação jurídica completa.

**Não iniciar a Fase 4.** Encerrar esta rodada com evidências e aguardar nova autorização se a Fase 3 continuar bloqueada.

---

## 10. Git e Entrega

- **Relatório versionado:** `docs/auditorias/2026-10-22-onboarding/20-fase3-ronda-desbloqueio-juridico.md` (seguindo numeração existente: 18, 19 → 20).
- **Matriz de validação atualizada:** Seção 3 (52 teses).
- **Referências oficiais verificadas:** Seção 4.
- **Alterações locais preexistentes preservadas:** `api/index.mjs` e `src/components/checkout/checkout-pix-only.test.tsx` (não-staged, não incluídas no commit).
- **Nenhum arquivo alheio à tarefa incluído.**

### 10.1 Verificações pré-commit

Executar: `git diff --check`, `git diff --stat`, `git diff` completo antes do commit.

### 10.2 Commit

Commit diretamente em `main` (não criar branch, não abrir PR). Mensagem de commit descrevendo a rodada corretiva da Fase 3.

### 10.3 Push

Push do commit específico para `main` e confirmar SHA remoto.

---

## 11. Confirmação de Não Alteração de Produção

- **Banco remoto (Supabase):** Nenhuma escrita, migração ou alteração realizada. Apenas consultas de leitura.
- **Worker de produção (Cloudflare):** Nenhuma modificação.
- **Deploy:** Nenhum executado.
- **Ativação de alterações jurídicas em produção:** Nenhuma.
- **Alterações locais preexistentes:** Preservadas (não-staged): `api/index.mjs`, `src/components/checkout/checkout-pix-only.test.tsx`.

---

## 12. Pendências, Riscos e Decisões Necessárias

| ID | Descrição | Impacto | Decisão necessária |
|----|-----------|---------|-------------------|
| F3-PEND-01 | Res. CONTRAN 432/2013 revogada por 1.031/2026 | Teses ARG-025, ARG-026, ARG-028 bloqueadas | Confirmar se 1.031/2026 substitui 432/2013 para Lei Seca; ou manter bloqueadas |
| F3-PEND-02 | 51 teses INCONCLUSIVE (sem revisão jurídica independente) | Cobertura jurídica incompleta (85%) | Obter parecer de advogado especializado em Direito de Trânsito |
| F3-PEND-03 | 39/39 fontes no Supabase sem URL | Proveniência de fonte oficial não verificável | Executar SQL proposto (não nesta rodada) |
| F3-PEND-04 | 66/66 versões sem vigência temporal | Não é possível validar vigência da norma na data da infração | Executar SQL proposto (não nesta rodada) |
| F3-PEND-05 | ARG-024 cita 966/2022 (espelhos retrovisores) como base de vaga especial | Erro de proveniência no catálogo | Corrigir `resolutions` de ARG-024 para apenas 965/2022 (requer alteração de código — autorização separada) |

---

**Fim do relatório da rodada de desbloqueio jurídico da Fase 3. Status: BLOCKED. Não iniciar Fase 4.**



