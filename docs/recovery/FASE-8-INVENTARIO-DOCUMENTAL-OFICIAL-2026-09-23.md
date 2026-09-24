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

### Estaduais - Distrito Federal (DF)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|

### Estaduais - Bahia (BA)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_LEGISLATIVO_BA_DECRETO_23792_2025 | LEGISLABAHIA_BA | Estadual | BA | Decreto | Decreto nº 23.792/2025 - Institui a Estratégia de Governo Digital e sua Governança para o período de 2025 a 2029 | https://www.legislabahia.ba.gov.br/documentos | https://www.legislabahia.ba.gov.br/documentos/decreto-no-23792-de-17-de-junho-de-2025 | 4f319596d274eb379771b61e4390881c3200d489d9d8ec0aa38ba2e3745079f2 | 2026-09-23T23:58:03Z | COLLECTED | legal_collected_2026_09_23/states/BA/decreto_legislabahia_23792_2025.pdf |

### Estaduais - Ceará (CE)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_CE_DETRAN_INSTRUCAO_SERVICO_004_2007_COHAB | DETRAN-CE | Estadual | CE | Instrução de Serviço | Instrução de Serviços nº 004/2007 – COHAB | https://www.ce.gov.br/detran/legislacao/ | https://www.ce.gov.br/detran/wp-content/uploads/sites/91/2010/06/is004_2007_cohab.pdf | 176f2ff596d4c54cb170acc2817952a17842ae0766ef206751caa9c302efba74 | 2026-09-24T00:12:29Z | COLLECTED | legal_collected_2026_09_23/states/CE/is004_2007_cohab.pdf |

### Estaduais - Espírito Santo (ES)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_ES_DETRAN_RECURSO_MULTA_ONLINE | DETRAN-ES | Estadual | ES | Procedimento | Recurso de Multa On-line | https://detran.es.gov.br/recurso-de-multa-online | https://detran.es.gov.br/recurso-de-multa-online | 0cc85439233035f6bd95e4a20cbc72c2cc78a70758c5710aad7041b938dd49b4 | 2026-09-24T01:37:56Z | COLLECTED | legal_collected_2026_09_23/states/ES/recurso_de_multa_online.html |
| SRC_ES_CETRAN_RESOLUCAO_20_2026 | CETRAN-ES | Estadual | ES | Resolução | RESOLUÇÃO CETRAN Nº 20-2026 | https://detran.es.gov.br/Media/detran/Legislacao/Resoluções/RESOLUÇÃO%20CETRAN%20Nº%2020-2026.pdf | https://detran.es.gov.br/Media/detran/Legislacao/Resoluções/RESOLUÇÃO%20CETRAN%20Nº%2020-2026.pdf | 5e59fc8be7ef37d6076db98210e1135820f9c08d0481cc3df806881d559bfae9 | 2026-09-24T01:37:56Z | COLLECTED | legal_collected_2026_09_23/states/ES/resolucao_cetran_es_2026_20.pdf |

### Estaduais - Goiás (GO)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_GO_DETRAN_DEFESA_PREVIA_PF | DETRAN-GO | DETRAN-GO | GO | Formulário | Requerimento de Defesa Prévia - Pessoa Física | https://www.detran.go.gov.br/ | https://www.detran.go.gov.br/ | 0cccd1e18e850ae8279470c8900c34d3dc692eaf08b7178e445aa88f920c12d1 | 2026-09-24T02:50:55Z | COLLECTED | legal_collected_2026_09_23/states/GO/requerimento_defesa_previa_recurso_detran_go.pdf |
| SRC_GO_CETRAN_RESOLUCAO_1999_003 | CETRAN-GO | CETRAN-GO | GO | Resolução | RESOLUÇÃO CETRAN GO nº 1999/003 | https://www.cetran.go.gov.br/ | https://www.cetran.go.gov.br/ | c6736863bc740f08d66104dd4081cb8bbbd439619e4d7bf75dde0f1dc02af511 | 2026-09-24T02:51:31Z | COLLECTED | legal_collected_2026_09_23/states/GO/resolucao_cetran_go_1999_003.pdf |

