# Regras Estaduais de Trânsito — Investigação Jurídica das 27 UFs

> **Documento de Auditoria e Especificação Jurídico-Operacional**
> **Repositório:** `Tokenizaa/AdeusMultas-Defesa-`
> **Data:** 2026-08-29 | **Status:** MAPEAMENTO JURÍDICO NACIONAL

---

## 1. A Separação Arquitetural Tripartite Obrigatória

Para erradicar a mistura entre leis federais substantivas, normas regimentais estaduais e canais operacionais de protocolo, a arquitetura jurídica da plataforma deve obedecer estritamente à divisão em 3 camadas independentes:

```
+-------------------------------------------------------------------------+
| CAMADA 1 — DIREITO FEDERAL MATERIAL & PROCESSUAL GERAL                   |
| CTB (Lei 9.503/97), Resoluções CONTRAN, Portarias SENATRAN, MBFT,       |
| Metrologia INMETRO, CF/88, Súmulas STJ/STF.                             |
| (Comum a todas as 27 UFs — 100% reutilizável)                           |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| CAMADA 2 — DIREITO ADMINISTRATIVO & REGULAMENTAÇÃO ESTADUAL             |
| Decretos Estaduais, Portarias DETRAN, Deliberações/Resoluções CETRAN,   |
| Regimentos Internos JARI, Regras de Tramitação de PSDD/PCDD.            |
| (Específico de cada UF — sobrepõe ou complementa a regra federal)        |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| CAMADA 3 — DADOS OPERACIONAIS & CANAIS DE PROTOCOLO                      |
| Portais Digitais, Sistemas de Autoatendimento, Ciretrans,               |
| Integração SNE/CDT, Endereços Físicos, Formatos e Autenticação.         |
| (Dados mutáveis e dinâmicos por órgão/município)                         |
+-------------------------------------------------------------------------+
```

---

## 2. Camada 1: Núcleo Jurídico Federal (Invariante Nacional)

As seguintes regras são imutáveis por lei estadual (competência privativa da União - Art. 22, XI da CF/88):

1. **Tipicidade Infracional e Valores de Multas:** Definidos exclusivamente pelos Arts. 161 a 255 do CTB e Resoluções CONTRAN.
2. **Prazos Decadenciais de Notificação:**
   - Expedição da Notificação de Autuação (NA): **30 dias improrrogáveis** (Art. 281, II do CTB e Súmula 312 do STJ).
   - Prazo para Defesa Prévia e Indicação de Condutor: **Mínimo de 30 dias** fixado pelo órgão autuador (Art. 281-A e Art. 257, § 7º do CTB com redação da Lei 14.071/2020).
   - Expedição da Notificação de Penalidade (NP): **180 dias** (ou 360 dias se houver defesa prévia tempestiva), sob pena de decadência do direito de punir (Art. 282, §§ 6º e 7º do CTB).
3. **Conversão Vinculada em Advertência por Escrito:** Para infrações leves ou médias se o condutor não tiver cometido nenhuma outra infração nos últimos 12 meses (Art. 267 do CTB alterado pela Lei 14.071/2020).
4. **Graduação do Processo de Suspensão (PSDD):** Limites escalonados de 20, 30 e 40 pontos no período de 12 meses, com garantia de 40 pontos irrestritos para condutores com EAR (Art. 261 do CTB).
5. **Efeito Suspensivo Ex Lege dos Recursos:** Concedido automaticamente se o recurso à JARI ou CETRAN não for julgado em até 24 meses (Art. 285, § 3º e Art. 289-A do CTB, incluídos pela Lei 14.229/2021).

---

## 3. Camada 2: Regras e Particularidades Estaduais Mapeadas (27 UFs)

Abaixo estão detalhadas as regulamentações administrativas, portarias e deliberações estaduais que impactam a tramitação de processos:

