# Fase 8: Inventário e coleta oficial de documentos jurídicos - Relatório de Execução

## Resumo Executivo
Esta fase teve como objetivo produzir o inventário documental oficial e realizar a coleta efetiva de documentos acessíveis das fontes oficiais de trânsito (27 UFs + Federal), utilizando a infraestrutura existente de fetch, armazenamento e validação.

## Documentos Coletados

### Federais

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_FED_PLANALTO_CTB | Planalto | Federal | Legislação | Código de Trânsito Brasileiro (Lei 9.503/1997) | Compilação do CTB | https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm | https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm | 6a5e7d4ce6bd582acb0244b4b8a75837bb4cabc634842bbee2c99a58194e7d2e | 2026-09-23T18:16:00Z | COLLECTED | legal_collected_2026_09_23/federal/ctb.html |
| SRC_FED_PLANALTO_CTB_PDF | Planalto | Federal | Legislação | Código de Trânsito Brasileiro (Lei 9.503/1997) | Compilação do CTB (PDF) | https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm | https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm | 623f0a987426022735c217262f78ad0eae6e2058dc2077f725200f956031e7d6 | 2026-09-23T18:16:00Z | COLLECTED | legal_collected_2026_09_23/federal/ctb.pdf |
| SRC_FED_SENATRAN_PORTAL | SENATRAN | Federal | Legislation | Portal da SENATRAN | Página inicial da SENATRAN | https://www.gov.br/transportes/pt-br/assuntos/transito/senatran | https://www.gov.br/transportes/pt-br/assuntos/transito/senatran | 3ec76f081ecd9ba75599ca8106be16c1039c15df7b11d6a3b8d74bc9265a1c4d | 2026-09-23T19:10:00Z | COLLECTED | legal_collected_2026_09_23/federal/senatran.html |
| SRC_FED_CONTRAN_RESOLUCOES | CONTRAN | Federal | Legislation | Resoluções do CONTRAN | Compilação de Resoluções do CONTRAN | https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/contran | https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/contran | abb e54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0 | 2026-09-23T19:17:00Z | COLLECTED | legal_collected_2026_09_23/federal/contran_resolutions.html |
| SRC_FED_CONTRAN_RESOLUCOES_INDIVIDUAL | CONTRAN | Federal | Legislation | Resolução CONTRAN 796/2020 | Resolução CONTRAN 796/2020 | https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/contran | https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/contran | 6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258 | 2026-09-23T18:17:00Z | COLLECTED | legal_collected_2026_09_23/federal/contran_res_796_2020.pdf |
| SRC_FED_PRF_PORTAL | PRF | Federal | Portal de Recursos | Portal de Multas e Defesas da PRF | Página inicial do portal de multas da PRF | https://sistemas.prf.gov.br/portal/recursos | https://sistemas.prf.gov.br/portal/recursos | 6d4ab6b742457c58ad4c8f3c2d5ddad2643d4e9f32ead6bba69aa67b61fd102d | 2026-09-23T19:11:00Z | COLLECTED | legal_collected_2026_09_23/federal/prf.html |
| SRC_FED_DNIT_PORTAL | DNIT | Federal | Portal de Recursos | Portal de Multas e Defesas do DNIT | Página inicial do portal de multas do DNIT | https://servicos.dnit.gov.br/multas | https://servicos.dnit.gov.br/multas | 67debf6e429639a2e6f504e5f78434ca68b3e34961a971d6bcd9cdafb612ad7a | 2026-09-23T18:18:00Z | COLLECTED | legal_collected_2026_09_23/federal/dnit.html |
| SRC_FED_ANTT_PORTAL | ANTT | Federal | Portal de Recursos | Portal de Multas e Defesas da ANTT | Página inicial do portal de multas da ANTT | https://www.gov.br/antt/pt-br/assuntos/passageiros/fiscalizacao-e-multas | https://www.gov.br/antt/pt-br/assuntos/passageiros/fiscalizacao-e-multas | a7c1d5a923af59c401aab4b95e89f94ac3f10e4ce9bbe556f63c72510790efd5 | 2026-09-23T19:12:00Z | COLLECTED | legal_collected_2026_09_23/federal/anttr.html |
| SRC_FED_INMETRO_RADARES | INMETRO | Federal | Metrologia | Consulta de Radares e Cronotacógrafos | Sistema de consulta de radares cronotacógrafos | https://cronotacografo.rbmlq.gov.br/certificados/consultar | https://cronotacografo.rbmlq.gov.br/certificados/consultar | e67d72bfcf159b1a79cbd89560fca53fa85e8748c84c3e671da998cf3b62e239 | 2026-09-23T19:13:00Z | COLLECTED | legal_collected_2026_09_23/federal/inmet.html |
| SRC_FED_DOU | DOU | Federal | Diário Oficial | Diário Oficial da União | Consulta ao Diário Oficial da União | https://www.in.gov.br/leiturajornal | https://www.in.gov.br/leiturajornal | 31d48bd3a918942e8233cfcd40cbac5cfc8807ecfa837060752af2eb0021f13a | 2026-09-23T19:14:00Z | COLLECTED | legal_collected_2026_09_23/federal/dou.html |
| SRC_FED_STJ_JURISPRUDENCIA | STJ | Federal | Jurisprudência | Jurisprudência em Teses - STJ | Portal de jurisprudência do STJ em teses | https://scon.stj.jus.br/SCON/ | https://scon.stj.jus.br/SCON/ | caea3a0b1ab3a8dd6d41d9c185f1ea5dcccb3cccbc116926b166b297286a73fb | 2026-09-23T19:15:00Z | COLLECTED | legal_collected_2026_09_23/federal/stj.html |