### Estaduais - Maranhão (MA)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|

### Estaduais - Minas Gerais (MG)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_MG_DETRAN_DEFESA_PREVIA_PF | DETRAN-MG | DETRAN-MG | MG | Serviço | Apresentar defesa prévia (multa) | https://www.detran.mg.gov.br/ | https://www.detran.mg.gov.br/infracoes/multa/apresentar-defesa-previa-infracao-1 | f0cbb02f78607f29809b718620ecc268a169b5382a0562215d21a24d1a227c91 | 2026-09-24T14:31:34Z | COLLECTED | legal_collected_2026_09_23/states/MG/apresentar_defesa_previa_mg.html |

### Estaduais - Mato Grosso do Sul (MS)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_MS_DETRAN_PORTARIA_211_2026 | DETRAN-MS | DETRAN-MS | MS | Portaria | PORTARIA DETRAN/MS Nº 211 DE 18 DE JUNHO DE 2026 | https://www.detran.ms.gov.br/orgaos_colegiados/junta-administrativa-de-recursos-de-infracao-de-transito/ | https://www.detran.ms.gov.br/wp-content/uploads/2026/06/PORTARIA-DETRANMS-N-No-211-DE-18-DE-JUNHO-DE-2026.pdf | a00ac1712a499b4d04214c1dfad00e136a842b1437d158a449ad0d5304985cd6 | 2026-09-24T15:19:44Z | COLLECTED | legal_collected_2026_09_23/states/MS/portaria_detranms_211_2026.pdf |
| SRC_MS_CETRAN_REGIMENTO_INTERNO | CETRAN-MS | CETRAN-MS | MS | Regimento Interno | Regimento Interno do CETRAN-MS | https://www.cetran.ms.gov.br/legislacao | https://www.sejusp.ms.gov.br/wp-content/uploads/2025/11/Regimento-Interno-CETRAN.pdf | 55b474d84c0daa8a733cc0cc3f2e80682144762ffd3800e09813a4457193bdc5 | 2026-09-24T15:19:46Z | COLLECTED | legal_collected_2026_09_23/states/MS/regimento_interno_cetran.pdf |

### Estaduais - Mato Grosso (MT)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|

### Estaduais - Pará (PA)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_PA_DETRAN_PORTAL | DETRAN-PA | DETRAN-PA | PA | Portal | Portal oficial do DETRAN-PA (shell SPA) | https://www.detran.pa.gov.br/ | https://www.detran.pa.gov.br/ | d138c2e598299b6d0afd9a56b2a651f47e374d33c28b462e21b94fe9351191cf | 2026-09-24T15:29:16Z | COLLECTED | legal_collected_2026_09_23/states/PA/portal_detran_pa.html |

### Estaduais - Paraíba (PB)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_PB_DETRAN_DEFESA_RECURSOS_ONLINE | DETRAN-PB | DETRAN-PB | PB | Serviço | Defesa/Recursos Online | https://detran.pb.gov.br/infracoes/recursos-defesa-online | https://detran.pb.gov.br/infracoes/recursos-defesa-online | 1914ae55909266741a03e0911c257cbbc1f66ea04296335675f96c51b5a6e573 | 2026-09-24T15:32:16Z | COLLECTED | legal_collected_2026_09_23/states/PB/defesa_recursos_online.html |
| SRC_PB_CETRAN_REGIMENTO_INTERNO | CETRAN-PB | CETRAN-PB | PB | Regimento Interno | Regimento Interno CETRAN-PB | https://www.cetran.pb.gov.br/legislacao | https://www.cetran.pb.gov.br/legislacao/Regimento%20interno/@@download/file/Safari.pdf | 1bcb4fcc7b251e00d7569968715b02d9ed44507704db28a37912c5cd876ecbd2 | 2026-09-24T15:32:20Z | COLLECTED | legal_collected_2026_09_23/states/PB/regimento_interno_cetran.pdf |

