# Matriz de Cobertura Nacional — 27 UFs × Procedimentos

> **Documento de Auditoria e Especificação Jurídico-Operacional**
> **Repositório:** `Tokenizaa/AdeusMultas-Defesa-`
> **Data:** 2026-08-29 | **Status:** AUDITORIA EXAUSTIVA DE COBERTURA

---

## 1. Metodologia e Escala de Classificação

Para evitar falsas impressões de suporte, cada combinação de **UF × Procedimento** é classificada em uma das 5 categorias padronizadas:

- `SUPPORTED_REAL`: Procedimento com regras, dados de órgão, instância, canal oficial de protocolo e validação jurídica plenamente implementados no backend e KB.
- `SUPPORTED_PARTIAL`: Procedimento implementado no motor federal de teses e minutas, com órgão registrado, mas sem regras estaduais específicas ou automação de protocolo.
- `CATALOG_ONLY`: Procedimento e órgão existem apenas no seletor da UI (`<option>`), mas `resolveProtocolInfo()` retorna `null` e não há registro na KB.
- `NEEDS_VERIFICATION`: Informação procedural ou canal dependente de validação presencial ou convênio local não publicado abertamente.
- `NOT_APPLICABLE`: Procedimento juridicamente não cabível para a autoridade ou instância.

---

## 2. Matriz Consolidada: 27 UFs × 8 Procedimentos

Os 8 procedimentos avaliados cobrem o ciclo integral da defesa de trânsito brasileira:
1. **DP**: Defesa Prévia (Art. 281 CTB)
2. **RJ**: Recurso Ordinário à JARI (1ª Instância - Art. 285 CTB)
3. **RC**: Recurso ao CETRAN/CONTRANDIFE (2ª Instância - Art. 288/289 CTB)
4. **IC**: Indicação do Real Condutor Infrator (FARI - Art. 257 §§ 7º/8º CTB)
5. **CA**: Conversão em Advertência por Escrito (Art. 267 CTB)
6. **PSDD**: Processo de Suspensão do Direito de Dirigir (Art. 261 CTB)
7. **PCDD**: Processo de Cassação da CNH (Art. 263 CTB)
8. **PPD**: Cassação de Permissão para Dirigir (Art. 148 §§ 3º/4º CTB)

| UF | Órgão Estadual | DP | RJ | RC | IC | CA | PSDD | PCDD | PPD | Status Geral na Plataforma Atual |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **AC** | DETRAN-AC | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **AL** | DETRAN-AL | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **AP** | DETRAN-AP | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **AM** | DETRAN-AM | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **BA** | DETRAN-BA | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **CE** | DETRAN-CE | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **DF** | DETRAN-DF | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **ES** | DETRAN-ES | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **GO** | DETRAN-GO | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **MA** | DETRAN-MA | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **MT** | DETRAN-MT | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **MS** | DETRAN-MS | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **MG** | DETRAN-MG | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | ⚠️ Órgão registrado; falta regra estadual |
| **PA** | DETRAN-PA | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **PB** | DETRAN-PB | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **PR** | DETRAN-PR | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **PE** | DETRAN-PE | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **PI** | DETRAN-PI | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **RJ** | DETRAN-RJ | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | ⚠️ Órgão registrado; falta regra estadual |
| **RN** | DETRAN-RN | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **RS** | DETRAN-RS | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **RO** | DETRAN-RO | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **RR** | DETRAN-RR | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **SC** | DETRAN-SC | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **SP** | DETRAN-SP | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | ⚠️ Órgão + DER + CET; falta regra estadual |
| **SE** | DETRAN-SE | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **TO** | DETRAN-TO | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | `CATALOG_ONLY` | ❌ Sem órgão em `ORGANS_DB` |
| **FED** | PRF / DNIT | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `NOT_APPLICABLE` (vê JARI Esp.) | `SUPPORTED_PARTIAL` | `SUPPORTED_PARTIAL` | `NOT_APPLICABLE` | `NOT_APPLICABLE` | `NOT_APPLICABLE` | ⚠️ Suporte federal em `ORGANS_DB` |

---

## 3. Fichas Técnicas dos 27 Estados (Inventário Operacional)

Abaixo está o levantamento detalhado de cada uma das 27 UFs para subsidiar a expansão da Knowledge Base:

