# FASE 8 — Auditoria de Integridade, Hashes e Consistência Documental — 69 Arquivos

**Data:** 2026-09-24 | **Escopo:** exclusivamente integridade/hashes/consistência documental — sem raspagem, sem download, sem alteração de arquivos.

## 1. Commit auditado

```
5c86690e95102a506eadfd5b279ac2273fc8e150  (HEAD local = origin/main)
```

## 2. Metodologia

- Diretórios auditados: `docs/recovery/legal_collected_2026_09_23/federal/` e `.../states/{UF}/`.
- Excluídos como auxiliares: `states/GO/test.txt` (0 bytes, arquivo de teste). Nenhum `.gitkeep` presente.
- Para cada arquivo: caminho relativo, extensão, tamanho em bytes, SHA-256 (`sha256sum`), MIME/type (`file --mime-type`), conteúdo.
- PDF válido = inicia com assinatura `%PDF`. HTML válido = contém `<html` ou `<!DOCTYPE`.
- Comparação arquivos físicos × registros do inventário oficial (`FASE-8-INVENTARIO-DOCUMENTAL-OFICIAL-2026-09-23.md`) e `plan/progress.md`.
- Nenhuma busca na internet; origens não verificáveis ao vivo foram registradas como `ORIGEM_NAO_VERIFICADA`.
- Nenhum arquivo de `legal_collected_2026_09_23/` foi modificado, renomeado, movido ou apagado.
- **Categorias exclusivas por arquivo:** VALIDO, VALIDO_COM_ALERTA, DUPLICATA_EXATA, ARQUIVO_INVALIDO, ARQUIVO_SEM_REGISTRO, HASH_DIVERGENTE (REGISTRO_SEM_ARQUIVO e ORIGEM_NAO_VERIFICADA aplicam-se a registros, não a arquivos físicos).

## 3. Total de arquivos (físicos, em disco)

- **71 arquivos físicos** auditados (excluído 1 auxiliar `test.txt`).
- **Atenção de contagem:** o nome do relatório mantém o padrão “69-ARQUIVOS”, mas a contagem **real auditada é 71**. A diferença (+2) vem de arquivos físicos adicionais não registrados no inventário (legado de coleta CE/contran).
- Arquivos vazios (0 bytes): **0** entre os documentais (o único 0-byte é o `test.txt` auxiliar, excluído).
- Por extensão: `html` = 36, `pdf` = 35.

## 4. Total federal

- **15 arquivos físicos** em `federal/`; **11 registros COLLECTED** no inventário para o bloco Federal.
- 4 arquivos físicos federais sem registro: `contran.html`, `contran2.html`, `contran_res_7962020.pdf`, `contran_res_list.html`.

## 5. Total por UF

| UF | Arquivos físicos | Registros no inventário | Diferença |
|----|----|----|----|
| Federal | 15 | 11 | +4 |
| AC | 4 | 4 | 0 |
| AL | 3 | 3 | 0 |
| AM | 5 | 5 | 0 |
| BA | 1 | 1 | 0 |
| CE | 9 | 1 | +8 |
| ES | 2 | 2 | 0 |
| GO | 2 | 2 | 0 |
| MG | 1 | 1 | 0 |
| MS | 2 | 2 | 0 |
| PA | 1 | 1 | 0 |
| PB | 2 | 2 | 0 |
| PI | 4 | 4 | 0 |
| PR | 3 | 3 | 0 |
| RJ | 3 | 3 | 0 |
| RR | 3 | 3 | 0 |
| RS | 2 | 2 | 0 |
| SC | 3 | 3 | 0 |
| SP | 3 | 3 | 0 |
| TO | 3 | 3 | 0 |

## 6. Hashes (tabela completa por arquivo)

