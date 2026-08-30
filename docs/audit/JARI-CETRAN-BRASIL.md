# Estrutura Recursal Administrativa — JARI e CETRAN no Brasil

> **Documento de Auditoria e Especificação Jurídico-Operacional**
> **Repositório:** `Tokenizaa/AdeusMultas-Defesa-`
> **Data:** 2026-08-29 | **Status:** MAPEAMENTO DE INSTÂNCIAS RECURSAIS

---

## 1. O Sistema Bifásico de Julgamento Administrativo (CTB)

O Código de Trânsito Brasileiro estabelece um sistema de duplo grau de jurisdição administrativa contra a imposição de penalidades de trânsito:

```
                            +-----------------------------+
                            | NOTIFICAÇÃO DE AUTUAÇÃO (NA)|
                            +-----------------------------+
                                           |
                                           v
                            +-----------------------------+
                            |   DEFESA PRÉVIA (Art. 281)  |
                            |   (Autoridade de Trânsito)  |
                            +-----------------------------+
                                           | (Se indeferida)
                                           v
                            +-----------------------------+
                            | NOTIFICAÇÃO PENALIDADE (NP) |
                            +-----------------------------+
                                           |
                                           v
               +-------------------------------------------------------+
               |            1ª INSTÂNCIA ADMINISTRATIVA                |
               |       JARI (Junta Administrativa de Recursos)         |
               |                (Art. 285 do CTB)                      |
               +-------------------------------------------------------+
                                           |
                                           v (Se indeferido)
               +-------------------------------------------------------+
               |            2ª INSTÂNCIA ADMINISTRATIVA (FINAL)        |
               |       CETRAN (Estados) ou CONTRANDIFE (DF)            |
               |       Colegiado Especial JARI (Órgãos Federais)       |
               |              (Arts. 288 e 289 do CTB)                 |
               +-------------------------------------------------------+
```

---

## 2. A 1ª Instância: JARI (Juntas Administrativas de Recursos de Infrações)

### 2.1 Natureza e Composição
- **Natureza Jurídica:** Órgão colegiado com autonomia decisória vinculado ao órgão executivo de trânsito autuador (Art. 16 do CTB).
- **Composição Paritária (Mínimo de 3 membros):**
  1. Presidente indicado pelo Chefe do Poder Executivo;
  2. Representante com notório saber jurídico ou técnico na área de trânsito;
  3. Representante de entidade representativa da sociedade ligada à área de trânsito (ex.: sindicatos de motoristas, associações de classe).
- **Estruturação nas UFs:**
  - Em órgãos de grande porte (ex.: DETRAN-SP, DETRAN-RJ, DETRAN-MG, DETRAN-RS), existem dezenas de comissões/juntas especializadas (JARI Central, JARI Ciretrans, JARI de Habilitação).
  - Em órgãos municipais, a JARI funciona vinculada à Secretaria de Mobilidade ou CET local.
  - Na esfera federal, a PRF e o DNIT possuem JARI Central em Brasília e JARIs Regionais em cada Superintendência Estadual.

### 2.2 Competência e Prazo de Julgamento
- **Competência:** Julgar recursos ordinários interpostos contra penalidades aplicadas pela respectiva autoridade de trânsito.
- **Prazo para Julgamento:** 24 meses como teto para incidência de efeito suspensivo automático do CRLV/CNH (Art. 285, § 3º do CTB e Lei 14.229/2021).
- **Decisões Não Vinculadas:** A JARI tem poder para anular o auto por vício formal, reconhecer decadência/prescrição ou acolher o mérito fático.

---

## 3. A 2ª Instância: CETRAN e CONTRANDIFE

### 3.1 Competência e Estrutura dos CETRANs
- **CETRAN (Conselho Estadual de Trânsito):** Órgão colegiado normativo, consultivo e coordenador do Sistema Nacional de Trânsito no âmbito de cada estado (Art. 14 do CTB).
- **Competência Recursal (Art. 289 do CTB):**
  - Julgar recursos em segunda e última instância administrativa contra penalidades impostas por órgãos executivos **estaduais (DETRAN, DER)** e **municipais (CETs, Secretarias de Trânsito)**.
  - Dirimir conflitos de competência entre órgãos de trânsito no estado.
- **Acórdãos Administrativos:** As decisões do CETRAN são terminativas na via administrativa, encerrando a instância executiva.

### 3.2 O CONTRANDIFE no Distrito Federal
- **DF (Distrito Federal):** Por determinação do Art. 14 do CTB, o DF não possui CETRAN, mas sim o **CONTRANDIFE** (Conselho de Trânsito do Distrito Federal), que acumula as funções normativas e recursais equivalentes.

### 3.3 A 2ª Instância para Órgãos Federais (PRF e DNIT)
- **Atenção Crítica de Arquitetura:**
  - O CETRAN **NÃO** julga recursos contra penalidades aplicadas por órgãos federais (PRF, DNIT, ANTT).
  - Para multas da PRF e DNIT, o recurso de 2ª instância é julgado por **Colegiado Especial da JARI Federal** ou autoridade máxima do órgão em Brasília (Art. 289, I do CTB).

---

## 4. Matriz de Endereçamento de 2ª Instância por UF

| UF | Órgão de 2ª Instância Competente | Sede do Conselho |
| :--- | :--- | :--- |
| **AC** | CETRAN-AC | Rio Branco/AC |
| **AL** | CETRAN-AL | Maceió/AL |
| **AP** | CETRAN-AP | Macapá/AP |
| **AM** | CETRAN-AM | Manaus/AM |
| **BA** | CETRAN-BA | Salvador/BA |
| **CE** | CETRAN-CE | Fortaleza/CE |
| **DF** | **CONTRANDIFE** (Conselho de Trânsito do DF) | Brasília/DF |
| **ES** | CETRAN-ES | Vitória/ES |
| **GO** | CETRAN-GO | Goiânia/GO |
| **MA** | CETRAN-MA | São Luís/MA |
| **MT** | CETRAN-MT | Cuiabá/MT |
| **MS** | CETRAN-MS | Campo Grande/MS |
| **MG** | CETRAN-MG | Belo Horizonte/MG |
| **PA** | CETRAN-PA | Belém/PA |
| **PB** | CETRAN-PB | João Pessoa/PB |
| **PR** | CETRAN-PR | Curitiba/PR |
| **PE** | CETRAN-PE | Recife/PE |
| **PI** | CETRAN-PI | Teresina/PI |
| **RJ** | CETRAN-RJ | Rio de Janeiro/RJ |
| **RN** | CETRAN-RN | Natal/RN |
| **RS** | CETRAN-RS | Porto Alegre/RS |
| **RO** | CETRAN-RO | Porto Velho/RO |
| **RR** | CETRAN-RR | Boa Vista/RR |
| **SC** | CETRAN-SC | Florianópolis/SC |
| **SP** | CETRAN-SP | São Paulo/SP |
| **SE** | CETRAN-SE | Aracaju/SE |
| **TO** | CETRAN-TO | Palmas/TO |
| **FED** | Colegiado Especial JARI Federal (PRF/DNIT) | Brasília/DF |