### 1. AC — Acre
- **Órgão Estadual:** Departamento Estadual de Trânsito do Acre (DETRAN-AC)
- **Sede:** Av. Nações Unidas, 2710 - 7º BEC, Rio Branco/AC - CEP 69918-093
- **Portal Oficial:** `https://www.detran.ac.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas do DETRAN-AC (Capital e Regionais).
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Acre (CETRAN-AC), Rio Branco/AC.
- **Canal de Protocolo Eletrônico:** Portal de Serviços do DETRAN-AC / Atendimento Presencial OCA (Organização em Centros de Atendimento).
- **Prazo Padrão:** 30 dias contados da expedição/publicação do edital da Notificação.
- **Status Atual:** `CATALOG_ONLY` (Necessário cadastrar em `ORGANS_DB`).

### 2. AL — Alagoas
- **Órgão Estadual:** Departamento Estadual de Trânsito de Alagoas (DETRAN-AL)
- **Sede:** Av. Menino Marcelo, s/n - Cidade Universitária, Maceió/AL - CEP 57073-470
- **Portal Oficial:** `https://www.detran.al.gov.br`
- **1ª Instância (JARI):** Colegiados da JARI DETRAN-AL.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Alagoas (CETRAN-AL), Maceió/AL.
- **Canal de Protocolo Eletrônico:** Portal DETRAN-AL Serviços / Protocolo Presencial nas Centrais Já!.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 3. AP — Amapá
- **Órgão Estadual:** Departamento Estadual de Trânsito do Amapá (DETRAN-AP)
- **Sede:** Rua Tancredo Neves, 217 - São Lázaro, Macapá/AP - CEP 68908-430
- **Portal Oficial:** `https://www.detran.ap.gov.br`
- **1ª Instância (JARI):** Colegiados JARI do DETRAN-AP.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Amapá (CETRAN-AP), Macapá/AP.
- **Canal de Protocolo:** Sistema Integrado de Atendimento ao Cidadão (Super Fácil Amapá) / Portal DETRAN-AP.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 4. AM — Amazonas
- **Órgão Estadual:** Departamento Estadual de Trânsito do Amazonas (DETRAN-AM)
- **Sede:** Av. Mário Ypiranga Monteiro, 2884 - Parque 10 de Novembro, Manaus/AM - CEP 69050-030
- **Portal Oficial:** `https://www.detran.am.gov.br`
- **1ª Instância (JARI):** Comissões Julgadoras JARI DETRAN-AM.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Amazonas (CETRAN-AM), Manaus/AM.
- **Canal de Protocolo:** Portal de Serviços DETRAN-AM Digital / Pronto Atendimento ao Cidadão (PAC).
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 5. BA — Bahia
- **Órgão Estadual:** Departamento Estadual de Trânsito da Bahia (DETRAN-BA)
- **Sede:** Av. Antônio Carlos Magalhães, 7744 - Pernambués, Salvador/BA - CEP 41110-700
- **Portal Oficial:** `https://www.detran.ba.gov.br`
- **1ª Instância (JARI):** JARI Central DETRAN-BA e Ciretrans do Interior.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito da Bahia (CETRAN-BA), Salvador/BA.
- **Canal de Protocolo:** Plataforma `ba.gov.br` (antigo SAC Digital) / Presencial nos postos SAC.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 6. CE — Ceará
- **Órgão Estadual:** Departamento Estadual de Trânsito do Ceará (DETRAN-CE)
- **Sede:** Av. Godofredo Maciel, 2900 - Maraponga, Fortaleza/CE - CEP 60710-903
- **Portal Oficial:** `https://www.detran.ce.gov.br`
- **1ª Instância (JARI):** JARI DETRAN-CE.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Ceará (CETRAN-CE), Fortaleza/CE.
- **Canal de Protocolo:** Central de Serviços "Meu DETRAN-CE" / Unidades Vapt Vupt e Casas do Cidadão.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 7. DF — Distrito Federal
- **Órgão Estadual:** Departamento de Trânsito do Distrito Federal (DETRAN-DF)
- **Sede:** SAM Lote A Bloco B - Edifício Sede do DETRAN-DF, Brasília/DF - CEP 70620-000
- **Portal Oficial:** `https://www.detran.df.gov.br`
- **1ª Instância (JARI):** Comissões da JARI DETRAN-DF.
- **2ª Instância (CONTRANDIFE):** Conselho de Trânsito do Distrito Federal (CONTRANDIFE - equivalente ao CETRAN no DF, conforme Art. 14 do CTB).
- **Canal de Protocolo:** Portal de Serviços DETRAN-DF Eletrônico / Postos Na Hora.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 8. ES — Espírito Santo
- **Órgão Estadual:** Departamento Estadual de Trânsito do Espírito Santo (DETRAN-ES)
- **Sede:** Av. Fernando Ferrari, 1080 - Ed. América Centro Empresarial, Torre Ayrton Senna, Mata da Praia, Vitória/ES - CEP 29066-380
- **Portal Oficial:** `https://www.detran.es.gov.br`
- **1ª Instância (JARI):** Comissões JARI DETRAN-ES.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Espírito Santo (CETRAN-ES), Vitória/ES.
- **Canal de Protocolo:** Portal Acesso Cidadão ES (`acessocidadao.es.gov.br`) / Faça Fácil Cariacica.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 9. GO — Goiás
- **Órgão Estadual:** Departamento Estadual de Trânsito de Goiás (DETRAN-GO)
- **Sede:** Av. Atílio Corrêa Lima, s/n - Cidade Jardim, Goiânia/GO - CEP 74425-030
- **Portal Oficial:** `https://www.detran.go.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas do DETRAN-GO.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Goiás (CETRAN-GO), Goiânia/GO.
- **Canal de Protocolo:** Portal Expresso Goiás (`expresso.go.gov.br`) / Unidades Vapt Vupt.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 10. MA — Maranhão
- **Órgão Estadual:** Departamento Estadual de Trânsito do Maranhão (DETRAN-MA)
- **Sede:** Av. dos Franceses, s/n - Vila Palmeira, São Luís/MA - CEP 65036-284
- **Portal Oficial:** `https://www.detran.ma.gov.br`
- **1ª Instância (JARI):** JARI DETRAN-MA.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Maranhão (CETRAN-MA), São Luís/MA.
- **Canal de Protocolo:** Portal de Serviços DETRAN-MA / Unidades Viva/PROCON Maranhão.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 11. MT — Mato Grosso
- **Órgão Estadual:** Departamento Estadual de Trânsito de Mato Grosso (DETRAN-MT)
- **Sede:** Av. Doutor Hélio Ribeiro, 1000 - Paiaguás, Cuiabá/MT - CEP 78048-910
- **Portal Oficial:** `https://www.detran.mt.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas do DETRAN-MT.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Mato Grosso (CETRAN-MT), Cuiabá/MT.
- **Canal de Protocolo:** Aplicativo e Portal MT Cidadão / Ganha Tempo MT.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 12. MS — Mato Grosso do Sul
- **Órgão Estadual:** Departamento Estadual de Trânsito de Mato Grosso do Sul (DETRAN-MS)
- **Sede:** Rodovia MS-080, Km 10, s/n - Conjunto José Abrão, Campo Grande/MS - CEP 79114-901
- **Portal Oficial:** `https://www.detran.ms.gov.br`
- **1ª Instância (JARI):** JARI DETRAN-MS.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Mato Grosso do Sul (CETRAN-MS), Campo Grande/MS.
- **Canal de Protocolo:** Portal Meu DETRAN-MS (`meudetran.ms.gov.br`) / Postos Prático.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 13. MG — Minas Gerais
- **Órgão Estadual:** Coordenadoria Estadual de Gestão de Trânsito (CET-MG / Antigo DETRAN-MG, vinculado à SEPLAG-MG pela Lei Estadual 24.313/2023)
- **Sede:** Rodovia Papa João Paulo II, 4001 - Edifício Gerais, Cidade Administrativa, Belo Horizonte/MG - CEP 31630-901
- **Portal Oficial:** `https://transito.mg.gov.br` (antigo `detran.mg.gov.br`)
- **1ª Instância (JARI):** Colegiados JARI da CET-MG / Polícia Civil.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Minas Gerais (CETRAN-MG), Belo Horizonte/MG.
- **Canal de Protocolo:** Portal Trânsito MG / Unidades de Atendimento Integrado (UAI).
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `SUPPORTED_PARTIAL` (Possui cadastro em `ORGANS_DB`, mas requer atualização da migração SEPLAG/CET-MG).