| UF/Federal | Arquivo | Tipo | Bytes | SHA-256 | Integridade |
|-----------|--------|------|-------|---------|-------------|
| Federal | `federal/anttr.html` | text/html | 321957 | `a7c1d5a923af59c401aab4b95e89f94ac3f10e4ce9bbe556f63c72510790efd5` | VALIDO |
| Federal | `federal/contran.html` | application/json | 26 | `6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258` | ARQUIVO_INVALIDO |
| Federal | `federal/contran2.html` | application/json | 26 | `6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258` | ARQUIVO_INVALIDO |
| Federal | `federal/contran_res_7962020.pdf` | application/json | 26 | `6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258` | ARQUIVO_INVALIDO |
| Federal | `federal/contran_res_796_2020.pdf` | application/json | 26 | `6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258` | ARQUIVO_INVALIDO |
| Federal | `federal/contran_res_list.html` | application/json | 26 | `6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258` | ARQUIVO_INVALIDO |
| Federal | `federal/contran_resolutions.html` | text/html | 1449114 | `abbbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0` | HASH_DIVERGENTE (hash registro≠físico) |
| Federal | `federal/ctb.html` | text/html | 789873 | `6a5e7d4ce6bd582acb0244b4b8a75837bb4cabc634842bbee2c99a58194e7d2e` | VALIDO |
| Federal | `federal/ctb.pdf` | text/html | 485 | `623f0a987426022735c217262f78ad0eae6e2058dc2077f725200f956031e7d6` | ARQUIVO_INVALIDO |
| Federal | `federal/dnit.html` | text/html | 7124 | `67debf6e429639a2e6f504e5f78434ca68b3e34961a971d6bcd9cdafb612ad7a` | VALIDO |
| Federal | `federal/dou.html` | text/html | 456141 | `31d48bd3a918942e8233cfcd40cbac5cfc8807ecfa837060752af2eb0021f13a` | VALIDO |
| Federal | `federal/inmet.html` | text/html | 24489 | `e67d72bfcf159b1a79cbd89560fca53fa85e8748c84c3e671da998cf3b62e239` | VALIDO |
| Federal | `federal/prf.html` | application/javascript | 46017 | `6d4ab6b742457c58ad4c8f3c2d5ddad2643d4e9f32ead6bba69aa67b61fd102d` | VALIDO_COM_ALERTA |
| Federal | `federal/senatran.html` | text/html | 156731 | `3ec76f081ecd9ba75599ca8106be16c1039c15df7b11d6a3b8d74bc9265a1c4d` | VALIDO |
| Federal | `federal/stj.html` | application/javascript | 15626 | `caea3a0b1ab3a8dd6d41d9c185f1ea5dcccb3cccbc116926b166b297286a73fb` | VALIDO_COM_ALERTA |
| AC | `states/AC/defesa_previa_pf.pdf` | text/html | 155560 | `15950ab7e5de613d9b086baae6894f7b452d8085edefcf4459276e7aa2b7d4f7` | ARQUIVO_INVALIDO |
| AC | `states/AC/portarias/Portaria_1723.pdf` | application/pdf | 1245719 | `175e22e4daa442ff3115804f7319e8a3c3979be1847252d32a972788f6a2794d` | VALIDO |
| AC | `states/AC/portarias/Portaria_n__1159_2024_alteracao_portaria_assinatura_digital.pdf` | application/pdf | 197073 | `991e9fcb9edd07550298b4f81a88de13282263968da47f800244e587bf7b438c` | VALIDO |
| AC | `states/AC/portarias/nova-portaria-PROCURAA_A_O.pdf` | application/pdf | 4075187 | `11ef1de1afb04c0100e1162b0b07ed052c7228e1029a5e66b9a6f1c6c52441ce` | VALIDO |
| AL | `states/AL/resolucao_cetran_al_01_2000.pdf` | application/pdf | 39401 | `eb391d7f014c7d09950329b601bcc3152bcafa2097529daf98667c7302af75c0` | VALIDO |
| AL | `states/AL/resolucao_cetran_al_02_2000.pdf` | application/pdf | 65502 | `2abb3ef1254836bf41eabf59c950fe2a80b7828e60d690dd2f4e63fc05ae06f0` | VALIDO |
| AL | `states/AL/resolucao_cetran_al_04_2002.pdf` | application/pdf | 200990 | `f5b987626dde593893ce794da517d15271ef140b16ca3e0ab854175cbdde9796` | VALIDO |
| AM | `states/AM/memo_753_2026_opttran_detran.pdf` | text/html | 248529 | `c52bb2a6c4c005407bce225a26f4be15ea0e38dc4f96d25b94feb62e93dd70b8` | ARQUIVO_INVALIDO |
| AM | `states/AM/portaria_01_03_011210_078105_2026_96.pdf` | application/pdf | 317637 | `5192f8b88dc0466a0993b667eb4f05b209bde835368d19aa3d8765cdf1c637c3` | VALIDO |
| AM | `states/AM/portaria_01_03_011210_083647_2026_80.pdf` | application/pdf | 287749 | `82e54883faf4d63177788b9ff629d8b0907a6a98cb50e2d81b129471ed3af0de` | VALIDO |
| AM | `states/AM/portaria_normativa_014_2026.pdf` | application/pdf | 375710 | `84772aed1d7464653f236b6e4d8fde92325de0f303687da7845a24e361a4f057` | VALIDO |
| AM | `states/AM/portaria_normativa_015_2026.pdf` | application/pdf | 369291 | `08add6a30898435dd9ab9ef4c16921d46fd4a79ab0ab9325ae0e9154ee14b020` | VALIDO |
| BA | `states/BA/decreto_legislabahia_23792_2025.pdf` | text/html | 58682 | `4f319596d274eb379771b61e4390881c3200d489d9d8ec0aa38ba2e3745079f2` | ARQUIVO_INVALIDO |
| CE | `states/CE/defesa_autuar_infracao_transito.html` | text/html | 2009 | `ebaded0d43931826c3a02c1527d57fe916bbc4ec78d24dbf304020ece1ea818a` | ARQUIVO_SEM_REGISTRO |
| CE | `states/CE/is004_2007_cohab.pdf` | application/pdf | 1164071 | `176f2ff596d4c54cb170acc2817952a17842ae0766ef206751caa9c302efba74` | VALIDO |
| CE | `states/CE/recurso_jari_detran_ce.html` | text/html | 2009 | `ebaded0d43931826c3a02c1527d57fe916bbc4ec78d24dbf304020ece1ea818a` | DUPLICATA_EXATA |
| CE | `states/CE/regimento_interno_cetran_ce_2020.pdf` | application/pdf | 224727 | `676bbd60f4379d8641a132c41fbe5a77b5692ec2cd219808e6b1d3795e1e13c6` | ARQUIVO_SEM_REGISTRO |
| CE | `states/CE/resolucao_cetran_ce_001_2013.pdf` | application/pdf | 3032846 | `6e2835b007ad87f393623aa1e3095daf9eeb6a9560a0f59d55acbd48d08c8712` | ARQUIVO_SEM_REGISTRO |
| CE | `states/CE/resolucao_cetran_ce_001_2014.pdf` | application/pdf | 1588743 | `27aa5bc7b7ad3bff97fbaf336a0bf72a4dca9244b3a4e68dfb69bab8a3cf15aa` | ARQUIVO_SEM_REGISTRO |
| CE | `states/CE/resolucao_cetran_ce_003_2019.pdf` | application/pdf | 1457894 | `8825a645a52be3e5a5428b3f9929d48c946a60536970d4f8d1ec597e5661590d` | ARQUIVO_SEM_REGISTRO |
| CE | `states/CE/resolucao_cetran_ce_005.pdf` | application/pdf | 1989120 | `805fcf53c4e2abf2386fa3956de7c2b755c5b0aa22d3550ba073c6aedc3be7ec` | ARQUIVO_SEM_REGISTRO |
| CE | `states/CE/resolucao_cetran_ce_006.pdf` | application/pdf | 4090744 | `de170addd262bd41704f5143169d4afa7b9d90471411252af1487f2d5284b5a3` | ARQUIVO_SEM_REGISTRO |
| ES | `states/ES/recurso_de_multa_online.html` | text/html | 189962 | `0cc85439233035f6bd95e4a20cbc72c2cc78a70758c5710aad7041b938dd49b4` | VALIDO |
| ES | `states/ES/resolucao_cetran_es_2026_20.pdf` | application/pdf | 719415 | `5e59fc8be7ef37d6076db98210e1135820f9c08d0481cc3df806881d559bfae9` | VALIDO |
| GO | `states/GO/requerimento_defesa_previa_recurso_detran_go.pdf` | application/pdf | 7505 | `0cccd1e18e850ae8279470c8900c34d3dc692eaf08b7178e445aa88f920c12d1` | VALIDO |
| GO | `states/GO/resolucao_cetran_go_1999_003.pdf` | application/pdf | 3303 | `c6736863bc740f08d66104dd4081cb8bbbd439619e4d7bf75dde0f1dc02af511` | VALIDO |
| MG | `states/MG/apresentar_defesa_previa_mg.html` | text/html | 53493 | `f0cbb02f78607f29809b718620ecc268a169b5382a0562215d21a24d1a227c91` | VALIDO |
| MS | `states/MS/portaria_detranms_211_2026.pdf` | application/pdf | 534536 | `a00ac1712a499b4d04214c1dfad00e136a842b1437d158a449ad0d5304985cd6` | VALIDO |
| MS | `states/MS/regimento_interno_cetran.pdf` | application/pdf | 280570 | `55b474d84c0daa8a733cc0cc3f2e80682144762ffd3800e09813a4457193bdc5` | VALIDO |
| PA | `states/PA/portal_detran_pa.html` | text/html | 1962 | `d138c2e598299b6d0afd9a56b2a651f47e374d33c28b462e21b94fe9351191cf` | VALIDO |
| PB | `states/PB/defesa_recursos_online.html` | text/html | 74843 | `1914ae55909266741a03e0911c257cbbc1f66ea04296335675f96c51b5a6e573` | VALIDO |
| PB | `states/PB/regimento_interno_cetran.pdf` | application/pdf | 248261 | `1bcb4fcc7b251e00d7569968715b02d9ed44507704db28a37912c5cd876ecbd2` | VALIDO |
| PI | `states/PI/decreto_22731_2024.pdf` | application/pdf | 275907 | `8f1a3e2db72becc6e2a972f769a454e34327179cab5a02ad7a04b67dfeb7d922` | VALIDO |
| PI | `states/PI/decreto_24023_2025.pdf` | application/pdf | 1691760 | `ddb7054313ef87af8e04b75b9795887401e2f447f887a9a11def169cb153eced` | VALIDO |
| PI | `states/PI/multas_transito_art320_ctb.html` | text/html | 109552 | `582c2690a672dc0fc68d5a3b76ea2d1686a889a9689f9b04e3d9c036adeeabee` | VALIDO |
| PI | `states/PI/recurso_multa_cadastro.html` | text/html | 17792 | `9f9afcb1f1dce76e529d870f7f1a22f7c5a4f592287685b93a747a8285726f0c` | VALIDO |
| PR | `states/PR/recursos.html` | text/html | 56927 | `2e73369a4e953b449d41762b7288afb49c54046e3bc53a07ee7fc2b635b958e0` | VALIDO |
| PR | `states/PR/resolucao_077_21.pdf` | application/pdf | 251898 | `ec783fd23c79bd4e6755a031fd9617fa8b05da90f087d28eb36a7d431f821d51` | VALIDO |
| PR | `states/PR/resolucoes.html` | text/html | 172666 | `051a5587291d4448ac1560096b4f06cc4f6cee47bb44427faaf2ee303d4a86c4` | VALIDO |
| RJ | `states/RJ/CJC0160_apresentacao_defesa_recurso.pdf` | application/pdf | 107216 | `f0c237b48a530ef10988dd4f95c5c7864ca31d4692b7bb1f051cb710350bf11f` | VALIDO |
| RJ | `states/RJ/formularios_infracoes.html` | application/javascript | 54830 | `9faad6e62aaddccd2e504156d52be5829a532733b8d1b6b3a4821fdb9ec38b67` | VALIDO_COM_ALERTA |
| RJ | `states/RJ/resolucoes_cetran.html` | text/html | 12381 | `01812bab2ee1d80fe13131cfdf56e863659c0b8d4646c6204edc76749378df2a` | VALIDO |
| RR | `states/RR/defesa_previa.html` | text/html | 195452 | `e437a867c46791606da81b18e421760e92ba59ce12195497fe669f46d6addf34` | VALIDO |
| RR | `states/RR/recurso_ao_cetran.pdf` | application/pdf | 153207 | `66207d91e9862d398d1aabcfa37f86682012ada90cfe636eee989cde5be4bb94` | VALIDO |
| RR | `states/RR/recurso_de_autuacao_defesa_previa.pdf` | application/pdf | 48134 | `72bca3ce26f57d945a79c071db8f1edd1d48941043a5cda46c921e39f4c30f92` | VALIDO |
| RS | `states/RS/apresentar_defesa_recurso.html` | text/html | 91310 | `f3e49ba08f80a3d317d69ea7d7b65f63df117ae2c897d75bd925fb1c5d29f1d3` | VALIDO |
| RS | `states/RS/resolucoes.html` | text/html | 42049 | `e18ad19d629fc7fca869de819f4da0578f4d397cd48cd8302189d4a56e715e47` | VALIDO |
| SC | `states/SC/defesa_autuacao.html` | text/html | 323969 | `0bfe2171ae4bc0ce082a21d086b42ee4288d44c7dc0433342a7daeb72cbc028e` | VALIDO |
| SC | `states/SC/multas_penalidades.html` | text/html | 322852 | `c8714689934c206696680fb2d5d1c41df77154168b8eb457b6b3bbe663d5b9a2` | VALIDO |
| SC | `states/SC/resolucoes.html` | text/html | 250220 | `029b4d9f5c46d0e9abda66cdf2f83ca46d48c6e6a5621f43ae702a52ff888f24` | VALIDO |
| SP | `states/SP/atos_normativos.html` | text/xml | 31847 | `28ebdd2f959c71454fa1e51163c9fc3cc290b212a95709684e63890f300c7232` | VALIDO |
| SP | `states/SP/legislacoes.html` | text/xml | 29225 | `9c07d6e3888e386714707f4af1ccb884dfa7004d7ca69fbb1dd8ee3ae3b524c1` | VALIDO |
| SP | `states/SP/portal_detransp.html` | text/html | 776175 | `9a406ad41cf171461e9ae0b968088c433df193f097dfb9aef0d91a58019e8d26` | VALIDO |
| TO | `states/TO/formulario_recursos.html` | text/html | 25293 | `03ca65ebe74a3b75cc2a3c8f9d1832f45c7d8d3ec847622999016f2d4adaa50a` | VALIDO |
| TO | `states/TO/portal_detran.html` | text/html | 30818 | `0345b86e82372b3ef60c2d8f28d1fb89b8d9ee2dc0b82a5f0e95f8792e97294f` | VALIDO |
| TO | `states/TO/recurso_multas_portal_cidadao.html` | text/html | 27696 | `8e334838abb447aac5c0955edf55996e9459d402dde3181d93b005316148e419` | VALIDO |