### 1. SP — São Paulo
- **Normas Principais:** Portaria DETRAN-SP nº 101/2016 (Processo de Suspensão e Cassação), Deliberação CETRAN-SP nº 01/2021, Instruções Normativas do DSV/CET-SP.
- **PSDD / PCDD:** O DETRAN-SP adota procedimento eletrônico centralizado via Diretoria de Habilitação com notificação por Diário Oficial do Estado (DOE) quando frustrada a via postal. O condutor pode optar pelo curso de reciclagem preventivo se possuir EAR com 30 a 39 pontos.
- **Indicação de Condutor:** Aceita via aplicativo Carteira Digital de Trânsito (CDT) para autuações do DETRAN-SP, DER-SP e CET-SP, e via portal Poupatempo com biometria facial GOV.BR.
- **CETRAN-SP:** 2ª Instância com sede na Av. do Estado, 777. Julga recursos contra decisões de indeferimento de JARI de todos os órgãos municipais e estaduais paulistas.

### 2. RJ — Rio de Janeiro
- **Normas Principais:** Portaria DETRAN-RJ nº 5.820/2020 (Processo de Suspensão e Cassação), Deliberação CETRAN-RJ nº 245/2018.
- **PSDD / PCDD:** Julgado pelas Comissões Especiais de Julgamento de Habilitação do DETRAN-RJ. Publicação das notificações ocorre no Diário Oficial do Estado do Rio de Janeiro (DOERJ).
- **Indicação de Condutor:** Protocolo via "Posto Digital DETRAN-RJ" exige conta GOV.BR Prata ou Ouro. Para pessoas jurídicas, exige assinatura digital ICP-Brasil.
- **CETRAN-RJ:** Colegiado estadual no Centro do Rio. Exige juntada obrigatória da cópia da decisão denegatória da JARI.

### 3. MG — Minas Gerais
- **Normas Principais:** Lei Estadual nº 24.313/2023 (Transferência das competências de trânsito da Polícia Civil para a SEPLAG - Coordenadoria Estadual de Gestão de Trânsito - CET-MG), Resoluções CETRAN-MG nº 03/2022.
- **Transição Institucional:** Migração em curso da Polícia Civil para a SEPLAG/CET-MG. Sistemas migraram do domínio `detran.mg.gov.br` para `transito.mg.gov.br`.
- **PSDD / PCDD:** Comissões de Habilitação da CET-MG julgam na Cidade Administrativa. Processos antigos continuam com registros nos livros da Polícia Civil.
- **Indicação de Condutor:** Protocolo digital disponível no novo portal Trânsito MG e presencial nas Unidades de Atendimento Integrado (UAI).

### 4. PR — Paraná
- **Normas Principais:** Portaria DETRAN-PR nº 212/2021, Deliberações do CETRAN-PR.
- **Particularidade de Protocolo:** Integração avançada com o portal PIÁ (Paraná Inteligência Artificial) e aplicativo Detran Inteligente PR.
- **PSDD:** Notificação integrada com o sistema Notifica PR e Diário Oficial Executivo do Paraná.

### 5. RS — Rio Grande do Sul
- **Normas Principais:** Portarias DETRAN-RS nº 140/2019 e 250/2022, Resoluções do CETRAN-RS.
- **Central de Serviços DETRAN-RS:** Exige cadastro no Login Cidadão RS / GOV.BR.
- **Processos de Habilitação:** Abertura de PSDD centralizada na Divisão de Infrações do DETRAN-RS em Porto Alegre. Apresentação de defesa via Centros de Formação de Condutores (CFCs) credenciados ou portal.

### 6. SC — Santa Catarina
- **Normas Principais:** Lei Complementar Estadual nº 741/2019, Portarias DETRAN-SC nº 380/2020, Deliberações CETRAN-SC.
- **Detran Digital SC:** Protocolo 100% eletrônico integrado ao SGPE (Sistema de Gestão de Processos Eletrônicos do Estado de SC).