### 14. PA — Pará
- **Órgão Estadual:** Departamento de Trânsito do Estado do Pará (DETRAN-PA)
- **Sede:** Av. Augusto Montenegro, Km 03, s/n - Mangueirão, Belém/PA - CEP 66640-000
- **Portal Oficial:** `https://www.detran.pa.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas JARI DETRAN-PA.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Pará (CETRAN-PA), Belém/PA.
- **Canal de Protocolo:** Portal de Serviços DETRAN-PA / Estações Cidadania.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 15. PB — Paraíba
- **Órgão Estadual:** Departamento Estadual de Trânsito da Paraíba (DETRAN-PB)
- **Sede:** Rua Emília Batista Celane, s/n - Mangabeira VII, João Pessoa/PB - CEP 58058-280
- **Portal Oficial:** `https://www.detran.pb.gov.br`
- **1ª Instância (JARI):** Comissões JARI DETRAN-PB.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito da Paraíba (CETRAN-PB), João Pessoa/PB.
- **Canal de Protocolo:** Portal DETRAN-PB Serviços Online / Casas da Cidadania.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 16. PR — Paraná
- **Órgão Estadual:** Departamento de Trânsito do Paraná (DETRAN-PR)
- **Sede:** Av. Victor Ferreira do Amaral, 2940 - Capão da Imbuia, Curitiba/PR - CEP 82800-900
- **Portal Oficial:** `https://www.detran.pr.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas de Recursos de Infrações do DETRAN-PR.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Paraná (CETRAN-PR), Curitiba/PR.
- **Canal de Protocolo:** Portal DETRAN Inteligente / Plataforma PIÁ (`pia.pr.gov.br`).
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 17. PE — Pernambuco
- **Órgão Estadual:** Departamento Estadual de Trânsito de Pernambuco (DETRAN-PE)
- **Sede:** Estrada do Barbalho, 889 - Iputinga, Recife/PE - CEP 50690-900
- **Portal Oficial:** `https://www.detran.pe.gov.br`
- **1ª Instância (JARI):** JARI Central DETRAN-PE e Regionais.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Pernambuco (CETRAN-PE), Recife/PE.
- **Canal de Protocolo:** Portal de Serviços DETRAN-PE / Unidades Expresso Cidadão.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 18. PI — Piauí
- **Órgão Estadual:** Departamento Estadual de Trânsito do Piauí (DETRAN-PI)
- **Sede:** Av. Gil Martins, 2000 - Redenção, Teresina/PI - CEP 64017-800
- **Portal Oficial:** `https://www.detran.pi.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas do DETRAN-PI.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Piauí (CETRAN-PI), Teresina/PI.
- **Canal de Protocolo:** Portal DETRAN-PI Digital / Espaço Cidadania PI.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 19. RJ — Rio de Janeiro
- **Órgão Estadual:** Departamento de Trânsito do Estado do Rio de Janeiro (DETRAN-RJ)
- **Sede:** Av. Presidente Vargas, 817 - Centro, Rio de Janeiro/RJ - CEP 20071-004
- **Portal Oficial:** `https://www.detran.rj.gov.br`
- **1ª Instância (JARI):** Comissões de Julgamento da JARI DETRAN-RJ.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Rio de Janeiro (CETRAN-RJ), Rio de Janeiro/RJ.
- **Canal de Protocolo:** Posto Digital DETRAN-RJ (`postodigital.detran.rj.gov.br`) / Protocolo Geral Sede e Ciretrans.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `SUPPORTED_PARTIAL` (Possui cadastro em `ORGANS_DB`, mas requer complementação de regras).