## 7. Duplicatas

Classificação por hash:

- **64 UNIQUE** / **7 DUPLICATE_EXACT** (arquivos cujo hash iguala outro).

### Grupo de hash `6bbcea2b37bd092cc60604157a0ceec8944866fc2478f7af8aea3c3df40bc258` (5 arquivos)

- `federal/contran2.html` (26 B, application/json)
- `federal/contran.html` (26 B, application/json)
- `federal/contran_res_796_2020.pdf` (26 B, application/json)
- `federal/contran_res_7962020.pdf` (26 B, application/json)
- `federal/contran_res_list.html` (26 B, application/json)

### Grupo de hash `ebaded0d43931826c3a02c1527d57fe916bbc4ec78d24dbf304020ece1ea818a` (2 arquivos)

- `states/CE/defesa_autuar_infracao_transito.html` (2009 B, text/html)
- `states/CE/recurso_jari_detran_ce.html` (2009 B, text/html)


## 8. Arquivos inválidos

**9 arquivos inválidos** (conteúdo ≠ formato declarado):

- `federal/contran.html` (26 B, MIME=application/json) — início “{"error_type": "NotFound"}”
- `federal/contran2.html` (26 B, MIME=application/json) — início “{"error_type": "NotFound"}”
- `federal/contran_res_7962020.pdf` (26 B, MIME=application/json) — início “{"error_type": "NotFound"}”
- `federal/contran_res_796_2020.pdf` (26 B, MIME=application/json) — início “{"error_type": "NotFound"}”
- `federal/contran_res_list.html` (26 B, MIME=application/json) — início “{"error_type": "NotFound"}”
- `federal/ctb.pdf` (485 B, MIME=text/html) — início “<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML”
- `states/AC/defesa_previa_pf.pdf` (155560 B, MIME=text/html) — início “<!DOCTYPE html> <html lang="pt-BR"> <hea”
- `states/AM/memo_753_2026_opttran_detran.pdf` (248529 B, MIME=text/html) — início “<!doctype html> <html lang="pt-BR"> 	<he”
- `states/BA/decreto_legislabahia_23792_2025.pdf` (58682 B, MIME=text/html) — início “<!DOCTYPE html> <html  lang="pt-br" dir=”


