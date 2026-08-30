# Auditoria Nacional Brasil — Investigação de Cobertura Jurídico-Operacional (27 UFs)

> **Auditoria Completa & Blueprint Técnico-Jurídico**
> **Repositório:** `Tokenizaa/AdeusMultas-Defesa-`
> **Data:** 2026-08-29 | **Status:** AUDITORIA EXAUSTIVA CONCLUÍDA

---

## 1. Sumário Executivo e Veredito

### 1.1 Veredito Geral da Plataforma: `PARTIALLY_NATIONAL` (Catálogo Amplo × Backend Regionalizado)

A auditoria exaustiva realizada em todas as camadas da plataforma (UI, Banco de Conhecimento, Motor de Regras, RAG, Montagem de Documentos e Módulos de Protocolo) confirmou o diagnóstico:

1. **A interface do usuário declara cobertura em 54 órgãos de trânsito em todo o Brasil** (27 DETRANs, 8 DERs, 10 CETs/Órgãos Municipais, 4 Federais e 5 Especiais).
2. **O backend e a Knowledge Base registram apenas 7 órgãos autuadores:**
   - 3 DETRANs Estaduais: `DETRAN-SP`, `DETRAN-RJ`, `DETRAN-MG`
   - 2 Órgãos Federais: `PRF`, `DNIT`
   - 2 Órgãos de São Paulo: `CET-SP / DSV`, `DER-SP`
3. **24 das 27 UFs operam sob status `CATALOG_ONLY`:**
   - O usuário consegue selecionar a UF no formulário de onboarding;
   - O motor processa a análise e a minuta utilizando as **teses e regras do Direito Federal (CTB, Resoluções CONTRAN)**;
   - O resolvedor de protocolo (`resolveProtocolInfo()`) retorna `null`, deixando o usuário sem instruções formais de envio, endereço da JARI ou URL do portal local.
4. **Ausência de Fabricação Indevida (Comportamento Honesto):** O sistema **não** inventa portais falsos e **não** redireciona o usuário de outro estado para o DETRAN-SP. A ausência de dados resulta honestamente em `null`.

---

## 2. Respostas Objetivas às 18 Questões Fundamentais

### 1. A plataforma realmente suporta as 27 UFs?
**NÃO.** A plataforma possui capacidade de gerar argumentos jurídicos federais para as 27 UFs, mas **não possui infraestrutura operacional de protocolo nem regras locais cadastradas para 24 UFs**.

### 2. Quais DETRANs estão realmente cadastrados?
Apenas **3 DETRANs:** `DETRAN-SP` (126000), `DETRAN-RJ` (119000) e `DETRAN-MG` (113000). 24 DETRANs estão ausentes de `ORGANS_DB`.

### 3. Quais órgãos autuadores estão cadastrados?
Exatamente **7 órgãos:** `DETRAN-SP`, `DETRAN-RJ`, `DETRAN-MG`, `PRF`, `DNIT`, `CET-SP / DSV`, `DER-SP`.

### 4. Quais JARIs estão cobertas?
Estão cobertas as JARIs vinculadas aos 7 órgãos cadastrados (JARI DETRAN-SP, JARI DETRAN-RJ, JARI DETRAN-MG, JARI Nacional/Regional PRF, JARI Especial DNIT, JARI DSV/CET-SP e JARI DER-SP).

### 5. Quais CETRANs estão cobertos?
Formalmente apenas o `CETRAN-SP` e `CETRAN-RJ` possuem endereçamento configurado em templates. O `CONTRANDIFE` (DF) e os 25 CETRANs estaduais restantes não possuem cadastro ativo.

### 6. Quais procedimentos funcionam em cada UF?
Para SP, RJ e MG, os 8 procedimentos (Defesa Prévia, JARI, CETRAN, Indicação de Condutor, Advertência, PSDD, PCDD e PPD) funcionam com geração de minuta e instrução de envio. Para as outras 24 UFs, a minuta é gerada com base no CTB federal, mas sem dados de protocolo.

### 7. Quais prazos variam por UF?
Os **prazos legais não variam por UF** (são fixados pelo CTB em no mínimo 30 dias para NA, NP, JARI e CETRAN). O que varia são os **prazos internos de tramitação regimental** e o tempo de notificação por edital em diários oficiais estaduais.

### 8. Quais regras estaduais existem?
Existem portarias de processo de suspensão e cassação (ex.: Portaria 101/16 DETRAN-SP, Portaria 5.820/20 DETRAN-RJ, Lei Estadual 24.313/23 MG), regras de cursos de reciclagem preventivos para motoristas EAR e deliberações de admissibilidade dos CETRANs.

### 9. Quais regras são exclusivamente federais?
Todo o direito material infracional (Art. 161 a 255 do CTB), a dosimetria de pontuação, as regras de conversão em advertência (Art. 267), a aferição metrológica de radares (Res. CONTRAN 798/20 e INMETRO) e o procedimento geral de recurso (Res. CONTRAN 900/22).