### Estaduais - Pernambuco (PE)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|

### Estaduais - Piauí (PI)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_PI_DETRAN_MULTAS_ART320 | DETRAN-PI | DETRAN-PI | PI | Informação Jurídica | Multas de Trânsito DETRAN-PI - ART. 320 do CTB | https://www.detran.pi.gov.br/ | https://portal.pi.gov.br/detran/multas-de-transito-detran-pi-art-320-do-ctb/ | 582c2690a672dc0fc68d5a3b76ea2d1686a889a9689f9b04e3d9c036adeeabee | 2026-09-24T15:36:21Z | COLLECTED | legal_collected_2026_09_23/states/PI/multas_transito_art320_ctb.html |
| SRC_PI_DETRAN_RECURSO_MULTA | DETRAN-PI | DETRAN-PI | PI | Serviço | Cadastro de Recurso de Multa (GETRAN) | https://www.detran.pi.gov.br/ | https://www.pi.getran.com.br/site/apps/multa/recurso/cadastrar-recurso.jsp | 9f9afcb1f1dce76e529d870f7f1a22f7c5a4f592287685b93a747a8285726f0c | 2026-09-24T15:36:21Z | COLLECTED | legal_collected_2026_09_23/states/PI/recurso_multa_cadastro.html |
| SRC_PI_CETRAN_DECRETO_22731_2024 | CETRAN-PI | CETRAN-PI | PI | Decreto | Decreto nº 22.731 de 02 de fevereiro de 2024 | https://www.detran.pi.gov.br/ | https://portal.pi.gov.br/detran/wp-content/uploads/sites/62/2025/11/DECRETO-No-22.731-DE-02-DE-FEVEREIRO-DE-2024.pdf | 8f1a3e2db72becc6e2a972f769a454e34327179cab5a02ad7a04b67dfeb7d922 | 2026-09-24T15:37:24Z | COLLECTED | legal_collected_2026_09_23/states/PI/decreto_22731_2024.pdf |
| SRC_PI_CETRAN_DECRETO_24023_2025 | CETRAN-PI | CETRAN-PI | PI | Decreto | Decreto nº 24.023 de 19 de agosto de 2025 | https://www.detran.pi.gov.br/ | https://portal.pi.gov.br/detran/wp-content/uploads/sites/62/2025/11/DECRETO-No-24.023-DE-19-DE-AGOSTO-DE-2025.pdf | ddb7054313ef87af8e04b75b9795887401e2f447f887a9a11def169cb153eced | 2026-09-24T15:37:24Z | COLLECTED | legal_collected_2026_09_23/states/PI/decreto_24023_2025.pdf |

### Estaduais - Paraná (PR)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_PR_DETRAN_RECURSOS | DETRAN-PR | DETRAN-PR | PR | Procedimento | Recursos - DETRAN/PR | https://www.detran.pr.gov.br/Pagina/Recursos | https://www.detran.pr.gov.br/Pagina/Recursos | 2e73369a4e953b449d41762b7288afb49c54046e3bc53a07ee7fc2b635b958e0 | 2026-09-24T15:39:05Z | COLLECTED | legal_collected_2026_09_23/states/PR/recursos.html |
| SRC_PR_CETRAN_RESOLUCOES | CETRAN-PR | CETRAN-PR | PR | Legislação | Resoluções - CETRAN/PR | https://www.cetran.pr.gov.br/Pagina/Resolucoes | https://www.cetran.pr.gov.br/Pagina/Resolucoes | 051a5587291d4448ac1560096b4f06cc4f6cee47bb44427faaf2ee303d4a86c4 | 2026-09-24T15:39:05Z | COLLECTED | legal_collected_2026_09_23/states/PR/resolucoes.html |
| SRC_PR_CETRAN_RESOLUCAO_077_2021 | CETRAN-PR | CETRAN-PR | PR | Resolução | Resolução 077/21 - regras e procedimentos para fiscalização de trânsito de ciclomotores, ciclomotores elétricos e equiparados | https://www.cetran.pr.gov.br/Pagina/Resolucoes | https://www.cetran.pr.gov.br/sites/cetran/arquivos_restritos/files/documento/2021-11/resolucao_077_-21_regras_e_procedimentos_para_a_fiscalizacao_de_transito_dos_ciclomotores_cicloeletricos_e_equiparados.pdf | ec783fd23c79bd4e6755a031fd9617fa8b05da90f087d28eb36a7d431f821d51 | 2026-09-24T15:39:05Z | COLLECTED | legal_collected_2026_09_23/states/PR/resolucao_077_21.pdf |