## 9. Divergências entre arquivos e inventário

**ARQUIVO_SEM_REGISTRO** (arquivo físico sem linha no inventário): **12 órfãos em disco** (4 federais + 8 CE). Destes, por categoria: 4 `ARQUIVO_INVALIDO`, 7 `ARQUIVO_SEM_REGISTRO`, 1 `DUPLICATA_EXATA`.

- `federal/contran.html` — ARQUIVO_INVALIDO, 26 B
- `federal/contran2.html` — ARQUIVO_INVALIDO, 26 B
- `federal/contran_res_7962020.pdf` — ARQUIVO_INVALIDO, 26 B
- `federal/contran_res_list.html` — ARQUIVO_INVALIDO, 26 B
- `states/CE/defesa_autuar_infracao_transito.html` — ARQUIVO_SEM_REGISTRO, 2009 B
- `states/CE/recurso_jari_detran_ce.html` — DUPLICATA_EXATA, 2009 B
- `states/CE/regimento_interno_cetran_ce_2020.pdf` — ARQUIVO_SEM_REGISTRO, 224727 B
- `states/CE/resolucao_cetran_ce_001_2013.pdf` — ARQUIVO_SEM_REGISTRO, 3032846 B
- `states/CE/resolucao_cetran_ce_001_2014.pdf` — ARQUIVO_SEM_REGISTRO, 1588743 B
- `states/CE/resolucao_cetran_ce_003_2019.pdf` — ARQUIVO_SEM_REGISTRO, 1457894 B
- `states/CE/resolucao_cetran_ce_005.pdf` — ARQUIVO_SEM_REGISTRO, 1989120 B
- `states/CE/resolucao_cetran_ce_006.pdf` — ARQUIVO_SEM_REGISTRO, 4090744 B