### 20. RN — Rio Grande do Norte
- **Órgão Estadual:** Departamento Estadual de Trânsito do Rio Grande do Norte (DETRAN-RN)
- **Sede:** Av. Perimetral Leste, 113 - Cidade da Esperança, Natal/RN - CEP 59070-600
- **Portal Oficial:** `https://www.detran.rn.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas de Recursos JARI DETRAN-RN.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Rio Grande do Norte (CETRAN-RN), Natal/RN.
- **Canal de Protocolo:** Portal de Serviços do DETRAN-RN / Centrais Cidadão.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 21. RS — Rio Grande do Sul
- **Órgão Estadual:** Departamento Estadual de Trânsito do Rio Grande do Sul (DETRAN-RS)
- **Sede:** Rua Voluntários da Pátria, 1358 - Centro Histórico, Porto Alegre/RS - CEP 90230-010
- **Portal Oficial:** `https://www.detran.rs.gov.br`
- **1ª Instância (JARI):** Colegiados JARI do DETRAN-RS.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Rio Grande do Sul (CETRAN-RS), Porto Alegre/RS.
- **Canal de Protocolo:** Central de Serviços DETRAN-RS (`centraldeservicos.detran.rs.gov.br`) / Postos TudoFácil.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 22. RO — Rondônia
- **Órgão Estadual:** Departamento Estadual de Trânsito de Rondônia (DETRAN-RO)
- **Sede:** Rua Miguel Chakian, 2121 - Embratel, Porto Velho/RO - CEP 76820-802
- **Portal Oficial:** `https://www.detran.ro.gov.br`
- **1ª Instância (JARI):** Comissões JARI DETRAN-RO.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Rondônia (CETRAN-RO), Porto Velho/RO.
- **Canal de Protocolo:** Portal DETRAN-RO Digital / Unidades Tudo Aqui RO.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 23. RR — Roraima
- **Órgão Estadual:** Departamento Estadual de Trânsito de Roraima (DETRAN-RR)
- **Sede:** Av. Brigadeiro Eduardo Gomes, 4214 - Aeroporto, Boa Vista/RR - CEP 69310-005
- **Portal Oficial:** `https://www.detran.rr.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas JARI DETRAN-RR.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Roraima (CETRAN-RR), Boa Vista/RR.
- **Canal de Protocolo:** Portal de Serviços DETRAN-RR / Protocolo Central.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 24. SC — Santa Catarina
- **Órgão Estadual:** Departamento Estadual de Trânsito de Santa Catarina (DETRAN-SC)
- **Sede:** Rua Ursulina de Senna Castro, 226 - Estreito, Florianópolis/SC - CEP 88070-290
- **Portal Oficial:** `https://www.detran.sc.gov.br`
- **1ª Instância (JARI):** Juntas Administrativas do DETRAN-SC.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Santa Catarina (CETRAN-SC), Florianópolis/SC.
- **Canal de Protocolo:** Portal Detran Digital SC (`servicos.detran.sc.gov.br`) / Protocolo Ciretrans.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 25. SP — São Paulo
- **Órgão Estadual:** Departamento Estadual de Trânsito de São Paulo (DETRAN-SP)
- **Sede:** Rua Boa Vista, 209 - Centro Histórico, São Paulo/SP - CEP 01014-001
- **Portal Oficial:** `https://www.detran.sp.gov.br`
- **1ª Instância (JARI):** JARI Central do DETRAN-SP e JARI descentralizadas nas Ciretrans.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de São Paulo (CETRAN-SP), Av. do Estado, 777 - Ponte Pequena, São Paulo/SP.
- **Canal de Protocolo:** Portal de Serviços do DETRAN-SP / Portal Poupatempo (`poupatempo.sp.gov.br`).
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `SUPPORTED_PARTIAL`.