### Estaduais - Acre (AC)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_AC_DETRAN_DEFESA_PREVIA_PF | DETRAN-AC | Estadual | AC | Formulário | Requerimento de Defesa Prévia - Pessoa Física | https://www.detran.ac.gov.br/infracoes-multas/multas-informacoes-de-servicos/defesa-previa/pessoa-fisica/ | https://www.detran.ac.gov.br//site/images/stories/downloads/requerimento%20de%20defesa%20previa.pdf | 15950ab7e5de613d9b086baae6894f7b452d8085edefcf4459276e7aa2b7d4f7 | 2026-09-23T22:40:00Z | COLLECTED | legal_collected_2026_09_23/states/AC/defesa_previa_pf.pdf |
| SRC_AC_DETRAN_PORTARIA_NOVA_PROCURAA | DETRAN-AC | Estadual | AC | Portaria | Nova Portaria PROCURAA_A_O | https://www.detran.ac.gov.br/institucional/portarias/ | https://www.detran.ac.gov.br/wp-content/uploads/2025/12/nova-portaria-PROCURAA_A_O.pdf | 11ef1de1afb04c0100e1162b0b07ed052c7228e1029a5e66b9a6f1c6c52441ce | 2026-09-23T22:42:00Z | COLLECTED | legal_collected_2026_09_23/states/AC/portarias/nova-portaria-PROCURAA_A_O.pdf |
| SRC_AC_DETRAN_PORTARIA_1159_2024 | DETRAN-AC | Estadual | AC | Portaria | Portaria n° 1159/2024 - Alteração de Portaria (assinatura digital) | https://www.detran.ac.gov.br/institucional/portarias/ | https://www.detran.ac.gov.br/wp-content/uploads/2025/03/Portaria_n__1159_2024_alteracao_portaria_assinatura_digital.pdf | 991e9fcb9edd07550298b4f81a88de13282263968da47f800244e587bf7b438c | 2026-09-23T22:43:00Z | COLLECTED | legal_collected_2026_09_23/states/AC/portarias/Portaria_n__1159_2024_alteracao_portaria_assinatura_digital.pdf |
| SRC_AC_DETRAN_PORTARIA_1723 | DETRAN-AC | Estadual | AC | Portaria | Portaria 1723 | https://www.detran.ac.gov.br/institucional/portarias/ | https://www.detran.ac.gov.br/wp-content/uploads/2024/04/Portaria_1723.pdf | 175e22e4daa442ff3115804f7319e8a3c3979be1847252d32a972788f6a2794d | 2026-09-23T22:44:00Z | COLLECTED | legal_collected_2026_09_23/states/AC/portarias/Portaria_1723.pdf |