**REGISTRO_SEM_ARQUIVO** (linha do inventário sem arquivo físico em disco): **0**.

**Contagens divergentes por UF** (físicos vs. linhas COLLECTED do inventário):

- Federal: 15 físicos vs. 11 registros — diferença **+4**.
- CE: 9 físicos vs. 1 registros — diferença **+8**.
- Demais UFs: contagem consistente (físicos = registros).

> Nota: o inventário oficial registra CE com 1 linha (`is004_2007_cohab.pdf`); `plan/progress.md` registra hashes de 7 arquivos CE (evidências); em disco existem 9 arquivos CE. Todos os 8 arquivos CE não listados no inventário foram classificados como ARQUIVO_SEM_REGISTRO/DUPLICATA_EXATA.

## 10. Divergências de hashes

**1 divergência** entre hash registrado no inventário e hash atual do arquivo físico:

| Registro | Arquivo | Hash registrado | Hash físico |
|----------|---------|----------------|-------------|
| SRC_FED_CONTRAN_RESOLUCOES | `federal/contran_resolutions.html` | `abbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0` | `abbbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0` |

Nota: o hash registrado de `contran_resolutions.html` foi gravado com **erro de digitação** (“`abb e54018dde4…`” — espaço e caractere ausente) no inventário e em `plan/progress.md`; o valor real do arquivo é `abbbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0`.

