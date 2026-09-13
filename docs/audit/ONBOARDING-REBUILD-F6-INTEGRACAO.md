# ONBOARDING REBUILD — F6 INTEGRAÇÃO

## Estado

F6 foi iniciada no branch `onboarding/rebuild-canonico-clean`, derivado do commit F5 `bfc3c0c2e258235b1577a502c7e7b6a221dc3891`.

## Entregue neste bloco

- Adapter HTTP exclusivo do onboarding novo.
- Claim token mantido fora do payload de negócio e enviado por `X-Claim-Token`.
- Criação de rascunho anônimo sem exigir login.
- Autorização de leitura/alteração/análise por usuário autenticado ou claim token.
- Upload real de evidência de imagem pelo browser.
- Conversão do arquivo para base64 somente na fronteira HTTP.
- Limite de 5 MB.
- Tipos aceitos no fluxo novo: JPEG, PNG e WebP.
- OCR real usando o `ocrService` existente.
- Dados extraídos pelo OCR são persistidos no caso canônico via `CanonicalMapper`.
- Placa e campos da infração extraídos são reconciliados com o caso.
- Metadados do OCR ficam em `ocrAuxiliaryData`.
- Falha de OCR não avança silenciosamente o fluxo.
- UI deixou de tratar o nome do arquivo como se fosse conteúdo documental.

## Limites deliberados

- PDF ainda não é enviado para OCR neste bloco porque o serviço OCR atual exposto para esta integração trabalha diretamente com imagem/base64.
- Pagamento e geração continuam pendentes.
- Claim autenticado definitivo e transferência de propriedade para o usuário continuam pendentes.
- Não há simulação de aprovação de pagamento ou geração.

## Regra arquitetural

Nenhum componente do onboarding legado foi importado ou reutilizado como implementação. O novo fluxo usa apenas contratos próprios, o mapper canônico e serviços de domínio existentes na fronteira necessária.

## Validação

Ainda não há execução CI associada aos commits deste bloco. Portanto, este documento registra implementação, não aprovação de build/testes.