### 10. Quais portais oficiais devem ser utilizados?
Os 27 portais oficiais catalogados no documento `docs/audit/PROTOCOLOS-27-UF.md` (ex.: Detran Digital SC, Expresso Goiás, PIÁ Paraná, Posto Digital RJ, Poupatempo SP, ba.gov.br, etc.).

### 11. Quais endereços são necessários?
Os endereços postais das sedes dos 27 DETRANs, sedes dos CETRANs/CONTRANDIFE e Superintendências Regionais da PRF/DNIT.

### 12. Quais documentos variam por estado?
A documentação substantiva é uniforme (CNH, CRLV, Notificação e Petição). A variação reside na exigência de comprovante de residência recente (alguns DETRANs exigem até 90 dias) e autenticação de firma/biometria GOV.BR.

### 13. Quais órgãos oferecidos pela UI ainda não possuem backend?
47 dos 54 órgãos listados no dropdown de `InfractionIdentificationStep.tsx` (incluindo 24 DETRANs, 7 DERs e 9 CETs municipais).

### 14. Onde existe falsa aparência de cobertura nacional?
No seletor de órgãos autuadores do onboarding e na mensagem de apresentação da landing page ("Atendemos todo o Brasil"), pois o usuário do AC, AM, RS, etc., consegue selecionar seu estado mas não obtém dados de protocolo.

### 15. Quais entidades precisam existir na Knowledge Base?
Devem ser criadas as seguintes entidades estruturadas:
- `KnowledgeState`: Cadastro das 27 UFs com dados institucionais.
- `KnowledgeOrgan`: Registro normalizado de todos os órgãos (DETRANs, DERs, CETs).
- `KnowledgeJari`: Estrutura de juntas de julgamento e colegiados.
- `KnowledgeCetran`: Dados do conselho de 2ª instância e CONTRANDIFE.
- `KnowledgeStateRule`: Regras administrativas e portarias locais.
- `KnowledgeProtocolChannel`: Portais digitais, endereços postais e requisitos de login.

### 16. Quais informações precisam ser mantidas por vigência/data?
- Resoluções do CONTRAN e Deliberações do CETRAN.
- Tabelas de feriados estaduais e municipais (para contagem de prazos em dias úteis/corridos).
- Prazos de validade de laudos de aferição de radares pelo INMETRO (12 meses).

### 17. Quais casos precisam de tratamento especial?
- **Distrito Federal (DF):** Não possui CETRAN nem DER estadual; possui CONTRANDIFE e DER-DF acumulando competências municipais e estaduais.
- **Minas Gerais (MG):** Transição institucional do DETRAN da Polícia Civil para a SEPLAG/CET-MG.
- **Multas Federais (PRF/DNIT):** Não admitem recurso ao CETRAN; a 2ª instância ocorre perante Colegiado Especial da JARI Federal.

### 18. Qual é a matriz final de cobertura real?
Consolidada no documento `docs/audit/MATRIZ-COBERTURA-27-UF.md`.

---

## 3. Blueprint Arquitetural para Expansão da Knowledge Base

```typescript
// Especificação de Schema para a Fase de Implementação

export interface KnowledgeState {
  uf: string; // 'AC' .. 'TO'
  name: string; // 'Acre' .. 'Tocantins'
  region: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
  capital: string;
  detranId: string;
  cetranId: string;
  officialGovernmentPortal: string;
}

export interface KnowledgeOrganExtended {
  id: string; // 'DETRAN_AM'
  senatranCode?: string;
  abbreviation: string; // 'DETRAN-AM'
  name: string;
  sphere: 'federal' | 'estadual' | 'distrital' | 'municipal';
  state: string; // 'AM'
  onlinePortalUrl: string;
  physicalAddress: string;
  emailContact?: string;
  standardDeadlineDays: number; // 30
  jariStructure: string;
  protocolChannels: {
    digitalPortalUrl?: string;
    mobileAppName?: string;
    postalAddress?: string;
    presencialNetworkName?: string; // 'Pronto Atendimento ao Cidadão (PAC)'
    govBrAuthenticationRequired: boolean;
  };
}

export interface KnowledgeCetranExtended {
  id: string; // 'CETRAN_BA'
  uf: string;
  name: string; // 'Conselho Estadual de Trânsito da Bahia'
  address: string;
  portalUrl: string;
  isContrandife: boolean;
}
```

---

## 4. Documentos de Referência da Auditoria

1. `docs/audit/MATRIZ-COBERTURA-27-UF.md` — Matriz 27 UFs × 8 Procedimentos.
2. `docs/audit/REGRAS-ESTADUAIS-27-UF.md` — Separação Direito Federal × Direito Estadual.
3. `docs/audit/PROTOCOLOS-27-UF.md` — Diretório Oficial de Portais e Protocolos.
4. `docs/audit/ORGAOS-AUTUADORES-BRASIL.md` — Catálogo de Órgãos Autuadores e Discrepâncias UI.
5. `docs/audit/JARI-CETRAN-BRASIL.md` — Estrutura Recursal JARI, CETRAN e CONTRANDIFE.