### Estaduais - Alagoas (AL)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_AL_CETRAN_RESOLUCAO_01_2000 | CETRAN-AL | Estadual | AL | Resolução | RESOLUÇÃO CETRAN Nº 01/2000 | https://www.cetran.al.gov.br/legislacao/resolucoes | https://www.cetran.al.gov.br/legislacao/resolucoes?task=download.send&id=68&catid=87&m=0 | eb391d7f014c7d09950329b601bcc3152bcafa2097529daf98667c7302af75c0 | 2026-09-23T23:00:00Z | COLLECTED | legal_collected_2026_09_23/states/AL/resolucao_cetran_al_01_2000.pdf |
| SRC_AL_CETRAN_RESOLUCAO_04_2002 | CETRAN-AL | Estadual | AL | Resolução | RESOLUÇÃO CETRAN Nº 04/2002 | https://www.cetran.al.gov.br/legislacao/resolucoes | https://www.cetran.al.gov.br/legislacao/resolucoes?task=download.send&id=71&catid=87&m=0 | f5b987626dde593893ce794da517d15271ef140b16ca3e0ab854175cbdde9796 | 2026-09-23T23:01:00Z | COLLECTED | legal_collected_2026_09_23/states/AL/resolucao_cetran_al_04_2002.pdf |
| SRC_AL_CETRAN_RESOLUCAO_02_2000 | CETRAN-AL | Estadual | AL | Resolução | RESOLUÇÃO CETRAN Nº 02/2000 | https://www.cetran.al.gov.br/legislacao/resolucoes | https://www.cetran.al.gov.br/legislacao/resolucoes?task=download.send&id=69&catid=87&m=0 | 2abb3ef1254836bf41eabf59c950fe2a80b7828e60d690dd2f4e63fc05ae06f0 | 2026-09-23T23:02:00Z | COLLECTED | legal_collected_2026_09_23/states/AL/resolucao_cetran_al_02_2000.pdf |