Observação adicional: para os documentos inválidos com registro (`contran_res_796_2020.pdf`, `ctb.pdf`, `defesa_previa_pf.pdf` AC, `memo_753…` AM, `decreto_legislabahia…` BA), o hash registrado **bate com o conteúdo físico** — ou seja, o coletor registrou o hash da própria resposta de erro/página (JSON `NotFound` ou HTML), e não do documento jurídico pretendido. Não é divergência de hash, mas é indício de coleta falha (ver Seção 8/13).

## 11. Origem registrada (ORIGEM_NAO_VERIFICADA)

Conferência documental interna (domínio da URL × Fonte/Autoridade/UF/Tipo) realizada **somente leitura**, sem acesso à internet:
- Domínios das URLs registradas são **coerentes** com a Fonte/Autoridade/UF indicada em 59/59 registros COLLECTED (ex.: `detran.ac.gov.br`↔DETRAN-AC; `cetran.pr.gov.br`↔CETRAN-PR; `portal.pi.gov.br`↔PI; `www.to.gov.br/detran`↔DETRAN-TO; `scon.stj.jus.br`↔STJ).
- Casos com hospedagem indireta plausível: CETRAN-MS via `sejusp.ms.gov.br`; CETRAN-ES via `detran.es.gov.br`; PI recurso via `www.pi.getran.com.br` (terceirizado GETRAN) — sem contradição documental.
- **Nenhuma origem foi verificada ao vivo nesta auditoria** (proibição de acesso à internet). Toda URL que exigiria acesso externo para confirmação está registrada como **`ORIGEM_NAO_VERIFICADA_NESTA_AUDITORIA`**.