### 7. BA — Bahia
- **Normas Principais:** Portarias DETRAN-BA nº 88/2021, Regimento Interno CETRAN-BA.
- **Plataforma ba.gov.br:** Unificação dos serviços estaduais. Para autuações da TRANSALVADOR, o protocolo deve ser feito diretamente no portal da autarquia municipal ou nos balcões do SAC.

### 8. CE — Ceará
- **Normas Principais:** Portarias DETRAN-CE nº 45/2022, Deliberações CETRAN-CE.
- **Meu DETRAN-CE:** Serviços digitais para defesa prévia e recursos de multas do órgão estadual. Autuações da AMC Fortaleza possuem portal próprio (`amctransito.com.br`).

### 9. PE — Pernambuco
- **Normas Principais:** Portaria DETRAN-PE nº 1.200/2020, Deliberações CETRAN-PE.
- **Expresso Cidadão:** Rede física de protocolo. Autuações da CTTU Recife tramitam em comissões municipais próprias.

### 10. GO — Goiás
- **Normas Principais:** Portaria DETRAN-GO nº 340/2021, Deliberações CETRAN-GO.
- **Expresso Goiás:** Central estadual de serviços com tramitação eletrônica obrigatória para defesas de autuações do DETRAN-GO e GOINFRA.

### 11. DF — Distrito Federal
- **Normas Principais:** Instruções Normativas DETRAN-DF nº 12/2021 e nº 55/2023, Regimento do CONTRANDIFE.
- **Particularidade Constitucional:** O Distrito Federal acumula competências estaduais e municipais (Art. 32, § 1º da CF/88). A 2ª Instância é exercida pelo **CONTRANDIFE** (Conselho de Trânsito do Distrito Federal), e não por um CETRAN.
- **Órgãos Concorrentes:** DETRAN-DF (vias urbanas distritais), DER-DF (rodovias distritais DF-xxx), SEMOB-DF (transporte público), PRF e DNIT (rodovias federais no DF).

### 12. Demais UFs (ES, MT, MS, MA, PA, PB, PI, RN, RO, RR, SE, TO, AC, AL, AP, AM)
- **Regras Operacionais Gerais:**
  - Todas as 27 UFs devem observar estritamente a Resolução CONTRAN nº 900/2022 (Padrão de Recursos e Defesas) e Resolução CONTRAN nº 723/2018 (Processos de Suspensão e Cassação).
  - Prazos regimentais para julgamento da JARI e do CETRAN não podem exceder os limites federais sob pena de prescrição da pretensão punitiva/executória (Lei 9.873/99 e Art. 285 § 3º CTB).
  - Cada DETRAN possui um portal de serviços e comissões julgadoras próprias.

---

## 4. Análise de Variação de Prazos e Documentos por Estado

| Item | Variação por Estado? | Justificativa Jurídica |
| :--- | :---: | :--- |
| **Prazo de Defesa Prévia** | NÃO (Mín. 30d) | Fixado pelo Art. 281-A do CTB em 30 dias contados da notificação. |
| **Prazo de Recurso JARI** | NÃO (Mín. 30d) | Fixado pelo Art. 285 do CTB na data de vencimento da penalidade. |
| **Prazo de Recurso CETRAN** | NÃO (30d) | Fixado pelo Art. 288 do CTB em 30 dias contados da notificação da JARI. |
| **Documentos Básicos** | NÃO | CNH, CRLV, Notificação e Petição são exigidos uniformemente pela Res. CONTRAN 900/2022. |
| **Canal de Envio / Portal** | **SIM** | Cada estado adota portal de governo próprio ou sistema proprietário. |
| **Comprovante de Endereço** | **SIM** | Alguns DETRANs exigem comprovante recente (máx. 90 dias) no nome do condutor. |
| **Autenticação de Assinatura** | **SIM** | Alguns órgãos exigem GOV.BR nível Prata/Ouro ou reconhecimento de firma presencial se enviado por correio. |