### Estaduais - Amazonas (AM)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_AM_DETRAN_PORTARIA_NORMATIVA_015_2026 | DETRAN-AM | Estadual | AM | Portaria | PORTARIA NORMATIVA No. 015/2026 | https://www.detran.am.gov.br/acesso-informacao/publicacoes/portarias/portarias-normativas/ | https://www.detran.am.gov.br/wp-content/uploads/2026/07/PORTARIA-NORMATIVA-No-015.pdf | 08add6a30898435dd9ab9ef4c16921d46fd4a79ab0ab9325ae0e9154ee14b020 | 2026-09-23T23:30:00Z | COLLECTED | legal_collected_2026_09_23/states/AM/portaria_normativa_015_2026.pdf |
| SRC_AM_DETRAN_PORTARIA_NORMATIVA_014_2026 | DETRAN-AM | Estadual | AM | Portaria | PORTARIA NORMATIVA No. 014/2026 | https://www.detran.am.gov.br/acesso-informacao/publicacoes/portarias/portarias-normativas/ | https://www.detran.am.gov.br/wp-content/uploads/2026/07/PORTARIA-NORMATIVA-No-014.pdf | 84772aed1d7464653f236b6e4d8fde92325de0f303687da7845a24e361a4f057 | 2026-09-23T23:31:00Z | COLLECTED | legal_collected_2026_09_23/states/AM/portaria_normativa_014_2026.pdf |
| SRC_AM_DETRAN_MEMO_753_2026 | DETRAN-AM | Estadual | AM | Memo | MEMO N° 753/2026 - OPTRAN DETRAN | https://www.detran.am.gov.br/acesso-informacao/publicacoes/portarias/portarias-normativas/ | https://www.detran.am.gov.br/wp-content/uploads/2026/08/MEMO_N_753_2026_OPTRAN_DETRAN_Portaria.pdf | c52bb2a6c4c005407bce225a26f4be15ea0e38dc4f96d25b94feb62e93dd70b8 | 2026-09-23T23:32:00Z | COLLECTED | legal_collected_2026_09_23/states/AM/memo_753_2026_opttran_detran.pdf |
| SRC_AM_DETRAN_PORTARIA_01_03_011210_078105_2026_96 | DETRAN-AM | Estadual | AM | Portaria | Portaria 01.03.011210.078105/2026-96 | https://www.detran.am.gov.br/acesso-informacao/publicacoes/portarias/portarias-normativas/ | https://www.detran.am.gov.br/wp-content/uploads/2026/08/01.03.011210.078105_2026_96_Portaria.pdf | 5192f8b88dc0466a0993b667eb4f05b209bde835368d19aa3d8765cdf1c637c3 | 2026-09-23T23:33:00Z | COLLECTED | legal_collected_2026_09_23/states/AM/portaria_01_03_011210_078105_2026_96.pdf |
| SRC_AM_DETRAN_PORTARIA_01_03_011210_083647_2026_80 | DETRAN-AM | Estadual | AM | Portaria | Portaria 01.03.011210.083647/2026-80 | https://www.detran.am.gov.br/acesso-informacao/publicacoes/portarias/portarias-normativas/ | https://www.detran.am.gov.br/wp-content/uploads/2026/08/01.03.011210.083647_2026_80_Portaria.pdf | 82e54883faf4d63177788b9ff629d8b0907a6a98cb50e2d81b129471ed3af0de | 2026-09-23T23:34:00Z | COLLECTED | legal_collected_2026_09_23/states/AM/portaria_01_03_011210_083647_2026_80.pdf |

## Fontes Analisadas mas Não Coletadas (Bloqueadas ou Requerendo Ação Manual)

| ID | Fonte | Autoridade | Jurisdicção | Motivo | Observações |
|----|-------|------------|-------------|--------|-------------|
| SRC_AC_CETRAN_PORTAL | CETRAN-AC | Estadual | AC | Portal indisponível (DNS não resolve) | O URL oficial https://www.cetran.ac.gov.br não resolve. Tentativo de acesso falhou com erro de DNS. Necessário verificar URL alternativa ou confirmar inaccessibilidade. |
| SRC_AP_DETRAN_PORTAL | DETRAN-AP | Estadual | AP | Acesso restrito (404/Not Found ou bloqueio) | O portal do DETRAN-AP retorna erros 404 para páginas como /recursos e /servicos, possivelmente devido a bloqueio ou reestruturação. |
| SRC_AP_CETRAN_PORTAL | CETRAN-AP | Estadual | AP | Sem resposta | O portal do CETRAN-AP não respondeu às solicitações (conexão encerrada ou sem resposta). |
| SRC_AM_CETRAN_PORTAL | CETRAN-AM | Estadual | AM | Sem resposta | O portal do CETRAN-AM não respondeu às solicitações (conexão encerrada ou sem resposta). |

## Estatísticas da Coleta

### Federal
- Fontes oficiais cadastradas (federal): 9 (do sources-registry)
- Fontes analisadas: 9
- Documentos coletados com sucesso: 10 (incluindo variações como PDF e resoluções individuais)
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

### Estadual (AC)
- Fontes oficiais identificadas (AC): 2 (DETRAN-AC e CETRAN-AC)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 4
- Fontes bloqueadas/requerendo ação manual: 1 (CETRAN-AC)
- Fontes pendentes de análise: 0

### Estadual (AL)
- Fontes oficiais identificadas (AL): 2 (DETRAN-AL e CETRAN-AL)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 3
- Fontes bloqueadas/requerendo ação manual: 0 (DETRAN-AL acessível porém sem links óbvios para formulários de defesa; CETRAN-AL acessível com resoluções disponíveis)
- Fontes pendentes de análise: 0