## 12. Conclusão objetiva

- Disk possui **71 arquivos físicos** (36 html + 35 pdf) — **2 a mais** que o padrão de 69 do título.
- Federais: **15**; estaduais: **56** (AC 4, AL 3, AM 5, BA 1, CE 9, ES 2, GO 2, MG 1, MS 2, PA 1, PB 2, PI 4, PR 3, RJ 3, RR 3, RS 2, SC 3, SP 3, TO 3).
- Válidos sem ressalva: **50**; válidos com alerta: **3**; duplicatas exatas: **1**; inválidos: **9**; ARQUIVO_SEM_REGISTRO (categoria): **7**; hashes divergentes: **1**.
- Órfãos totais em disco (sem linha no inventário): **12** (4 federais inválidos + 8 CE: 7 ARQUIVO_SEM_REGISTRO + 1 DUPLICATA_EXATA).
- Registros órfãos (REGISTRO_SEM_ARQUIVO): **0**. 
- Origens: **59/59** registros com origem documentalmente coerente; **todas** não verificadas ao vivo (ORIGEM_NAO_VERIFICADA_NESTA_AUDITORIA).
- Nenhum arquivo de `legal_collected_2026_09_23/` foi modificado nesta auditoria.

## 13. Pendências exclusivamente documentais