### 26. SE — Sergipe
- **Órgão Estadual:** Departamento Estadual de Trânsito de Sergipe (DETRAN-SE)
- **Sede:** Av. Engenheiro Gentil Tavares, 1385 - Getúlio Vargas, Aracaju/SE - CEP 49055-260
- **Portal Oficial:** `https://www.detran.se.gov.br`
- **1ª Instância (JARI):** JARI DETRAN-SE.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito de Sergipe (CETRAN-SE), Aracaju/SE.
- **Canal de Protocolo:** Portal de Autoatendimento DETRAN-SE (`detran.se.gov.br/portal`) / Postos CEAC.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.

### 27. TO — Tocantins
- **Órgão Estadual:** Departamento Estadual de Trânsito do Tocantins (DETRAN-TO)
- **Sede:** Quadra 401 Norte, Av. NS 01, Lote 01 a 10 - Plano Diretor Norte, Palmas/TO - CEP 77006-440
- **Portal Oficial:** `https://www.detran.to.gov.br`
- **1ª Instância (JARI):** Comissões JARI DETRAN-TO.
- **2ª Instância (CETRAN):** Conselho Estadual de Trânsito do Tocantins (CETRAN-TO), Palmas/TO.
- **Canal de Protocolo:** Portal DETRAN-TO Serviços / Unidades É Pra Já Tocantins.
- **Prazo Padrão:** 30 dias.
- **Status Atual:** `CATALOG_ONLY`.