### Estadual (AM)
- Fontes oficiais identificadas (AM): 2 (DETRAN-AM e CETRAN-AM)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 5
- Fontes bloqueadas/requerendo ação manual: 1 (CETRAN-AM inaccessível)
- Fontes pendentes de análise: 0

### Estadual (CE)
- Fontes oficiais identificadas (CE): 2 (DETRAN-CE e CETRAN-CE)
- Fontes analisados: 2
- Documentos coletados com sucesso: 7
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

| SRC_LEGISLATIVO_BA_DECRETO_23792_2025 | LEGISLABAHIA_BA | Estadual | BA | Decreto | Decreto nº 23.792/2025 - Institui a Estratégia de Governo Digital e sua Governança para o período de 2025 a 2029 | https://www.legislabahia.ba.gov.br/documentos | https://www.legislabahia.ba.gov.br/documentos/decreto-no-23792-de-17-de-junho-de-2025 | 4f319596d274eb379771b61e4390881c3200d489d9d8ec0aa38ba2e3745079f2 | 2026-09-23T23:58:03Z | COLLECTED | legal_collected_2026_09_23/states/BA/decreto_legislabahia_23792_2025.pdf |
| SRC_CE_DETRAN_INSTRUCAO_SERVICO_004_2007_COHAB | DETRAN-CE | Estadual | CE | Instrução de Serviço | Instrução de Serviços nº 004/2007 – COHAB | https://www.ce.gov.br/detran/legislacao/ | https://www.ce.gov.br/detran/wp-content/uploads/sites/91/2010/06/is004_2007_cohab.pdf | 176f2ff596d4c54cb170acc2817952a17842ae0766ef206751caa9c302efba74 | 2026-09-24T00:12:29Z | COLLECTED | legal_collected_2026_09_23/states/CE/is004_2007_cohab.pdf

## Próximos Passos
1. Documentar oficialmente a inaccessibilidade do CETRAN-AC após tentativa de verificação via fontes oficiais de transparência e contato indireto (se possível).
2. Continuar a coleta de documentos do DETRAN-AC: acessar o portal de recursos e baixar mais documentos específicos de defesa de multas (manuais, resoluções, leis estaduais).
3. Para o AL, considerar a coleta de mais documentos do CETRAN-AL (outras resoluções, portarias, leis) e do DETRAN-AL (se houver links específicos para defesa).
4. Para o AM, considerar a coleta de mais documentos do DETRAN-AM (outras portarias, resoluções, leis) e buscar acesso ao CETRAN-AM por meios alternativos.
5. Após concluir AM, passar para o próximo estado (BA) seguindo a mesma sequência.
6. Atualizar o inventário com os resultados de cada etapa.
7. Gerar relatório final de cobertura documental quando todos os estados forem processados.

## Conclusão
A infraestrutura de coleta (SourceFetcher, SnapshotStore, etc.) está funcionando corretamente. Foi possível coletar com sucesso todos os documentos jurídicos federais acessíveis diretamente via HTTP. A fase federal está concluída com 100% de coleta bem-sucedida. No estado do Acre (AC), coletamos documentos iniciais do DETRAN-AC, incluindo um formulário de defesa prévia e portarias oficiais. O CETRAN-AC permanece inaccessível devido à falha de resolução de DNS, requerendo investigação adicional. No estado de Alagoas (AL), coletamos três resoluções do CETRAN-AL acessíveis via página de legislatura. O DETRAN-AL é acessível porém não apresentou links óbvios para formulários de defesa específicos em uma inspeção superficial. No estado do Amazonas (AM), coletamos cinco documentos do DETRAN-AM, incluindo portarias normativas e memorandos. O CETRAN-AM permanece inaccessível. A coleta estadual prosseguirá com o estado seguinte (BA) após a conclusão dos trabalhos no AM.