1. **CE não está no inventário oficial:** 8 arquivos físicos CE (`defesa_autuar_infracao_transito.html`, `recurso_jari_detran_ce.html` [+ duplicata], `regimento_interno_cetran_ce_2020.pdf`, `resolucao_cetran_ce_001_2013.pdf`, `001_2014`, `003_2019`, `005`, `006`) sem linha correspondente no inventário; inventário lista apenas `is004_2007_cohab.pdf`. `plan/progress.md` lista 7 deles (sem 005/006).
2. **4 arquivos federais órfãos:** `contran.html`, `contran2.html`, `contran_res_7962020.pdf`, `contran_res_list.html` — sem registro; todos 26 B JSON `{"error_type":"NotFound"}`, inválidos.
3. **Hash malformado no inventário:** `SRC_FED_CONTRAN_RESOLUCOES` registrado como “`abb e54018dde4…`” (espaço + caractere faltante); valor real `abbbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0`. Mesmo defeito em `plan/progress.md`.
4. **5 documentos COLLECTED com payload de falha registrado como hash válido** (hash bate, conteúdo é erro/página HTML, não o ato jurídico): `contran_res_796_2020.pdf`, `ctb.pdf`, `states/AC/defesa_previa_pf.pdf`, `states/AM/memo_753_2026_opttran_detran.pdf`, `states/BA/decreto_legislabahia_23792_2025.pdf`. Exigem recibo/resolvência em rodada posterior — **não corrigir agora**.
5. **Alerta leve MIME:** `prf.html`, `stj.html`, `RJ/formularios_infracoes.html` são HTML válido detectado como `application/javascript` pelo `file(1)` (páginas JS-pesadas); conteúdo íntegro, sem ação documental.
6. **BA — relevância escopo:** `decreto_legislabahia_23792_2025.pdf` (registro COLLECTED) é de Estratégia de Governo Digital, sem cobertura de trânsito; o próprio inventário o declara “excluído da evidência de cobertura de trânsito”, porém o mantém como COLLECTED. Pendência de classificação.
7. **Origem não verificada:** nenhuma URL foi validada ao vivo (regra). Todas `ORIGEM_NAO_VERIFICADA_NESTA_AUDITORIA`.

## Resumo por UF

| UF | Arquivos | Válidos | Alertas | Duplicatas | Inválidos | Pendências |
|----|----------|---------|---------|------------|-----------|------------|
| Federal | 15 | 6 | 2 | 0 | 6 | 1 |
| AC | 4 | 3 | 0 | 0 | 1 | 0 |
| AL | 3 | 3 | 0 | 0 | 0 | 0 |
| AM | 5 | 4 | 0 | 0 | 1 | 0 |
| BA | 1 | 0 | 0 | 0 | 1 | 0 |
| CE | 9 | 1 | 0 | 1 | 0 | 7 |
| ES | 2 | 2 | 0 | 0 | 0 | 0 |
| GO | 2 | 2 | 0 | 0 | 0 | 0 |
| MG | 1 | 1 | 0 | 0 | 0 | 0 |
| MS | 2 | 2 | 0 | 0 | 0 | 0 |
| PA | 1 | 1 | 0 | 0 | 0 | 0 |
| PB | 2 | 2 | 0 | 0 | 0 | 0 |
| PI | 4 | 4 | 0 | 0 | 0 | 0 |
| PR | 3 | 3 | 0 | 0 | 0 | 0 |
| RJ | 3 | 2 | 1 | 0 | 0 | 0 |
| RR | 3 | 3 | 0 | 0 | 0 | 0 |
| RS | 2 | 2 | 0 | 0 | 0 | 0 |
| SC | 3 | 3 | 0 | 0 | 0 | 0 |
| SP | 3 | 3 | 0 | 0 | 0 | 0 |
| TO | 3 | 3 | 0 | 0 | 0 | 0 |
| **TOTAL** | **71** | **50** | **3** | **1** | **9** | **8** |

> Legenda pendências: ARQUIVO_SEM_REGISTRO + HASH_DIVERGENTE. Válidos+Alertas+Duplicatas+Inválidos+Pendências = Arquivos (categorias exclusivas).