### Estaduais - Rio de Janeiro (RJ)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_RJ_DETRAN_FORMULARIOS_INFRACOES | DETRAN-RJ | DETRAN-RJ | RJ | Serviço | Formulários de Infrações | https://www.detran.rj.gov.br/formulario/formularios-de-infracoes | https://www.detran.rj.gov.br/formulario/formularios-de-infracoes | 9faad6e62aaddccd2e504156d52be5829a532733b8d1b6b3a4821fdb9ec38b67 | 2026-09-24T15:41:00Z | COLLECTED | legal_collected_2026_09_23/states/RJ/formularios_infracoes.html |
| SRC_RJ_DETRAN_FORMULARIO_DEFESA_RECURSO | DETRAN-RJ | DETRAN-RJ | RJ | Formulário | CJC0160 - Apresentação de Defesa/Recurso | https://www.detran.rj.gov.br/formulario/formularios-de-infracoes | https://www.detran.rj.gov.br/images/ascom/pdf/formularios/CJC0160_apresentacao_defesa_recurso.pdf | f0c237b48a530ef10988dd4f95c5c7864ca31d4692b7bb1f051cb710350bf11f | 2026-09-24T15:41:01Z | COLLECTED | legal_collected_2026_09_23/states/RJ/CJC0160_apresentacao_defesa_recurso.pdf |
| SRC_RJ_CETRAN_RESOLUCOES | CETRAN-RJ | CETRAN-RJ | RJ | Legislação | Resoluções CETRAN-RJ | http://www.cetran.rj.gov.br/estadual/resolucoes-cetran | http://www.cetran.rj.gov.br/estadual/resolucoes-cetran | 01812bab2ee1d80fe13131cfdf56e863659c0b8d4646c6204edc76749378df2a | 2026-09-24T15:41:00Z | COLLECTED | legal_collected_2026_09_23/states/RJ/resolucoes_cetran.html |

### Estaduais - Rio Grande do Norte (RN)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|

### Estaduais - Rondônia (RO)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|

### Estaduais - Roraima (RR)

| ID | Fonte | Autoridade | Jurisdicção | Tipo de Documento | Título | URL Oficial | URL de Coleta | Hash SHA-256 | Data da Coleta | Status | Arquivo |
|----|-------|------------|-------------|-------------------|--------|-------------|---------------|--------------|----------------|--------|---------|
| SRC_RR_DETRAN_DEFESA_PREVIA | DETRAN-RR | DETRAN-RR | RR | Serviço | Multas em fase de Autuação – Defesa Prévia | https://www.detran.rr.gov.br/ | https://www.detran.rr.gov.br/infracoes/informacoes/multas-em-fase-de-autuacao-defesa-previa/ | e437a867c46791606da81b18e421760e92ba59ce12195497fe669f46d6addf34 | 2026-09-24T15:47:50Z | COLLECTED | legal_collected_2026_09_23/states/RR/defesa_previa.html |
| SRC_RR_DETRAN_RECURSO_AUTUACAO_DEFESA | DETRAN-RR | DETRAN-RR | RR | Formulário | Recurso de Autuação - Defesa Prévia | https://www.detran.rr.gov.br/infracoes/downloads/ | https://www.detran.rr.gov.br/wp-content/uploads/2022/07/recurso_de_autuacao_-_defesa_previa.pdf | 72bca3ce26f57d945a79c071db8f1edd1d48941043a5cda46c921e39f4c30f92 | 2026-09-24T15:47:50Z | COLLECTED | legal_collected_2026_09_23/states/RR/recurso_de_autuacao_defesa_previa.pdf |
| SRC_RR_DETRAN_RECURSO_CETRAN | DETRAN-RR | DETRAN-RR | RR | Formulário | Recurso ao CETRAN-RR | https://www.detran.rr.gov.br/infracoes/downloads/ | https://www.detran.rr.gov.br/wp-content/uploads/2022/07/recurso_ao_CETRAN_-_RR.pdf | 66207d91e9862d398d1aabcfa37f86682012ada90cfe636eee989cde5be4bb94 | 2026-09-24T15:47:51Z | COLLECTED | legal_collected_2026_09_23/states/RR/recurso_ao_cetran.pdf |

