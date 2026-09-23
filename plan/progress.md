# FASE 8 — Coleta e Inventário Documental Oficial — 2026-09-23

## Resultado

**PARCIAL AVANÇADO — coleta federal concluída com 100% de sucesso e coleta estadual iniciada com AC (Acre), com documentos iniciais coletados.**

Foram coletados com sucesso todos os documentos oficiais federais acessíveis diretamente via HTTP:
- Código de Trânsito Brasileiro (CTB) compilado (HTML e PDF) do Planalto.
- Portal de multas e defesas do DNIT.
- Portal de multas e defesas da PRF.
- Portal de multas e defesas da ANTT.
- Consulta de radares e cronotacógrafos do INMETRO.
- Diário Oficial da União (DOU).
- Jurisprudência em teses do STJ.
- Resoluções do CONTRAN (página compilada e resolução individual exemplar).

No estado do Acre (AC), foram coletados documentos iniciais do DETRAN-AC:
- Formulário de Defesa Prévia (Pessoa Física) em PDF.
- Três portarias oficiais (ex: Nova Portaria PROCURAA_A_O, Portaria n° 1159/2024, Portaria 1723).

O inventário documental foi atualizado e registrado em:
`docs/recovery/FASE-8-INVENTARIO-DOCUMENTAL-OFICIAL-2026-09-23.md`

### Evidências de Coleta Federal
- Arquivo ctb.html com hash SHA-256: 6a5e7d4ce6bd582acb0244b4b8a75837bb4cabc634842bbee2c99a58194e7d2e
- Arquivo dnit.html com hash SHA-256: 67debf6e429639a2e6f504e5f78434ca68b3e34961a971d6bcd9cdafb612ad7a
- Arquivo prf.html com hash SHA-256: 6d4ab6b742457c58ad4c8f3c2d5ddad2643d4e9f32ead6bba69aa67b61fd102d
- Arquivo anttr.html com hash SHA-256: a7c1d5a923af59c401aab4b95e89f94ac3f10e4ce9bbe556f63c72510790efd5
- Arquivo inmet.html com hash SHA-256: e67d72bfcf159b1a79cbd89560fca53fa85e8748c84c3e671da998cf3b62e239
- Arquivo dou.html com hash SHA-256: 31d48bd3a918942e8233cfcd40cbac5cfc8807ecfa837060752af2eb0021f13a
- Arquivo senatran.html com hash SHA-256: 3ec76f081ecd9ba75599ca8106be16c1039c15df7b11d6a3b8d74bc9265a1c4d
- Arquivo stj.html com hash SHA-256: caea3a0b1ab3a8dd6d41d9c185f1ea5dcccb3cccbc116926b166b297286a73fb
- Arquivo contran_resolutions.html com hash SHA-256: abbbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0
- Arquivo contran_res_796_2020.pdf com hash SHA-256: 6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258

### Evidências de Coleta Estadual (AC)
- Arquivo defesa_previa_pf.pdf com hash SHA-256: 15950ab7e5de613d9b086baae6894f7b452d8085edefcf4459276e7aa2b7d4f7
- Arquivo nova-portaria-PROCURAA_A_O.pdf com hash SHA-256: 11ef1de1afb04c0100e1162b0b07ed052c7228e1029a5e66b9a6f1c6c52441ce
- Arquivo Portaria_n__1159_2024_alteracao_portaria_assinatura_digital.pdf com hash SHA-256: 991e9fcb9edd07550298b4f81a88de13282263968da47f800244e587bf7b438c
- Arquivo Portaria_1723.pdf com hash SHA-256: 175e22e4daa442ff3115804f7319e8a3c3979be1847252d32a972788f6a2794d

## Classificação

- **COLETADO FEDERAL:** 9 fontes oficiais federais, total de 10 documentos coletados (incluindo variações).
- **COLETADO ESTADUAL (AC):** DETRAN-AC - 4 documentos coletados (1 formulário de defesa prévia, 3 portarias).
- **BLOQUEADO ESTADUAL:** CETRAN-AC (DNS não resolve) - requer investigação de URL alternativa ou confirmação de inaccessibilidade.
- **EM COLETA ESTADUAL:** DETRAN-AC - continuando a coleta de outros documentos específicos (manuais, resoluções, leis estaduais de trânsito).
- **PENDENTE:** Restante das 26 UFs (AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PE, PI, PR, RJ, RN, RO, RS, SC, SE, SP, TO, RR).

## Próximos passos dentro da FASE 8
1. Resolver o bloqueio do CETRAN-AC: tentar URLs alternativas (ex: verificar se há portal transparente ou outras abordagens) ou documentar oficialmente como inaccessível.
2. Continuar a coleta de documentos do DETRAN-AC: acessar o portal de recursos e buscar manuais de defesa prévia, resoluções do CETRAN-AC, leis estaduais de trânsito e outros documentos relevantes para defesa de multas.
3. Para cada documento coletado, calcular hash SHA-256 e registrar no inventário.
4. Após concluir AC, passar para o estado seguinte (AL) e repetir o processo.
5. Atualizar o inventário e este plano de progresso conforme avançar na coleta estadual.

## Próxima fase (após conclusão da FASE 8)

**FASE 9 — Validação e versionamento documental** (se aplicável): após coleta de todos os documentos oficiais, validar integridade, verificar versionamento e preparar para possível ingestão futura no sistema de conhecimento.