## Fontes Analisadas mas Não Coletadas (Bloqueadas ou Requerendo Ação Manual)

| ID | Fonte | Autoridade | Jurisdicção | Motivo | Observações |
|----|-------|------------|-------------|--------|-------------|
| SRC_AC_CETRAN_PORTAL | CETRAN-AC | Estadual | AC | Portal indisponível (DNS não resolve) | O URL oficial https://www.cetran.ac.gov.br não resolve. Tentativo de acesso falhou com erro de DNS. Necessário verificar URL alternativa ou confirmar inaccessibilidade. |
| SRC_AP_DETRAN_PORTAL | DETRAN-AP | Estadual | AP | Acesso restrito (404/Not Found ou bloqueio) | O portal do DETRAN-AP retorna erros 404 para páginas como /recursos e /servicos, possivelmente devido a bloqueio ou reestruturação. |
| SRC_AP_CETRAN_PORTAL | CETRAN-AP | Estadual | AP | Sem resposta | O portal do CETRAN-AP não respondeu às solicitações (conexão encerrada ou sem resposta). |
| SRC_AM_CETRAN_PORTAL | CETRAN-AM | Estadual | AM | Sem resposta | O portal do CETRAN-AM não respondeu às solicitações (conexão encerrada ou sem resposta). |
| SRC_DF_DETRAN_PORTAL | DETRAN-DF | Estadual | DF | Transport error (connection failed) | Todas as tentativas de acesso falharam com erro de transporte (conexão recusada ou timeout). |
| SRC_DF_CETRAN_PORTAL | CETRAN-DF | Estadual | DF | Transport error (connection failed) | Todas as tentativas de acesso falharam com erro de transporte (conexão recusada ou timeout). |
| SRC_MA_DETRAN_PORTAL | DETRAN-MA | Estadual | MA | Sem resposta / JS redirect não resolvido | O portal do DETRAN-MA responde com redirect via JavaScript para paginas/Home.xhtml, que retorna 404. Não foi possível extrair conteúdo estático. |
| SRC_MA_CETRAN_PORTAL | CETRAN-MA | Estadual | MA | Transport error (timeout) | O portal do CETRAN-MA não respondeu (timeout). |
| SRC_MG_CETRAN_PORTAL | CETRAN-MG | Estadual | MG | Transport error (timeout) | O portal do CETRAN-MG não respondeu (timeout). |
| SRC_MT_DETRAN_PORTAL | DETRAN-MT | Estadual | MT | Transport error (TLS handshake ok, resposta HTTP nunca retorna) | O portal do DETRAN-MT redireciona para https://www.detran.mt.gov.br/, cujo TLS conecta mas a resposta HTTP nunca é retornada (timeout mesmo com 35s). F5 BigIP no ar, backend irresponsivo. |
| SRC_MT_CETRAN_PORTAL | CETRAN-MT | Estadual | MT | Transport error (connection failed/timeout) | O portal do CETRAN-MT não respondeu em http ou https (timeout). |
| SRC_PA_CETRAN_PORTAL | CETRAN-PA | Estadual | PA | Transport error (connection failed/timeout) | O portal do CETRAN-PA não respondeu em http ou https (timeout). |
| SRC_PA_DETRAN_PARCIAL | DETRAN-PA | Estadual | PA | Acesso parcial / backend flaky | O portal do DETRAN-PA (SPA) retorna apenas a raiz (200 intermitente); paths como /servicos, /infracoes, /multas e /recursos retornam timeout (000). CETRAN-PA inaccessível. |
| SRC_PE_DETRAN_PORTAL | DETRAN-PE | Estadual | PE | Acesso bloqueado (403 Akamai/WAF) | O portal do DETRAN-PE retorna 403 Access Denied (Akamai edgesuite) em todos os paths, mesmo com User-Agent de navegador. Provável bot protection ou deny por geo/ASN. |
| SRC_PE_CETRAN_PORTAL | CETRAN-PE | Estadual | PE | Transport error (connection failed/timeout) | O portal do CETRAN-PE não respondeu em http ou https (timeout). Alternativas cetranpe.pe.gov.br e cetran.pe.gov.br também irresponsivas. |
| SRC_RN_DETRAN_PORTAL | DETRAN-RN | Estadual | RN | HTTP 503 Service Unavailable / timeout | O portal do DETRAN-RN retornou 503 e, após retries, não respondeu (timeout). Backend indisponível. |
| SRC_RN_CETRAN_PORTAL | CETRAN-RN | Estadual | RN | Transport error (connection failed/timeout) | O portal do CETRAN-RN não respondeu em http ou https (timeout). |
| SRC_RO_DETRAN_PORTAL | DETRAN-RO | Estadual | RO | Transport error (connection failed/timeout) | O portal do DETRAN-RO não respondeu em http ou https (timeout). |
| SRC_RO_CETRAN_PORTAL | CETRAN-RO | Estadual | RO | Transport error (connection failed/timeout) | O portal do CETRAN-RO não respondeu em http ou https (timeout). |
| SRC_RR_CETRAN_PORTAL | CETRAN-RR | Estadual | RR | Transport error (connection failed/timeout) | O portal do CETRAN-RR não respondeu em http ou https (timeout). |

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

### Estadual (DF)
- Fontes oficiais identificadas (DF): 2 (DETRAN-DF e CETRAN-DF)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 0
- Fontes bloqueadas/requerendo ação manual: 2 (DETRAN-DF e CETRAN-DF inaccessíveis)
- Fontes pendentes de análise: 0

### Estadual (BA)
- Fontes oficiais identificadas (BA): 1 (LEGISLABAHIA_BA)
- Fontes analisadas: 1
- Documentos coletados com sucesso: 1
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

### Estadual (CE)
- Fontes oficiais identificadas (CE): 2 (DETRAN-CE e CETRAN-CE)
- Fontes analisados: 2
- Documentos coletados com sucesso: 7
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

### Estadual (ES)
- Fontes oficiais identificadas (ES): 2 (DETRAN-ES e CETRAN-ES)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 2
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

### Estadual (GO)
- Fontes oficiais identificadas (GO): 2 (DETRAN-GO e CETRAN-GO)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 2
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

### Estadual (MA)
- Fontes oficiais identificadas (MA): 2 (DETRAN-MA e CETRAN-MA)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 0
- Fontes bloqueadas/requerendo ação manual: 2 (DETRAN-MA e CETRAN-MA inaccessíveis)
- Fontes pendentes de análise: 0

### Estadual (MG)
- Fontes oficiais identificadas (MG): 2 (DETRAN-MG e CETRAN-MG)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 1
- Fontes bloqueadas/requerendo ação manual: 1 (CETRAN-MG inaccessível)
- Fontes pendentes de análise: 0

### Estadual (MS)
- Fontes oficiais identificadas (MS): 2 (DETRAN-MS e CETRAN-MS)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 2
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

### Estadual (MT)
- Fontes oficiais identificadas (MT): 2 (DETRAN-MT e CETRAN-MT)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 0
- Fontes bloqueadas/requerendo ação manual: 2 (DETRAN-MT e CETRAN-MT inaccessíveis)
- Fontes pendentes de análise: 0

### Estadual (PA)
- Fontes oficiais identificadas (PA): 2 (DETRAN-PA e CETRAN-PA)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 1
- Fontes bloqueadas/requerendo ação manual: 1 (CETRAN-PA inaccessível; DETRAN-PA acesso parcial - apenas raiz do portal SPA)
- Fontes pendentes de análise: 0

### Estadual (PB)
- Fontes oficiais identificadas (PB): 2 (DETRAN-PB e CETRAN-PB)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 2
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

### Estadual (PE)
- Fontes oficiais identificadas (PE): 2 (DETRAN-PE e CETRAN-PE)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 0
- Fontes bloqueadas/requerendo ação manual: 2 (DETRAN-PE bloqueado por Akamai 403; CETRAN-PE inaccessível)
- Fontes pendentes de análise: 0

### Estadual (PI)
- Fontes oficiais identificadas (PI): 2 (DETRAN-PI e CETRAN-PI via portal.pi.gov.br)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 4
- Fontes bloqueadas/requerendo ação manual: 0 (CETRAN-PI sem domínio próprio funcional; conteúdo acessível via portal.pi.gov.br/detran/cetran-pi)
- Fontes pendentes de análise: 0

### Estadual (PR)
- Fontes oficiais identificadas (PR): 2 (DETRAN-PR e CETRAN-PR)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 3
- Fontes bloqueadas/requerendo ação manual: 0
- Fontes pendentes de análise: 0

### Estadual (RJ)
- Fontes oficiais identificadas (RJ): 2 (DETRAN-RJ e CETRAN-RJ)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 3
- Fontes bloqueadas/requerendo ação manual: 0 (CETRAN-RJ em https irresponsivo, mas http funcional)
- Fontes pendentes de análise: 0

### Estadual (RN)
- Fontes oficiais identificadas (RN): 2 (DETRAN-RN e CETRAN-RN)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 0
- Fontes bloqueadas/requerendo ação manual: 2 (DETRAN-RN 503/timeout; CETRAN-RN inaccessível)
- Fontes pendentes de análise: 0

### Estadual (RO)
- Fontes oficiais identificadas (RO): 2 (DETRAN-RO e CETRAN-RO)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 0
- Fontes bloqueadas/requerendo ação manual: 2 (DETRAN-RO e CETRAN-RO inaccessíveis)
- Fontes pendentes de análise: 0

### Estadual (RR)
- Fontes oficiais identificadas (RR): 2 (DETRAN-RR e CETRAN-RR)
- Fontes analisadas: 2
- Documentos coletados com sucesso: 3
- Fontes bloqueadas/requerendo ação manual: 1 (CETRAN-RR inaccessível)
- Fontes pendentes de análise: 0

## Próximos Passos

A primeira rodada nacional está sob controle sequencial.

- Próxima UF: **RS**
- UFs anteriores não devem ser reabertas nesta rodada.
- Complementações serão tratadas em rodada posterior.
- Este documento registra coleta/evidência, não declara cobertura jurídica completa.

## Conclusão

A infraestrutura de coleta funciona e a primeira rodada estadual está em andamento. Os documentos existentes permanecem como evidência de raspagem.

A classificação operacional das UFs foi corrigida para separar:
- **PROCESSADA:** houve execução de coleta/análise;
- **COBERTURA PARCIAL:** existem documentos relevantes, mas a coleta não pretendeu ser exaustiva;
- **SEM COBERTURA VALIDADA:** documentos coletados não demonstram cobertura de trânsito suficiente;
- **BLOQUEADA:** as fontes oficiais não puderam ser acessadas na execução.

O documento da BA sobre Estratégia de Governo Digital permanece preservado, mas foi explicitamente excluído da evidência de cobertura de trânsito.

A partir daqui, a Fase 8 segue em primeira rodada nacional, uma UF por execução, sem complementação das UFs anteriores.
