Documentação da API GGPIXAPI
Integre PIX, pagamento de boletos, cartões virtuais e cripto. Consulte endpoints, respostas, segurança e webhooks.

Instantâneo
Pagamentos processados em segundos, 24/7, incluindo feriados.

Seguro
Criptografia de ponta a ponta e conformidade com LGPD.

Webhooks
Notificações em tempo real para todas as transações.

Base URLs ativas
Copiar principal
https://ggpixapi.com/api/v1
https://ggatepixapi.com/api/v1
Use ggpixapi.com como host principal. ggatepixapi.com permanece ativo como contingência de domínio; caminho, autenticação e contrato dos endpoints são os mesmos.

Documentação Offline
Baixe a documentação em Markdown para integrações offline

Baixar .md
Autenticação
Todas as requisições devem incluir o header X-API-Key com sua chave de API.

Você pode obter sua API Key no Painel do Merchant em Configurações → Credenciais.

Header de Autenticação

X-API-Key: sua_api_key_aqui
Mantenha sua API Key segura

Nunca exponha sua API Key em código frontend ou repositórios públicos. Use variáveis de ambiente.

Códigos de Erro
Código	Descrição
200	Sucesso
201	Recurso criado com sucesso
400	Requisição inválida - verifique os parâmetros
401	Não autorizado - API Key inválida ou ausente
403	Acesso negado - IP não autorizado (ver IP Whitelist)
404	Recurso não encontrado
409	Conflito - requisição duplicada (externalId)
429	Rate limit excedido - aguarde antes de tentar novamente
500	Erro interno do servidor (raro - a maioria dos erros retorna 400 com mensagem descritiva)
Rate Limiting
Para garantir a disponibilidade e performance da API, aplicamos limites de requisições por IP.

Endpoint	Limite	Janela
/api/v1/*	100 requisições	1 minuto
Headers de Resposta
Cada resposta inclui headers com informações sobre o rate limit:

Header	Descrição
RateLimit-Limit	Limite máximo de requisições na janela
RateLimit-Remaining	Requisições restantes na janela atual
RateLimit-Reset	Timestamp (segundos) de quando o limite reseta
Ao exceder o limite

Você receberá status 429 Too Many Requests. Aguarde a janela resetar antes de fazer novas requisições.

POST
PIX In (Receber)
Cria uma cobrança PIX. Retorna um QR Code e código copia e cola para o pagador.

POST
/api/v1/pix/in
Limites de Transação

Valor mínimo:
R$ 1,00
Valor máximo:
R$ 500.000,00
Parâmetros do Body
Campo	Tipo	Obrigatório	Descrição
amountCents	integer	Sim	Valor em centavos (min: 100 / max: 50000000)
description	string	Sim	Descrição da cobrança
payerName	string	Sim	Nome do pagador
payerDocument	string	Sim	CPF ou CNPJ do pagador. Deve ser um documento válido (apenas números, 11 dígitos para CPF ou 14 para CNPJ)
externalId	string	Não	ID único no seu sistema
webhookUrl	string	Não	URL para callback desta transação. Enviamos para esta URL e também para a URL do painel
payerEmail	string	Não	E-mail do pagador
payerPhone	string	Não	Telefone do pagador
metadata	object	Não	Dados adicionais (JSON)
split	array	Não	Divisão de pagamento (ver Split)
tracking	object	Não	Dados de rastreamento UTM/Meta Pixel (ver Rastreamento)
cURL
JavaScript
Python
PHP
C#
Java
Go
Ruby

curl -X POST https://ggpixapi.com/api/v1/pix/in \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "amountCents": 10000,
    "description": "Pedido #12345",
    "payerName": "Joao Silva",
    "payerDocument": "52998224725",
    "externalId": "pedido-12345",
    "webhookUrl": "https://seusite.com/webhooks/pix"
  }'
# Nota: payerDocument deve ser um CPF/CNPJ valido (apenas numeros)
# Webhook sera enviado para webhookUrl E para a URL configurada no painel
Resposta de Sucesso (201)

{
  "id": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "status": "PENDING",
  "amount": 10000,
  "pixCode": "00020101021226820014br.gov.bcb.pix2560qrcode...",
  "pixCopyPaste": "00020101021226820014br.gov.bcb.pix2560qrcode...",
  "externalId": "pedido-12345",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "fees": {
    "total": 77,
    "netAmount": 9923
  },
  "splits": []
}
Status da Transação
A cobrança pode assumir os seguintes status:

Status	Descrição
PENDING	Aguardando pagamento do QR Code
COMPLETE	Pagamento confirmado - valor creditado
FAILED	Falha no processamento
CANCELED	Cobrança cancelada ou expirada
Webhook de Notificação

Quando o pagamento é confirmado, enviamos webhook para ambas as URLs configuradas: a URL enviada no parâmetro webhookUrl da transação e a URL configurada no painel do merchant.

{
  "transactionId": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "externalId": "pedido-12345",
  "status": "COMPLETE",
  "type": "PIX_IN",
  "amount": 10000,
  "netAmount": 9923,
  "gatewayFee": 77,
  "paidAt": "2025-01-15T10:35:30.000Z",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "merchantId": "seu-merchant-id"
}
POST
Boleto (Receber)
Emite um boleto bancário registrado. O boleto é híbrido: o pagador pode pagar pela linha digitável/código de barras em qualquer banco ou lotérica, ou pelo PIX Copia e Cola do mesmo título. Qualquer um dos dois liquida a mesma cobrança.

POST
/api/v1/boleto/in
Como funciona a cobrança

A taxa é cobrada somente quando o boleto é pago e descontada do valor creditado. Boleto emitido e não pago não gera cobrança nenhuma.

A cobrança pode ter uma parte fixa e uma parte percentual, somadas (ex.: R$ 4,00 + 2,5% num boleto de R$ 100 = R$ 6,50). A sua condição é definida na sua conta — consulte o suporte.

O valor do boleto precisa ser maior que a taxa total.

O campo fees.total da resposta já traz a taxa daquele boleto, e fees.netAmount o valor líquido que será creditado.

Vencimento e pagamento

Vencimento de 1 a 5 dias (campo dueDays, padrão 3).

Pagamento por PIX confirma em segundos. Pagamento do boleto em outro banco pode levar até 1 dia útil para compensar.

Pagamento parcial não é aceito: se o valor pago divergir do emitido, a cobrança não é confirmada e nosso time avalia o caso.

Boleto vencido sem pagamento é cancelado automaticamente. Não há protesto nem negativação do pagador em nenhuma hipótese.

Parâmetros do Body
Campo	Tipo	Obrigatório	Descrição
amountCents	integer	Sim	Valor em centavos. Precisa ser maior que a taxa fixa do boleto
description	string	Sim	Descrição interna da cobrança
payerName	string	Sim	Nome do pagador. Sai impresso no boleto
payerDocument	string	Sim	CPF ou CNPJ do pagador, válido, só números
payerCep	string	Sim	CEP do pagador, 8 dígitos. Exigido para registrar o título
payerAddress	string	Não	Logradouro e número do pagador
payerCity	string	Não	Cidade do pagador
payerState	string	Não	UF do pagador, 2 letras
payerEmail	string	Não	E-mail do pagador
payerPhone	string	Não	Telefone do pagador, só números
dueDays	integer	Não	Dias até o vencimento, de 1 a 5. Padrão: 3
externalId	string	Não	Seu identificador. Garante idempotência: repetir a chamada devolve o mesmo boleto
webhookUrl	string	Não	URL para notificação. Sobrescreve a configurada na conta
metadata	object	Não	Dados livres devolvidos na consulta
Dados do pagador

Boleto é um título registrado em nome do pagador, então nome, CPF/CNPJ e CEP são obrigatórios e precisam ser reais. Os demais campos de endereço são opcionais e você decide quais envia.

Exemplo de Requisição
curl -X POST https://ggpixapi.com/api/v1/boleto/in \
  -H "X-API-Key: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 15000,
    "description": "Pedido #1234",
    "payerName": "Joao da Silva",
    "payerDocument": "12345678909",
    "payerCep": "01310100",
    "payerAddress": "Av Paulista 1000",
    "payerCity": "Sao Paulo",
    "payerState": "SP",
    "dueDays": 3,
    "externalId": "pedido-1234"
  }'
Resposta (201)
{
  "id": "cacdb0a6-8e8d-46ff-9ecf-2d7e0c47b42a",
  "status": "PENDING",
  "amount": 15000,
  "externalId": "pedido-1234",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "boleto": {
    "ourNumber": "600000064",
    "digitableLine": "74891160090000642205902991121050115340000000500",
    "barcode": "74891153400000005001160000006422050299112105",
    "dueDate": "2025-01-18T02:59:59.000Z"
  },
  "pixCopyPaste": "00020126910014br.gov.bcb.pix...",
  "fees": {
    "total": 700,
    "netAmount": 14300
  }
}
Mostre ao seu cliente a digitableLine (linha digitável) e/ou o pixCopyPaste. Guarde o id para consultar o status. A confirmação do pagamento chega no seu webhook com "type": "BOLETO_IN".

Webhook de Notificação

Quando o boleto é pago, enviamos webhook para ambas as URLs configuradas: a URL enviada no parâmetro webhookUrl da emissão e a URL configurada no painel do merchant — mesmo comportamento do PIX.

{
  "transactionId": "72dd125c-83df-4228-87de-4ffd4732c78c",
  "externalId": "pedido-1234",
  "status": "COMPLETE",
  "type": "BOLETO_IN",
  "amount": 15000,
  "netAmount": 14300,
  "gatewayFee": 700,
  "paidAt": "2025-01-15T10:35:30.000Z",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "merchantId": "seu-merchant-id",
  "payer": {
    "name": "Joao da Silva",
    "document": "12345678909",
    "bankName": null
  },
  "boleto": {
    "ourNumber": "600000064",
    "digitableLine": "74891160090000642205902991121050115340000000500",
    "barcode": "74891153400000005001160000006422050299112105",
    "dueDate": "2025-01-18T02:59:59.000Z"
  }
}
Atenção: se você selecionou eventos específicos no painel (Credenciais e Webhooks → Webhooks), inclua BOLETO_IN na lista. Sem ele, o boleto é pago e o saldo entra normalmente, mas seu sistema não recebe a notificação. Quem não seleciona nenhum evento recebe todos e não precisa fazer nada.

Dados do pagador na confirmação
Quando o boleto é pago, o campo payer volta preenchido na consulta da transação e no webhook, com o nome e o documento do pagador registrado no título — exatamente os dados que você enviou na emissão, confirmados pelo banco.

{
  "type": "BOLETO_IN",
  "status": "COMPLETE",
  "payer": {
    "name": "Joao da Silva",
    "document": "12345678909",
    "bankName": null
  }
}
Importante

Boleto pode ser pago por qualquer pessoa (um familiar, o contador da empresa, um terceiro). O payer identifica quem foi registrado no título, não necessariamente quem apertou o botão de pagar — essa informação não é fornecida no boleto. Se você precisa saber exatamente quem pagou, use PIX.

POST
Consultar Boleto
Detalha um boleto bancário ou um tributo/convênio (água, luz, gás, telefone, DARF, IPVA, multas) a partir da linha digitável ou do código de barras. Devolve o valor atualizado do dia — já com juros, multa e desconto — o beneficiário, o vencimento e a taxa que será cobrada.

Esta chamada é somente leitura: não move saldo e não cria transação. Ela é o primeiro passo do pagamento — o segundo é POST /api/v1/boleto/out. Por fazer parte do fluxo de saque, ela também exige IP whitelist.

POST
/api/v1/boleto/query
Por que consultar antes de pagar

O valor de um boleto muda com a data: após o vencimento entram juros e multa, e antes dele pode haver desconto. O valor que você viu ontem não é o valor de hoje.

Por isso a resposta traz um quoteToken: se você o enviar no pagamento, cobramos exatamente o valor que esta consulta devolveu. Sem ele, cobramos o valor vigente no momento do pagamento.

É um POST (e não um GET com o código na URL) de propósito: código de barras é instrumento de pagamento e não deve ficar registrado em log de acesso ou histórico de proxy.

Parâmetros
Campo	Tipo	Obrigatório	Descrição
barcode	string	sim	Linha digitável (47 dígitos para boleto, 48 para convênio) ou código de barras (44 dígitos). Pontos e espaços são ignorados
Campos da resposta
Campo	Descrição
type	"boleto" (título bancário) ou "tributo" (guia/convênio). Muda o que vem preenchido — veja o aviso abaixo
amounts.original	Valor de face do título, em centavos
amounts.interest	Juros aplicados até hoje, em centavos
amounts.fine	Multa por atraso, em centavos
amounts.discount	Desconto concedido pelo emissor, em centavos
amounts.rebate	Abatimento, em centavos
amounts.final	O que será efetivamente pago hoje. É este o valor debitado do seu saldo
bank	Banco do título (code, name). null em tributo/convênio
beneficiary	Quem recebe (name, document). null em tributo/convênio, que não registra beneficiário
dueDate	Vencimento (YYYY-MM-DD). null quando o título é contra apresentação
paymentLimitDate	Data limite para pagamento. Depois dela recusamos o pagamento
onDemand	true quando o título é contra apresentação (sem data fixa de vencimento). Comum em tributos
payable	false quando o título não está disponível para pagamento (já pago, cancelado ou fora do prazo)
allowsDifferentAmount	true se o título aceita pagamento com valor diferente do previsto, dentro de minAmount e maxAmount
fees.total	Nossa taxa para pagar este título, em centavos
fees.totalDebit	Total que sai do seu saldo (amounts.final + fees.total)
paymentWindow.open	Se dá para pagar AGORA. Quando false, vem também paymentWindow.reason dizendo o horário. Não confunda com payable: veja o aviso abaixo
quoteToken	Cotação assinada. Envie no pagamento para travar o valor. Vale por quoteExpiresInSeconds (300s) e só serve para este título e esta conta
payable x paymentWindow: não confunda

payable fala do título: não está pago, não está cancelado, está dentro do prazo dele.

paymentWindow.open fala do relógio: se o pagamento está sendo processado neste momento.

São condições independentes. Um título com payable: true às 3h da manhã continua válido, mas o pagamento será recusado — a consulta funciona 24h, o pagamento não. Cheque os dois antes de chamar /boleto/out.

Boleto x Tributo: o que muda

Boleto (type: "boleto"): tem banco, beneficiário, vencimento e pode ter juros, multa e desconto.

Tributo/convênio (type: "tributo"): bank e beneficiary vem null, e o vencimento costuma ser contra apresentação (onDemand: true, dueDate: null). Isso não significa que o título é inválido — a base centralizada de convênios simplesmente não registra esses dados. Se payable for true, pode pagar.

Limite de consultas

300 consultas por dia por conta, somando API e painel. Estourado o teto, respondemos HTTP 429. Consulte o boleto que você vai pagar — o endpoint não é para varredura de códigos.

Exemplo
curl -X POST https://ggpixapi.com/api/v1/boleto/query \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "34191790010104351004791020150008291070026000"
  }'
Resposta — boleto bancário vencido, já com juros e multa:

{
  "type": "boleto",
  "barcode": "34191790010104351004791020150008291070026000",
  "digitableLine": "34191.79001 01043.510047 91020.150008 2 91070026000",
  "bank": { "code": "341", "name": "Banco Itau S.A." },
  "beneficiary": { "name": "EMPRESA EXEMPLO LTDA", "document": "12345678000199" },
  "dueDate": "2026-08-01",
  "paymentLimitDate": "2026-09-30",
  "onDemand": false,
  "amounts": {
    "original": 10000,
    "discount": 0,
    "interest": 137,
    "fine": 200,
    "rebate": 0,
    "final": 10337
  },
  "payable": true,
  "allowsDifferentAmount": false,
  "minAmount": null,
  "maxAmount": null,
  "fees": { "total": 207, "totalDebit": 10544 },
  "paymentWindow": { "open": true },
  "quoteToken": "1786161234567.10337.Xk9...",
  "quoteExpiresInSeconds": 300
}
Resposta — conta de consumo contra apresentação:

{
  "type": "tributo",
  "barcode": "82640000000112345678901234567890123456789012",
  "digitableLine": "826400000001 123456789012 345678901234 567890123456",
  "bank": null,
  "beneficiary": null,
  "dueDate": null,
  "paymentLimitDate": null,
  "onDemand": true,
  "amounts": {
    "original": 11200,
    "discount": 0,
    "interest": 0,
    "fine": 0,
    "rebate": 0,
    "final": 11200
  },
  "payable": true,
  "allowsDifferentAmount": false,
  "minAmount": null,
  "maxAmount": null,
  "fees": { "total": 224, "totalDebit": 11424 },
  "quoteToken": "1786161234567.11200.Ab3...",
  "quoteExpiresInSeconds": 300
}
POST
Pagar Boleto
Paga um boleto bancário ou tributo/convênio. O valor do título mais a taxa são debitados do seu saldo no momento da chamada, e a liquidação roda de forma assíncrona — acompanhe por GET /api/v1/transactions/:id ou pelo webhook.

POST
/api/v1/boleto/out
IP Whitelist Obrigatório

Como todo saque via API, o pagamento de boleto exige que o IP do seu servidor esteja cadastrado. Acesse o Painel do Merchant → Credenciais e Webhooks → aba IPs Permitidos. Vale para os dois endpoints — a consulta também exige, por ser o primeiro passo do pagamento.

Parâmetros
Campo	Tipo	Obrigatório	Descrição
barcode	string	sim	Linha digitável ou código de barras. Pode ser o mesmo formato da consulta ou o outro — normalizamos os dois
quoteToken	string	recomendado	O token devolvido por /boleto/query. Com ele, cobramos exatamente o valor cotado. Sem ele, cobramos o valor vigente agora
amountCents	integer	não	Valor em centavos. Só faz sentido em título com allowsDifferentAmount: true. Se você enviar junto com o quoteToken, precisa ser igual ao valor cotado
externalId	string	não	Seu identificador. Garante idempotência: repetir a chamada devolve o mesmo pagamento em vez de pagar duas vezes
description	string	não	Descrição interna, para você identificar o pagamento no extrato e no painel
webhookUrl	string	não	Sobrescreve a URL de webhook da conta para este pagamento
metadata	object	não	Dados livres seus, devolvidos na consulta e no webhook
Horários e prazos

A chamada é aceita a qualquer hora, inclusive fora do horário bancário, em fins de semana e feriados.

O que muda é quando o título compensa: pedidos feitos fora do horário bancário entram no próximo ciclo de compensação. Nesse intervalo a transação fica PENDING — isso é o esperado, não é erro.

Título fora do prazo (paymentLimitDate vencida) é recusado na hora, sem débito.

Regras de pagamento

Pagamento parcial não é aceito. Pagamos o título inteiro ou não pagamos — um título parcialmente pago continuaria em aberto com você já debitado.

Valor divergente só passa quando o próprio título aceita (allowsDifferentAmount: true) e dentro da faixa minAmount–maxAmount.

Cada título só pode ser pago uma vez. Um código de barras que já tem pagamento em andamento ou concluído — na sua conta ou em qualquer outra — recebe HTTP 409.

Valor máximo: R$ 30.000,00 por título, além dos limites de saque da sua conta.

Se o pagamento falhar, o valor debitado (título + taxa) volta integralmente para o seu saldo e a transação fica FAILED.

Taxa

Por padrão, a mesma condição do seu PIX Out. O valor exato daquele título vem em fees.total na consulta, antes de você confirmar — consulte sempre para saber quanto vai sair do saldo.

Exemplo
curl -X POST https://ggpixapi.com/api/v1/boleto/out \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "34191790010104351004791020150008291070026000",
    "quoteToken": "1786161234567.10337.Xk9...",
    "externalId": "PAGAMENTO-2026-0001",
    "description": "Aluguel agosto"
  }'
Resposta (HTTP 201):

{
  "id": "9f2c1a7e-4b3d-4c8a-9e11-2f6d5b8c0a41",
  "status": "PENDING",
  "amount": 10337,
  "externalId": "PAGAMENTO-2026-0001",
  "createdAt": "2026-08-08T14:22:10.123Z",
  "boleto": {
    "barcode": "34191790010104351004791020150008291070026000",
    "digitableLine": "34191.79001 01043.510047 91020.150008 2 91070026000",
    "dueDate": "2026-08-01T23:59:59.000Z"
  },
  "fees": { "total": 207, "totalDebit": 10544 },
  "idempotent": false
}
Erros comuns
HTTP	error	Quando acontece
400	Invalid barcode	Linha digitável ou código de barras inválido (dígito verificador não confere, tamanho errado)
400	Invalid quote	O quoteToken expirou, é de outro título ou de outra conta. Consulte de novo
400	Insufficient balance	Saldo menor que o título mais a taxa
400	OUTSIDE_PAYMENT_WINDOW	Fora do horário de processamento (fim de semana, feriado bancário ou fora da faixa de horas). Nada foi debitado. Reagende o retry para o próximo dia útil — repetir em minutos não vai passar
400	Payment failed	Título vencido, valor fora da faixa aceita ou título indisponível para pagamento. A mensagem diz qual
403	BOLETO_OUT_DISABLED	Pagamento de boletos não habilitado na conta — fale com o suporte
403	IP whitelist required	O IP do servidor que chamou não está cadastrado
409	Already paid	Este título já tem pagamento em andamento ou concluído. Não adianta repetir
429	Query limit reached	Teto de 300 consultas diárias atingido (na consulta)
POST
Enviar TED
Transferência para conta em outra instituição, usando dados bancários (banco, agência e conta) em vez de chave PIX. Debita o saldo do lojista no momento da criação: valor + taxa fixa.

POST
/api/v1/ted
Janela de funcionamento
TED só é compensada em dia útil, das 8h às 17h (horário de Brasília). Fim de semana e feriado bancário não contam. Fora da janela a API responde 409 com o código WINDOW_CLOSED e o campo window.nextOpening.

Para agendar automaticamente para a próxima janela, reenvie a mesma requisição com scheduleIfClosed: true. O agendamento é sempre uma escolha sua — nunca agendamos por conta própria. Ao agendar, o saldo é debitado na hora e a TED sai quando a janela abrir.

Mesmas regras do saque PIX
A TED está disponível para todas as contas, e obedece exatamente às mesmas travas do saque PIX, porque é saída de dinheiro: KYC aprovado, conta ativa, operações não bloqueadas e os mesmos limites (mínimo, máximo e teto diário).

O limite diário é compartilhado entre saque PIX, pagamento de boleto e TED — não é um teto separado por produto.

Consulte GET /api/v1/ted/info para saber a taxa, os limites e se a janela está aberta agora. Este endpoint respeita a mesma whitelist de IP do saque.

Parâmetros (JSON Body)
Campo	Tipo	Obrigatório	Descrição
amountCents	integer	Sim	Valor em centavos. A taxa é cobrada além deste valor
ispb	string	Sim	ISPB do banco do favorecido — 8 dígitos (não é o código COMPE de 3 dígitos)
issuer	string	Sim	Agência, sem dígito verificador
number	string	Sim	Número da conta, com o dígito verificador
accountType	string	Sim	CACC (corrente), SVGS (poupança), SLRY (salário) ou TRAN (pagamento)
document	string	Sim	CPF ou CNPJ do favorecido, só números
name	string	Sim	Nome do favorecido
externalId	string	Sim	Identificador único seu. Garante idempotência — reenviar o mesmo é recusado
scheduleIfClosed	boolean	Não	true agenda para a próxima janela quando fora do horário. Default false
description	string	Não	Descrição para o seu controle
webhookUrl	string	Não	Sobrescreve a URL de webhook da conta

curl -X POST https://ggpixapi.com/api/v1/ted \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "amountCents": 150000,
    "ispb": "60701190",
    "issuer": "1234",
    "number": "567890",
    "accountType": "CACC",
    "document": "12345678901",
    "name": "JOAO DA SILVA",
    "externalId": "ted-2026-0001",
    "scheduleIfClosed": false
  }'
Resposta de Sucesso (200)

{
  "id": "9f1c2e77-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
  "status": "PENDING",
  "amount": 150000,
  "feeCents": 1000,
  "externalId": "ted-2026-0001",
  "scheduled": false,
  "scheduledFor": null,
  "createdAt": "2026-08-13T14:20:00.000Z"
}
Fora da janela (409)

{
  "error": "O horário para TED encerra às 17h. A próxima janela abre em 14/08, 08:00.",
  "code": "WINDOW_CLOSED",
  "window": {
    "reason": "after_cutoff",
    "nextOpening": "2026-08-14T11:00:00.000Z"
  }
}
Para aceitar o agendamento, reenvie a mesma requisição (mesmo externalId) com scheduleIfClosed: true. A resposta virá com scheduled: true e scheduledFor preenchido.

Acompanhando a TED
A TED nasce PENDING e é liquidada de forma assíncrona. Você é avisado de duas formas, iguais às do saque PIX:

Webhook com "type": "TED_OUT" quando ela chega a COMPLETE ou FAILED (veja Webhooks). Se você filtra eventos, inclua TED_OUT na sua seleção.
Polling em GET /api/v1/transactions/{id}, usando o id devolvido na criação.
TED recusada pela instituição destino devolve o valor e a taxa ao seu saldo automaticamente, e o status vai para FAILED com failureReason.

Erros
HTTP	code	Significado
400	INVALID_INPUT	Dado bancário inválido (ISPB, agência, conta, tipo ou documento)
400	INSUFFICIENT_BALANCE	Saldo insuficiente para o valor + a taxa
400	INVALID_INPUT	Limite excedido: valor mínimo, valor máximo ou limite diário de saque — o mesmo teto compartilhado com PIX e boleto
403	NOT_ALLOWED	Conta sem permissão para sacar: KYC não aprovado, conta inativa ou operações bloqueadas. Fale com o suporte
409	WINDOW_CLOSED	Fora da janela. Reenvie com scheduleIfClosed para agendar
409	DUPLICATE	externalId já utilizado
503	DISABLED	TED temporariamente indisponível
GET
Consultar Janela e Taxa da TED
Devolve a taxa da sua conta, os limites, os tipos de conta aceitos e se a janela está aberta neste momento.

GET
/api/v1/ted/info

{
  "enabled": true,
  "feeCents": 1000,
  "minAmountCents": 100,
  "maxAmountCents": 3000000,
  "accountTypes": [
    { "value": "CACC", "label": "Conta Corrente" },
    { "value": "SVGS", "label": "Conta Poupança" },
    { "value": "SLRY", "label": "Conta Salário" },
    { "value": "TRAN", "label": "Conta de Pagamento" }
  ],
  "window": {
    "open": false,
    "reason": "after_cutoff",
    "message": "O horário para TED encerra às 17h. A próxima janela abre em 14/08, 08:00.",
    "nextOpening": "2026-08-14T11:00:00.000Z"
  }
}
POST
PIX Out (Enviar)
Envia um PIX para qualquer chave. O valor é debitado do seu saldo.

POST
/api/v1/pix/out
IP Whitelist Obrigatório

Para realizar PIX Out via API, você deve cadastrar o IP do seu servidor na whitelist. Acesse o Painel do Merchant → Credenciais e Webhooks → aba IPs Permitidos.

Resposta de erro (HTTP 403):

{"error": "IP whitelist required", "message": "Para realizar saques via API, você deve configurar pelo menos um IP permitido...", "clientIp": "203.0.113.45"}
Limites de Transação

Valor mínimo:
R$ 1,00
Valor máximo:
R$ 500.000,00
Boa prática para Copia e Cola

Ao receber um código Copia e Cola do seu cliente, use primeiro o endpoint /api/v1/pix/decode para decodificar e exibir os dados do beneficiário (nome, instituição, chave PIX, valor) antes de confirmar o pagamento. Isso permite que seu cliente valide as informações e evita erros ou pagamentos indevidos.

Parâmetros do Body
Campo	Tipo	Obrigatório	Descrição
amountCents	integer	Sim	Valor em centavos (min: 100 / max: 50000000)
pixKey	string	Sim	Chave PIX do destinatário
pixKeyType	string	Sim	CPF | CNPJ | EMAIL | PHONE | EVP | COPIAECOLA
externalId	string	Sim	ID único para idempotência
recipientDocument	string	Não	CPF/CNPJ do destinatário. Opcional (recomendado quando pixKeyType for PHONE, EMAIL ou EVP; para COPIAECOLA habilita prioridade alta no processamento)
description	string	Não	Descrição da transferência
webhookUrl	string	Não	URL para callback. Enviamos para esta URL e também para a URL do painel
metadata	object	Não	Objeto livre repassado no webhook

# Exemplo com chave CPF (recipientDocument não é necessário)
curl -X POST https://ggpixapi.com/api/v1/pix/out \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "amountCents": 5000,
    "pixKey": "52998224725",
    "pixKeyType": "CPF",
    "externalId": "saque-001",
    "description": "Pagamento fornecedor"
  }'

# Exemplo com chave PHONE (recipientDocument OPCIONAL - se enviado, saque instantâneo)
curl -X POST https://ggpixapi.com/api/v1/pix/out \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "amountCents": 5000,
    "pixKey": "11999998888",
    "pixKeyType": "PHONE",
    "recipientDocument": "52998224725",
    "externalId": "saque-002",
    "description": "Pagamento fornecedor"
  }'

# Exemplo SEM recipientDocument (chave EMAIL, PHONE ou EVP) - saque sem CPF/CNPJ
# Aceito e processado normalmente; sem o documento entra na fila padrão de processamento
curl -X POST https://ggpixapi.com/api/v1/pix/out \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "amountCents": 5000,
    "pixKey": "cliente@email.com",
    "pixKeyType": "EMAIL",
    "externalId": "saque-sem-doc-001",
    "description": "Pagamento sem CPF/CNPJ"
  }'

# Exemplo com Copia e Cola (código EMV completo)
# recipientDocument opcional - se fornecido, habilita prioridade alta
curl -X POST https://ggpixapi.com/api/v1/pix/out \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "amountCents": 5000,
    "pixKey": "00020101021226800014br.gov.bcb.pix2558pix.exemplo.com/v2/cob/...",
    "pixKeyType": "COPIAECOLA",
    "externalId": "saque-003",
    "description": "Pagamento via QR Code"
  }'
Resposta de Sucesso (201)

{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "PENDING",
  "amount": 5000,
  "pixKey": "52998224725",
  "pixKeyType": "CPF",
  "externalId": "saque-001",
  "createdAt": "2025-01-15T10:35:00.000Z",
  "fees": {
    "total": 77
  }
}
Resposta de Sucesso — saque SEM recipientDocument (201)
Para chave EMAIL, PHONE ou EVP o recipientDocument é opcional: o saque é aceito e processado normalmente mesmo sem o CPF/CNPJ do recebedor.


{
  "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "status": "PENDING",
  "amount": 5000,
  "pixKey": "cliente@email.com",
  "pixKeyType": "EMAIL",
  "externalId": "saque-sem-doc-001",
  "createdAt": "2025-01-15T10:36:00.000Z",
  "fees": {
    "total": 77
  }
}
Status da Transação
A transação pode assumir os seguintes status:

Status	Descrição
PENDING	Aguardando processamento pela adquirente
COMPLETE	Saque realizado com sucesso - dinheiro enviado
FAILED	Falha no processamento - valor devolvido ao saldo. O campo failureReason contém o motivo da falha.
CANCELED	Transação cancelada
Resposta com Falha (201 com status FAILED)
Quando a transação é rejeitada imediatamente (ex: dados inválidos), o status retorna como FAILED com o campo failureReason explicando o motivo:

{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "FAILED",
  "amount": 5000,
  "pixKey": "52998224725",
  "pixKeyType": "CPF",
  "externalId": "saque-001",
  "createdAt": "2025-01-15T10:35:00.000Z",
  "failureReason": "O documento (CPF/CNPJ) informado é inválido ou não confere com o destinatário. Verifique os dados e tente novamente.",
  "fees": {
    "total": 77
  }
}
Respostas de Erro (HTTP 400)
Erros retornam HTTP 400 com mensagens descritivas:

// Documento inválido
{"error": "O documento (CPF/CNPJ) informado é inválido ou não confere com o destinatário. Verifique os dados e tente novamente."}

// Chave PIX não encontrada
{"error": "A chave PIX informada é inválida ou não foi encontrada. Verifique a chave e tente novamente."}

// Saldo insuficiente
{"error": "Saldo insuficiente para realizar esta operação"}

// Conta não encontrada
{"error": "Conta ou destinatário não encontrado. Verifique os dados do beneficiário."}

// Requisicao duplicada (HTTP 409)
{"error": "Requisição duplicada. Use um externalId diferente."}
Webhook de Notificação

Quando o status da transação muda, enviamos webhook para ambas as URLs configuradas: a URL enviada no parâmetro webhookUrl da transação e a URL configurada no painel do merchant.

// Webhook de sucesso
{
  "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "externalId": "saque-001",
  "status": "COMPLETE",
  "type": "PIX_OUT",
  "amount": 5000,
  "netAmount": 4923,
  "gatewayFee": 77,
  "paidAt": "2025-01-15T10:35:30.000Z",
  "createdAt": "2025-01-15T10:35:00.000Z",
  "merchantId": "seu-merchant-id"
}

// Webhook de falha (inclui failureReason)
{
  "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "externalId": "saque-001",
  "status": "FAILED",
  "type": "PIX_OUT",
  "amount": 5000,
  "netAmount": 4923,
  "gatewayFee": 77,
  "paidAt": null,
  "createdAt": "2025-01-15T10:35:00.000Z",
  "merchantId": "seu-merchant-id",
  "failureReason": "A chave PIX informada é inválida ou não foi encontrada. Verifique a chave e tente novamente."
}
Idempotência com externalId

O campo externalId garante que a mesma transação não seja processada duas vezes. Envios duplicados retornam erro 409.

SPLIT
Divisão de Pagamento
O Split permite dividir automaticamente um pagamento PIX In entre múltiplos destinatários. Ideal para marketplaces, plataformas de afiliados, ou qualquer cenário onde o valor precisa ser distribuído.

Como funciona

Quando o pagamento é confirmado, os destinatários recebem automaticamente sua porcentagem do valor bruto. Você (merchant) recebe o restante, já descontado as taxas.

Regras do Split
Regra	Valor
Porcentagem total mínima	1%
Porcentagem total máxima	85%
Tipos de destinatário	USER (admin) ou MERCHANT
Cálculo do split	Baseado no valor bruto (antes das taxas)
Estrutura do Split
Campo	Tipo	Descrição
username	string	Username do destinatário (USER ou MERCHANT)
percentageSplit	string	Porcentagem a ser enviada (ex: "10", "5.5")
Exemplo de PIX In com Split

curl -X POST https://ggpixapi.com/api/v1/pix/in \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "amountCents": 10000,
    "description": "Venda Marketplace #123",
    "payerName": "Joao Silva",
    "payerDocument": "52998224725",
    "split": [
      { "username": "vendedor1", "percentageSplit": "70" },
      { "username": "afiliado_promo", "percentageSplit": "5" }
    ]
  }'
Resposta com Splits

{
  "id": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "status": "PENDING",
  "amount": 10000,
  "pixCode": "00020101021226820014br.gov.bcb.pix2560qrcode...",
  "pixCopyPaste": "00020101021226820014br.gov.bcb.pix2560qrcode...",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "fees": {
    "total": 77,
    "netAmount": 2423
  },
  "splits": [
    {
      "id": "split-uuid-1",
      "recipientType": "MERCHANT",
      "percentage": 70,
      "amount": 7000
    },
    {
      "id": "split-uuid-2",
      "recipientType": "USER",
      "percentage": 5,
      "amount": 500
    }
  ]
}
Exemplo de Calculo
Para um pagamento de R$ 100,00 com split de 70% + 5%:

Valor bruto:
R$ 100,00
Split vendedor1 (70%):
- R$ 70,00
Split afiliado (5%):
- R$ 5,00
Taxa gateway:
- R$ 0,77
Você recebe:
R$ 24,23
Rastreamento de Conversões
O campo tracking no endpoint POST /api/v1/pix/in permite enviar dados de rastreamento (UTMs, IP do cliente) para integração automática com UTMify e Meta Pixel (Conversions API).

Quando o pagamento PIX for confirmado, o GGate dispara automaticamente os eventos de conversão para as plataformas configuradas no seu painel.

Configuração necessária

Antes de usar o campo tracking, habilite o UTMify e/ou Meta Pixel na seção Rastreamento (API) do painel do merchant. Sem essa configuração, os dados serão salvos mas nenhum evento será disparado.

Campos do objeto tracking
Campo	Tipo	Descrição
utm_source	string	Fonte da campanha (ex: facebook, google)
utm_medium	string	Meio da campanha (ex: cpc, email)
utm_campaign	string	Nome da campanha
utm_content	string	Conteúdo do anúncio
utm_term	string	Termo de busca
src	string	Parâmetro customizado UTMify
sck	string	Parâmetro customizado UTMify
client_ip	string	IP real do cliente final (IPv4 ou IPv6). Envie o IP do usuário, não o IP do seu servidor
client_user_agent	string	User-Agent do navegador do cliente
Exemplo: PIX In com Rastreamento

curl -X POST https://ggpixapi.com/api/v1/pix/in \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "amountCents": 9990,
    "description": "Produto XYZ",
    "payerName": "Joao Silva",
    "payerDocument": "52998224725",
    "tracking": {
      "utm_source": "facebook",
      "utm_medium": "cpc",
      "utm_campaign": "black_friday_2026",
      "utm_content": "banner_topo",
      "src": "fb-ads",
      "sck": "checkout-v2",
      "client_ip": "200.1.2.3",
      "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
    }
  }'
Capturando UTMs no Frontend (JavaScript)
Capture os parâmetros UTM quando o usuário chegar no seu site e envie na hora de criar o PIX


// 1. Capturar UTMs quando o usuario acessar o site
function getTrackingData() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    src: params.get('src'),
    sck: params.get('sck'),
    client_ip: null, // Preencher via backend (ex: req.ip)
    client_user_agent: navigator.userAgent
  };
}

// 2. Salvar em sessionStorage para usar no checkout
const tracking = getTrackingData();
sessionStorage.setItem('tracking', JSON.stringify(tracking));

// 3. Na hora de criar o PIX, incluir o campo tracking
async function criarPix(dados) {
  const tracking = JSON.parse(sessionStorage.getItem('tracking') || '{}');
  const response = await fetch('/api/criar-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...dados, tracking })
  });
  return response.json();
}
Como funciona o disparo

Os dados de tracking são salvos na transação. Quando o pagamento PIX for confirmado (status COMPLETE), o GGate envia automaticamente o evento de compra para o UTMify e/ou Meta Pixel conforme suas configurações no painel. O disparo é assíncrono e não afeta o processamento do pagamento.

POST
Decodificar PIX Copia e Cola
Decodifica um código PIX Copia e Cola (EMV) e retorna as informações do beneficiário, instituição, chave PIX, cidade e valor. Ideal para validar e exibir detalhes antes de confirmar um pagamento via COPIAECOLA.

POST
/api/v1/pix/decode
Parâmetros (JSON Body)
Campo	Tipo	Obrigatório	Descrição
payload	string	Sim	Código PIX Copia e Cola completo (começa com 0002, mínimo 50 caracteres)

curl -X POST https://ggpixapi.com/api/v1/pix/decode \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "payload": "00020101021226810014br.gov.bcb.pix2559qr.exemplo.com/v2/cob/abc123..."
  }'
Resposta de Sucesso (200)

{
  "beneficiaryName": "EMPRESA LTDA",
  "city": "SAO PAULO",
  "amount": 5000,
  "pixKey": "4fa35b9e-05a9-4252-9151-372d067db003",
  "institution": "starkbank.com",
  "status": "ATIVA",
  "pixUrl": "pix.starkbank.com/v2/cob/abc123..."
}
Campos da resposta
beneficiaryName	Nome do beneficiário
city	Cidade do beneficiário
amount	Valor em centavos (null se PIX dinâmico sem valor definido)
pixKey	Chave PIX do beneficiário (disponível em PIX dinâmicos)
institution	Instituição financeira (extraída do domínio da URL)
status	Status do PIX na instituição (ATIVA, CONCLUÍDA, etc.)
POST
Confirmar Titular da Chave PIX
Consulta no DICT quem é o dono de uma chave PIX, para você conferir o favorecido antes de enviar um saque. Evita transferência para chave digitada errada — depois de enviado, o PIX não pode ser cancelado.

POST
/api/v1/pix/key-lookup
Consulta opcional e independente
Este endpoint é avulso. O saque por POST /api/v1/pix/out não depende dele e continua funcionando exatamente como sempre — chame esta consulta apenas se quiser conferir o favorecido antes.

Limite diário
Cada conta tem 100 consultas por dia, mais 1 consulta extra por saque concluído nos últimos 30 dias (teto de 2.000/dia). O limite renova à meia-noite (UTC). Consultas repetidas da mesma chave são respondidas em cache e não consomem o limite.

Este endpoint é um apoio à conferência do seu próprio saque, não um serviço de consulta cadastral. Se você precisa de um limite maior para uma operação legítima, fale com o suporte.

Disponibilidade
A confirmação depende da rota de saque configurada para a sua conta e pode não estar disponível. Quando não estiver, a API responde 409 com o código NOT_AVAILABLE_FOR_ROUTE — isso não impede o saque, apenas indica que a conferência prévia não pode ser feita por aqui. Nunca bloqueie seu fluxo de saque por causa deste endpoint.

Parâmetros (JSON Body)
Campo	Tipo	Obrigatório	Descrição
pixKey	string	Sim	Chave PIX a consultar
pixKeyType	string	Sim	CPF, CNPJ, PHONE, EMAIL ou EVP. COPIAECOLA não é aceito — use /pix/decode
Este endpoint respeita a mesma whitelist de IP do saque.


curl -X POST https://ggpixapi.com/api/v1/pix/key-lookup \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{
    "pixKey": "11999998888",
    "pixKeyType": "PHONE"
  }'
Resposta de Sucesso (200)

{
  "owner": {
    "name": "MARCIO CORREIA PANCHA",
    "tradeName": null,
    "documentMasked": "***.959.028-**",
    "bankName": "ITAÚ UNIBANCO S.A.",
    "keyType": "PHONE",
    "cached": false
  },
  "quota": {
    "limit": 147,
    "remaining": 146,
    "resetsAt": "2026-08-14T00:00:00.000Z"
  }
}
Campos da resposta
owner.name	Nome do titular registrado na chave
owner.tradeName	Nome fantasia, quando o titular é pessoa jurídica
owner.documentMasked	CPF/CNPJ parcialmente mascarado. O documento completo não é fornecido
owner.bankName	Instituição onde a chave está registrada
owner.cached	true quando a resposta veio do cache (não consumiu o seu limite)
quota.remaining	Quantas consultas ainda restam hoje
Erros
HTTP	code	O que fazer
404	NOT_FOUND	A chave não existe. Confira antes de tentar o saque
409	NOT_AVAILABLE_FOR_ROUTE	Conferência indisponível para a sua conta. Siga com o saque normalmente
429	QUOTA_EXCEEDED	Limite diário atingido. Aguarde a renovação ou fale com o suporte
503	UNAVAILABLE	Não foi possível consultar agora. Entre em contato com o suporte se quiser que a gente verifique o favorecido
GET
Consultar Status (Polling)
Consulta o status de uma transação específica. Ideal para polling quando você não usa webhooks.

GET
/api/v1/transactions/:id
Dica para Polling

Recomendamos polling a cada 5-10 segundos. Para alta performance, considere usar webhooks.

Status Possíveis
Status	Descrição
PENDING	Aguardando pagamento
COMPLETE	Pagamento confirmado
FAILED	Falha no processamento
CANCELED	Cancelado ou expirado

curl -X GET "https://ggpixapi.com/api/v1/transactions/8f320895-6ef1-4e9f-bfd3-d76efb40370e" \
  -H "X-API-Key: sua_api_key"

{
  "id": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "type": "PIX_IN",
  "status": "COMPLETE",
  "amount": 10000,
  "gatewayFee": 77,
  "netAmount": 9923,
  "description": "Pagamento do pedido #123",
  "customerName": "Joao Silva",
  "customerDocument": "52998224725",
  "externalId": "order-123",
  "endToEndId": "E00038166202501151035s0aB1c2d3e4",
  "payer": {
    "name": "MARIA SOUZA",
    "document": "12345678909",
    "bankName": "NUBANK"
  },
  "recipient": null,
  "metadata": { "orderId": 123 },
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:31:00.000Z",
  "paidAt": "2025-01-15T10:31:00.000Z",
  "splitTransactions": []
}
Pagador e recebedor (payer / recipient)

Em PIX_IN confirmado, o objeto payer traz quem efetivamente pagou o PIX. Em PIX_OUT confirmado, o objeto recipient traz quem efetivamente recebeu o saque, conforme reportado pela instituição de pagamento. Ambos têm a mesma forma: name (nome do titular), document (CPF/CNPJ, somente dígitos) e bankName (banco). Cada subcampo pode vir null quando a origem não informa. O campo que não se aplica ao tipo da transação vem null (ex.: recipient é null num PIX_IN). Não confunda com customerName/customerDocument, que são os dados informados por você ao criar a transação.

// Trecho de um PIX_OUT (saque) confirmado:
"type": "PIX_OUT",
"status": "COMPLETE",
"payer": null,
"recipient": {
  "name": "HENRIQUE GARCIA",
  "document": "12345678909",
  "bankName": "NUBANK"
}
POST
Verificar Estorno
Dispara a verificação de estorno de um saque PIX Copia e Cola já confirmado. Use quando o pagamento foi concluído mas você suspeita que o destinatário devolveu (estornou) o valor.

POST
/api/v1/transactions/:id/verify-refund
Requisitos
Condição	Descrição
Tipo	Saque (PIX_OUT) com status COMPLETE
Chave PIX	Somente saques via COPIAECOLA (Copia e Cola / QR Code)
Janela	Até 5 dias após a criação da transação
Rate limit	1 verificação a cada 15 minutos por transação
A verificação não credita o saldo na hora

Este endpoint apenas dispara a checagem. Se o estorno for confirmado, o valor volta para o seu saldo de forma assíncrona: a transação muda para CANCELED e você é notificado via webhook. Acompanhe o resultado com GET /api/v1/transactions/:id/refund-status ou pela consulta de status da transação. A taxa do gateway do saque original não é devolvida.


curl -X POST "https://ggpixapi.com/api/v1/transactions/8f320895-6ef1-4e9f-bfd3-d76efb40370e/verify-refund" \
  -H "X-API-Key: sua_api_key"

{
  "transactionId": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "refundRequested": true,
  "refunded": false,
  "refundAmount": null,
  "refundType": null,
  "status": "checking"
}
Campos da resposta
Campo	Descrição
refundRequested	Verificação aceita e em andamento na instituição de pagamento.
refunded	true quando o estorno já foi confirmado.
refundAmount	Valor estornado em centavos (null enquanto não confirmado).
refundType	"full" ou "partial" (null enquanto não confirmado).
status	checking (em verificação) ou refunded (estorno confirmado).
GET
Consultar Status do Estorno
Consulta o progresso de uma verificação de estorno já disparada. Faca polling deste endpoint após chamar verify-refund.

GET
/api/v1/transactions/:id/refund-status

curl -X GET "https://ggpixapi.com/api/v1/transactions/8f320895-6ef1-4e9f-bfd3-d76efb40370e/refund-status" \
  -H "X-API-Key: sua_api_key"

{
  "transactionId": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "refunded": true,
  "refundAmount": 5000,
  "refundType": "full",
  "status": "refunded"
}
GET
Consultar Saldo
GET
/api/v1/balance

{
  "balance": 1500000,
  "balanceFormatted": "R$ 15000.00"
}
Cartões Virtuais
Gere cartões virtuais para os seus usuários direto pela API. Cada cartão é pré-pago: o saldo dele sai do seu saldo na conta e o cartão só pode gastar o que foi carregado. Não existe limite de quantos cartões você pode gerar.

Como o dinheiro se move

1. Você gera o cartão — cobramos a taxa de emissão do seu saldo.

2. Você carrega o cartão — debitamos o valor + a taxa de carga do seu saldo, e o valor fica disponível no cartão.

3. O portador compra — o valor sai do saldo do cartão (não do seu saldo, que já foi debitado na carga). Cobramos a taxa por compra.

4. Você cancela — o cartão para de funcionar. O saldo que sobrou não volta para a sua conta.

Como controlar o limite de gasto
O limite de gasto do cartão é o saldo carregado nele. Não existe um campo de limite separado: o cartão autoriza compras até o valor que você carregou e recusa a partir daí. Então o controle é todo seu, pela API:

Você quer	Como faz
Definir o limite já na emissão	POST /api/v1/cards com initialLoadCents
Aumentar o limite	POST /api/v1/cards/{cardId}/load — cargas somam ao que já estava lá
Consultar o limite disponível agora	GET /api/v1/cards/{cardId} → balance.availableCents
Congelar o gasto na hora (reversível)	POST /api/v1/cards/{cardId}/block — o saldo fica parado até o unblock
Encerrar o cartão	POST /api/v1/cards/{cardId}/cancel — definitivo, sem devolução de saldo
A carga não é estornável.

Depois de carregado, o valor só sai do cartão sendo gasto nele. Não existe estorno de carga, não existe redução parcial de saldo, e cancelar o cartão não devolve o que sobrou.

Por isso, carregue o cartão com o valor que você realmente quer liberar para aquele gasto. Para limite por período (diário, semanal, mensal), carregue o valor do período e faça a próxima carga só no período seguinte — assim o cartão nunca tem mais poder de compra do que você liberou.

Status do cartão
Status	O que significa
ACTIVE	Ativo, autoriza compras até o saldo carregado
BLOCKED	Não autoriza compras novas. O saldo continua no cartão e pode ser desbloqueado
CANCELED	Encerrado em definitivo. Não autoriza mais nada e o saldo que não foi gasto é perdido
GET
Taxas do Cartão
Devolve as taxas vigentes na sua conta. São três cobranças independentes — use este endpoint para mostrar o custo ao seu usuário antes de gerar ou carregar, em vez de fixar valores no seu código.
Mudanca de contrato: em purchase, o campo fixedCents foi substituído por minimumCents. A compra deixou de somar percentual + fixo e passou a cobrar o maior entre os dois, igual a carga. Se você reproduzia a conta no seu código, troque a soma pelo maior.

GET
/api/v1/cards/fees
Cobrança	Quando incide	Fórmula
issue	A cada cartão gerado	Valor fixo
load	A cada carga	O maior entre o mínimo e o percentual do valor
purchase	A cada compra aprovada	O maior entre o mínimo e o percentual do valor

{
  "enabled": true,
  "issue": { "feeCents": 400 },
  "load": { "percent": 0.02, "minimumCents": 77 },
  "purchase": { "percent": 0.02, "minimumCents": 77 }
}
POST
Gerar Cartão
POST
/api/v1/cards
holderName precisa ter nome e sobrenome, só letras. Números e símbolos são removidos e acentos são convertidos; o nome final é gravado em maiúsculas e truncado em 26 caracteres.

Se você enviar initialLoadCents, o cartão já nasce carregado — cobramos a taxa de emissão e a de carga.

Parâmetros
Campo	Tipo	Descrição
holderName *	string	Nome do portador. Nome e sobrenome, apenas letras
nickname	string	Apelido livre para você identificar o cartão (max. 60)
singleUse	boolean	Cartão de uso único. Padrão false
initialLoadCents	integer	Carga inicial em centavos. Entre 500 e 5000000

curl -X POST https://ggpixapi.com/api/v1/cards \
  -H "X-API-Key: sua_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "holderName": "Joao da Silva",
    "nickname": "Anuncios",
    "initialLoadCents": 30000
  }'

{
  "card": {
    "id": "7d219916-2c09-4028-b93a-e165710cee2a",
    "panMasked": "524674******5792",
    "last4": "5792",
    "expiryDate": "08/2032",
    "holderName": "JOAO DA SILVA",
    "nickname": "Anuncios",
    "status": "ACTIVE",
    "singleUse": false,
    "totals": {
      "loadedCents": 30000,
      "spentCents": 0,
      "refundedCents": 0,
      "returnedCents": 0
    },
    "balance": null,
    "createdAt": "2026-08-08T04:12:33.000Z",
    "canceledAt": null
  },
  "issueFeeCents": 400,
  "load": { "amountCents": 30000, "feeCents": 600 }
}
GET
Listar e Consultar Cartões
GET
/api/v1/cards
Aceita page, limit (max. 200) e status (ACTIVE, BLOCKED, CANCELED).

GET
/api/v1/cards/{cardId}
A consulta de um cartão específico traz o campo balance preenchido com o saldo ao vivo: availableCents é o que dá para gastar agora e pendingCents é o que já foi autorizado numa compra e ainda está sendo processado. Na listagem esse campo vem null, porque consultar saldo cartão a cartão deixaria a resposta lenta.


{
  "card": {
    "id": "7d219916-2c09-4028-b93a-e165710cee2a",
    "panMasked": "524674******5792",
    "last4": "5792",
    "status": "ACTIVE",
    "balance": { "availableCents": 29500, "pendingCents": 500 },
    "totals": { "loadedCents": 30000, "spentCents": 500, "refundedCents": 0, "returnedCents": 0 }
  }
}
GET
Número e CVV
GET
/api/v1/cards/{cardId}/sensitive
Dado sensível. O número completo e o CVV não ficam guardados do nosso lado: são lidos na hora e devolvidos só nesta resposta.

Não registre esses valores em log, não guarde em banco e não coloque em cache. A resposta já vem com Cache-Control: no-store.

Consulte sob demanda, no momento em que o seu usuário for usar o cartão.


{
  "pan": "5246740000005792",
  "cvv": "732",
  "expiryDate": "08/2032",
  "holderName": "JOAO DA SILVA"
}
POST
Carregar Cartão
POST
/api/v1/cards/{cardId}/load
Debita valor + taxa do seu saldo e disponibiliza o valor no cartão. Cargas acumulam: carregar de novo soma ao que já estava lá — e é assim que você aumenta o limite de gasto do cartão. Mínimo R$ 5,00, máximo R$ 50.000,00 por carga.

Carga sem volta. Não existe endpoint de estorno de carga nem de redução de saldo. O valor carregado só sai do cartão sendo gasto — e cancelar o cartão não devolve o que sobrou.

Carregue o valor que você quer liberar de fato. Para reduzir a exposição sem perder dinheiro, use /block: o gasto para na hora e o saldo continua no cartão para quando você desbloquear.

Campo	Tipo	Descrição
amountCents *	integer	Valor a carregar, em centavos

{
  "loadedCents": 10000,
  "feeCents": 200,
  "totalDebitedCents": 10200,
  "transactionId": "acca25e3-fbe6-4373-b519-78ba04ec7db5"
}
POST
Bloquear, Desbloquear e Cancelar
POST
/api/v1/cards/{cardId}/block
POST
/api/v1/cards/{cardId}/unblock
POST
/api/v1/cards/{cardId}/cancel
Bloquear é reversível: o cartão para de autorizar compras novas, o saldo continua nele e o desbloqueio devolve tudo ao normal. É o jeito certo de suspender o gasto sem perder o que já foi carregado. Cancelar é definitivo: encerramos o cartão e ele não autoriza mais nada.

Cancelar não devolve saldo. O que não foi gasto até o cancelamento é perdido — a carga não é estornável.

O campo forfeitedCents na resposta diz quanto foi perdido, só para você conciliar. returnedCents continua no corpo por compatibilidade e vale sempre 0.

Se ainda houver saldo útil no cartão, gaste antes de cancelar — ou use /block, que segura o gasto sem perder nada.

HTTP 409 no cancelamento — código PENDING_AUTHORIZATIONS.

Acontece quando existe compra já autorizada que ainda não terminou de ser processada. Encerrar o cartão antes disso deixaria essa compra sem lastro. Bloqueie o cartão para impedir gastos novos e tente cancelar de novo em alguns dias.


{
  "canceled": true,
  "returnedCents": 0,
  "forfeitedCents": 29500
}
GET
Extrato do Cartão
GET
/api/v1/cards/{cardId}/transactions
GET
/api/v1/cards/transactions
O primeiro traz o extrato de um cartão; o segundo, de todos os cartões da conta (aceita startDate e endDate). Ambos aceitam page e limit (max. 200) e vêm ordenados do lançamento mais recente para o mais antigo.

O extrato é a vida inteira do cartão: a emissão, cada carga, as compras aprovadas e as recusadas, estornos, liquidações, verificações e os tributos da compra internacional. Nada é omitido — o que muda de uma linha para outra é apenas de qual saldo ela tirou dinheiro, e isso vem explícito em cada lançamento.

O extrato é atualizado sozinho em segundo plano, então normalmente basta consultar.

Se precisar do dado mais fresco possível numa tela, use ?sync=true na rota de um cartão: forçamos a atualização antes de responder. Ela é mais lenta — não use em polling.

O extrato traz tudo que acontece no cartão, com o mesmo detalhe do app de um cartão comum — não só as compras. Quatro cuidados ao consumir:

1. Some por affectsBalance + direction, nunca por type. Só as linhas com affectsBalance: true movem o saldo do cartão: CREDIT soma, DEBIT subtrai. Ficam de fora verificação (vale R$ 0,00), liquidação (repetição de uma compra já listada), emissão e tudo que foi recusado ou não concluiu. Lista fixa de tipos quebra quando um tipo novo aparece; esses dois campos, não.

2. A taxa do gateway NÃO sai do cartão. Ela é debitada do saldo da sua conta — é o que diz feeChargedFrom: "ACCOUNT_BALANCE". O quanto cada linha custou à conta (taxa, e na carga também o valor carregado) está em accountDebitCents: somando essa coluna você tem o custo total do cartão para a conta, sem contar nada duas vezes.

3. Uma linha muda depois de criada. Uma compra liquida, estorna ou é revertida, e o id continua o mesmo. Reconcilie por updatedAt, não só por occurredAt.

4. ISSUER_FEE não é cobrança nossa. São o IOF e o spread cambial de uma compra internacional do próprio portador — debitados do cartão dele e identificados pelo nome real do tributo em merchantName. A compra que os gerou vem em relatedTo. O que o gateway cobra está sempre em feeCents, e nesse tipo de linha ele é zero.

Campos do lançamento
Campo	Descrição
type	O extrato traz TUDO que acontece no cartão, não só compra:
ISSUE emissão do cartão (cobra só a taxa, da conta) · LOAD carga: sai da sua conta e entra no cartão · PURCHASE compra · REFUND estorno · VERIFICATION checagem de R$ 0,00 feita por uma plataforma ao cadastrar o cartão (o código que ela envia vem no merchantName) · SETTLEMENT liquidação de uma compra que já está na lista · ISSUER_FEE tributo/encargo da compra internacional (IOF e spread), debitado do cartão · UNLOAD devolução de carga (só em cartões anteriores à regra de carga sem volta).
Trate a lista como aberta: tipos novos podem entrar, e é por isso que a soma se faz por affectsBalance
affectsBalance	Se ESTA linha move o saldo do cartão. false em VERIFICATION (vale zero), SETTLEMENT (é o mesmo dinheiro de uma compra já listada), ISSUE (só mexe na conta) e em qualquer lançamento recusado ou não concluído. Some só as linhas com true, respeitando o direction
direction	DEBIT tira do cartão · CREDIT põe no cartão (carga, estorno) · NONE não mexe. É o SINAL do lançamento — amountCents é sempre positivo
status	COMPLETE · DECLINED (compra ou verificação recusada pela rede) · PENDING / FAILED (operação nossa em curso ou que não se concretizou — carga que falhou tem o valor devolvido à conta e continua no extrato). O motivo vem em declineReason / responseMessage
source	ISSUER evento do cartão na rede (compra, estorno, verificação, liquidação, IOF) · GATEWAY operação sua sobre o cartão (emissão, carga, devolução)
accountDebitCents	Quanto ESTA linha tirou do saldo da sua conta (não do cartão). Na compra é só a nossa taxa — o valor comprado já saiu da conta lá na carga; na carga é valor + taxa; na emissão é a taxa de emissão. Negativo quando o dinheiro voltou para a conta
feeChargedFrom	Sempre ACCOUNT_BALANCE quando há taxa: taxa nossa nunca é debitada do cartão, e sim do saldo da conta, numa transação própria (feeTransactionId, que você encontra no extrato da conta)
amountCents	Valor em centavos, sempre positivo. Quem dá o sentido é o direction
description	Texto pronto da linha: o estabelecimento nas compras, ou o nome da operação nas linhas do gateway (Carga no cartão)
approved	false em compra ou verificação recusada. Recusa aparece no extrato como qualquer outra linha, não move saldo e não gera cobrança de taxa
merchantName	Nome do lançamento, como informado pela bandeira. É o descritor REAL: em compra é a loja, em verificação é o código que a plataforma envia (FACEBK *2QNW722EF4), em ISSUER_FEE é o nome do próprio tributo (IOF Compra Internacional). Nunca substituímos por rótulo nosso
authorizationCode	Código da compra na rede. É o que se informa numa contestação
mcc	Código da categoria do estabelecimento
merchantCategory	Categoria por extenso, quando conhecida (ex.: Restaurantes)
entryMode	Como o cartão foi apresentado (cartão salvo na loja, número digitado, compra online...)
recurring	true em cobrança recorrente (assinatura)
originalAmountCents
originalCurrency	Valor e moeda de ORIGEM. Preenchidos só quando houve conversão (compra internacional); o valor cobrado em BRL fica em amountCents
responseCode
responseMessage	Resultado da tentativa no padrão ISO 8583, com o texto por extenso (ex.: 51 / "Saldo insuficiente no cartão"). Código desconhecido vem como Codigo NN, nunca omitido
billingCurrency	Moeda em que o cartão foi debitado. Sempre BRL hoje
authorizedAmountCents	Valor autorizado. Difere de amountCents quando a loja captura menos do que autorizou (ex.: hotel, posto de combustível)
acquirerMerchantId
acquirerCountry	Identificador do estabelecimento no adquirente dele e o país da praça
cleared / reversed	Se a compra já liquidou e se foi revertida
localTime	Hora informada pela loja. Pode diferir de occurredAt
settledAt	Só em SETTLEMENT: quando a liquidação foi registrada
updatedAt	Última vez que a rede reprocessou o lançamento. Uma compra muda depois de criada (liquida, estorna), então reconcilie por este campo, não só por occurredAt
relatedTo	De qual lançamento este é consequência: SETTLEMENT_OF (liquidação daquela compra) ou FEE_OF (imposto daquela compra), com o id e o valor dela
feeCents	Taxa que cobramos por este lançamento. Cobram taxa a compra e a verificação (as duas são evento de cartão); não cobram estorno, recusa, liquidação nem o encargo da compra internacional
occurredAt	Data e hora da compra

{
  "transactions": [
    {
      "id": "1f0c8a2e-5b41-4a77-9a1e-0f2b6c3d4e5f",
      "cardId": "7d219916-2c09-4028-b93a-e165710cee2a",
      "cardLast4": "5792",
      "cardNickname": "Anuncios",
      "type": "PURCHASE",
      "source": "ISSUER",
      "status": "COMPLETE",
      "direction": "DEBIT",
      "affectsBalance": true,
      "accountDebitCents": 80,
      "feeChargedFrom": "ACCOUNT_BALANCE",
      "feeTransactionId": "b842f863-d687-45cb-8fd8-d6ae2f28b175",
      "description": "DramaBox_A U243550519",
      "amountCents": 3135,
      "currency": "986",
      "billingCurrency": "BRL",
      "authorizedAmountCents": 3135,
      "originalAmountCents": 580,
      "originalCurrency": "USD",
      "approved": true,
      "declineReason": null,
      "responseCode": "0",
      "responseMessage": "Aprovada",
      "merchantName": "DramaBox_A U243550519",
      "merchantCity": "Singapore",
      "merchantCountry": "SGP",
      "mcc": "5817",
      "merchantCategory": "Midia digital (livros, filmes, musica)",
      "acquirerMerchantId": "230120003117025",
      "acquirerCountry": "SGP",
      "authorizationCode": "DEE1303F1BD72B561A686CF5D3ACE86F",
      "entryMode": "Compra online",
      "recurring": false,
      "cleared": true,
      "reversed": false,
      "localTime": "2026-08-10T07:09:02.000Z",
      "settledAt": null,
      "updatedAt": "2026-08-10T09:16:32.791Z",
      "relatedTo": null,
      "feeCents": 80,
      "occurredAt": "2026-08-09T23:09:28.609Z"
    },
    {
      "id": "2ac6b75f-a388-4240-9486-2a65d26ee981",
      "cardId": "7d219916-2c09-4028-b93a-e165710cee2a",
      "cardLast4": "5792",
      "cardNickname": "Anuncios",
      "type": "ISSUER_FEE",
      "affectsBalance": true,
      "amountCents": 109,
      "currency": null,
      "billingCurrency": "BRL",
      "authorizedAmountCents": 109,
      "originalAmountCents": null,
      "originalCurrency": null,
      "approved": true,
      "declineReason": null,
      "responseCode": "0",
      "responseMessage": "Aprovada",
      "merchantName": "IOF Compra Internacional",
      "merchantCity": null,
      "merchantCountry": null,
      "mcc": null,
      "merchantCategory": null,
      "acquirerMerchantId": null,
      "acquirerCountry": null,
      "authorizationCode": "DC09FE424832C27302AA0EE2A4095FA8",
      "entryMode": null,
      "recurring": null,
      "cleared": null,
      "reversed": null,
      "localTime": null,
      "settledAt": null,
      "updatedAt": "2026-08-10T09:14:17.118Z",
      "relatedTo": {
        "relation": "FEE_OF",
        "id": "1f0c8a2e-5b41-4a77-9a1e-0f2b6c3d4e5f",
        "merchantName": "DramaBox_A U243550519",
        "amountCents": 3135
      },
      "feeCents": 0,
      "occurredAt": "2026-08-09T23:09:30.222Z"
    },
    {
      "id": "2a7d1b93-8c02-4f15-b6d3-91a4e5c70b28",
      "cardId": "7d219916-2c09-4028-b93a-e165710cee2a",
      "cardLast4": "5792",
      "cardNickname": "Anuncios",
      "type": "VERIFICATION",
      "affectsBalance": false,
      "amountCents": 0,
      "currency": "986",
      "billingCurrency": "BRL",
      "authorizedAmountCents": 0,
      "originalAmountCents": null,
      "originalCurrency": null,
      "approved": true,
      "declineReason": null,
      "responseCode": "85",
      "responseMessage": "Cartao validado com sucesso",
      "merchantName": "FACEBK *2QNW722EF4",
      "merchantCity": "SAO PAULO",
      "merchantCountry": "BRA",
      "mcc": "7311",
      "merchantCategory": "Publicidade e anuncios",
      "acquirerMerchantId": "CARD ACCPT IDC",
      "acquirerCountry": "USA",
      "authorizationCode": "DC295081C88598B29C4F99331AC47C56",
      "entryMode": "Cartao salvo na loja",
      "recurring": false,
      "cleared": false,
      "reversed": false,
      "localTime": "2026-08-08T11:19:00.000Z",
      "settledAt": null,
      "updatedAt": "2026-08-08T14:19:40.000Z",
      "relatedTo": null,
      "feeCents": 80,
      "occurredAt": "2026-08-08T14:19:02.000Z"
    },
    {
      "id": "6b1f0d54-9e77-4a30-8f2c-1d5b8e6a3c90",
      "cardId": "7d219916-2c09-4028-b93a-e165710cee2a",
      "cardLast4": "5792",
      "cardNickname": "Anuncios",
      "type": "PURCHASE",
      "source": "ISSUER",
      "status": "DECLINED",
      "direction": "DEBIT",
      "affectsBalance": false,
      "accountDebitCents": 0,
      "feeChargedFrom": null,
      "feeTransactionId": null,
      "description": "STEAMGAMES.COM",
      "amountCents": 15000,
      "currency": "986",
      "billingCurrency": "BRL",
      "approved": false,
      "declineReason": "Compra nao autorizada",
      "responseCode": "51",
      "responseMessage": "Saldo insuficiente no cartao",
      "merchantName": "STEAMGAMES.COM",
      "merchantCity": "BELLEVUE",
      "merchantCountry": "USA",
      "mcc": "5816",
      "merchantCategory": "Jogos digitais",
      "authorizationCode": "A1B2C3D4E5F60718293A4B5C6D7E8F90",
      "entryMode": "Compra online",
      "relatedTo": null,
      "feeCents": 0,
      "occurredAt": "2026-08-08T13:02:11.000Z"
    },
    {
      "id": "3e8a5c17-4d62-4b19-9c73-6f0a2d1e8b45",
      "cardId": "7d219916-2c09-4028-b93a-e165710cee2a",
      "cardLast4": "5792",
      "cardNickname": "Anuncios",
      "type": "LOAD",
      "source": "GATEWAY",
      "status": "COMPLETE",
      "direction": "CREDIT",
      "affectsBalance": true,
      "accountDebitCents": 30600,
      "feeChargedFrom": "ACCOUNT_BALANCE",
      "feeTransactionId": null,
      "description": "Carga no cartao",
      "amountCents": 30000,
      "currency": "BRL",
      "approved": true,
      "declineReason": null,
      "merchantName": null,
      "merchantCity": null,
      "merchantCountry": null,
      "mcc": null,
      "relatedTo": null,
      "feeCents": 600,
      "settledAt": "2026-08-08T12:00:03.000Z",
      "occurredAt": "2026-08-08T12:00:01.000Z"
    },
    {
      "id": "9c4e2f80-1a35-4d68-b7e9-52c8a0f3d716",
      "cardId": "7d219916-2c09-4028-b93a-e165710cee2a",
      "cardLast4": "5792",
      "cardNickname": "Anuncios",
      "type": "ISSUE",
      "source": "GATEWAY",
      "status": "COMPLETE",
      "direction": "NONE",
      "affectsBalance": false,
      "accountDebitCents": 400,
      "feeChargedFrom": "ACCOUNT_BALANCE",
      "feeTransactionId": null,
      "description": "Emissao do cartao",
      "amountCents": 0,
      "currency": "BRL",
      "approved": true,
      "declineReason": null,
      "merchantName": null,
      "relatedTo": null,
      "feeCents": 400,
      "occurredAt": "2026-08-08T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 5, "pages": 1 }
}
Webhooks do Cartão
Em vez de consultar o extrato de tempos em tempos, receba o evento na hora. Cadastre uma ou mais URLs e avisamos a cada compra, recusa, carga, estorno ou mudança de status. O polling continua funcionando e continua sendo a rede de segurança — o webhook é o atalho.

Os destinos de cartão são independentes da URL de webhook do PIX: dá para mandar compra e carga de cartão para um sistema e o PIX para outro. Dá para cadastrar pelos endpoints abaixo ou, sem escrever código, no painel em Credenciais e Webhooks → Cartões — mesma lista, mesmos destinos.

POST
/api/v1/cards/webhooks
cadastra um destino
GET
/api/v1/cards/webhooks
lista, com a saúde de cada um
PATCH
/api/v1/cards/webhooks/{id}
liga/desliga, troca eventos
DELETE
/api/v1/cards/webhooks/{id}
remove
Cadastrar

curl -X POST https://ggpixapi.com/api/v1/cards/webhooks \
  -H "X-API-Key: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seusistema.com/webhooks/cartao",
    "label": "producao"
  }'
A resposta traz um secret — guarde: ele aparece UMA única vez. É com ele que você confere a assinatura de cada entrega. Perdeu? Apague o destino e cadastre outro.

Regras da URL: http ou https, host público (endereço interno é recusado), portas 80, 443, 8080 ou 8443. Até 20 destinos por conta.

Vários destinos
Cadastre quantos quiser — todos recebem. Cada destino pode ser da conta inteira (padrão) ou de um cartão só, passando cardId: é o caso de quem emite um cartão por cliente e quer o evento no sistema daquele cliente. Se a mesma URL casar pelos dois caminhos, ela recebe uma vez só.

Atalho: mandando webhookUrl no corpo do POST /api/v1/cards, o destino daquele cartão já nasce junto com ele — e a resposta da emissão traz o secret. Assim você não perde nem o card.issued.

Por padrão o destino recebe todos os eventos. Para filtrar, mande events com a lista desejada — evento desconhecido é recusado na hora do cadastro, para um erro de digitação não virar "meu webhook não chega".

Eventos
event	Quando dispara
card.issued	Cartão emitido
card.load.completed	Carga concluída — o saldo já está no cartão
card.load.failed	Carga não se concretizou; o valor voltou para o seu saldo
card.purchase.approved	Compra aprovada
card.purchase.declined	Compra recusada. Evento PRÓPRIO: você não precisa inspecionar o corpo para saber se deve agir
card.purchase.updated	A rede mudou um lançamento que você já recebeu: valor, sentido (virou estorno) ou resultado (passou a recusada). O transaction.id é o mesmo — atualize, não crie outro.
A liquidação de uma compra NÃO vem por aqui: ela chega como card.settlement, em lançamento próprio.
card.refund	Estorno creditado no cartão
card.settlement	Liquidação de uma compra já avisada. Mesmo dinheiro — não debite de novo
card.verification	Checagem de R$ 0,00 (cadastro em carteira digital, cartão on-file)
card.issuer_fee	IOF ou spread de compra internacional
card.status_changed	Cartão bloqueado, desbloqueado ou cancelado
O corpo
O campo transaction é exatamente a mesma linha que o extrato devolveria para aquele lançamento — mesmos campos, mesmo significado, incluindo affectsBalance, direction e accountDebitCents. Quem já lê o extrato não aprende formato novo. Em card.status_changed ele vem null: não há dinheiro envolvido.


{
  "id": "0e542b1c-2303-4870-a192-f5e60903b025",
  "event": "card.purchase.approved",
  "sentAt": "2026-08-11T16:45:40.407Z",
  "card": {
    "id": "7d219916-2c09-4028-b93a-e165710cee2a",
    "last4": "5792",
    "nickname": "Anuncios",
    "status": "ACTIVE"
  },
  "transaction": {
    "id": "1f0c8a2e-5b41-4a77-9a1e-0f2b6c3d4e5f",
    "type": "PURCHASE",
    "status": "COMPLETE",
    "direction": "DEBIT",
    "affectsBalance": true,
    "amountCents": 3135,
    "accountDebitCents": 80,
    "feeCents": 80,
    "feeChargedFrom": "ACCOUNT_BALANCE",
    "merchantName": "DramaBox_A U243550519",
    "occurredAt": "2026-08-09T23:09:28.609Z"
  }
}
Conferindo a assinatura
Toda entrega leva o cabeçalho X-Webhook-Signature no formato t=<epoch>,v1=<hmac>. O HMAC é SHA-256 de <t>.<corpo cru> com o seu secret. É o mesmo formato do webhook de PIX: quem já valida um, valida o outro.


const crypto = require("crypto");

function assinaturaConfere(corpoCru, cabecalho, secret) {
  const m = /t=(\d+),v1=([a-f0-9]+)/.exec(cabecalho || "");
  if (!m) return false;
  const esperada = crypto
    .createHmac("sha256", secret)
    .update(`${m[1]}.${corpoCru}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(esperada), Buffer.from(m[2]));
}
Responda 2xx. Qualquer outra coisa (ou silêncio por mais de 10s) vira retentativa: até 6 tentativas com espera crescente — ~5s, 10s, 20s, 40s, 80s. O número da tentativa vem em X-Attempt.

Trate como podendo repetir. Uma entrega repetida é normal (retentativa depois de um timeout que na verdade chegou). Use o id do evento como chave de idempotência.

Webhook não substitui a conferência. Se o seu servidor ficar fora do ar além das tentativas, o evento se perde — e o extrato continua lá, completo, como fonte de verdade. Uma consulta periódica de segurança é barata.

Cadastrou e não chega nada? GET /api/v1/cards/webhooks mostra lastFailureAt, lastFailureError e consecutiveFailures do destino.

Saque em Cripto Multiativo
Converta seu saldo em BRL para USDT e envie direto para uma carteira de sua escolha. O valor é debitado do seu saldo e o USDT é entregue no endereço informado. Redes USDT disponíveis (campo network):

bsc
BSC / BEP-20 (padrão) · endereço 0x...

polygon
Polygon PoS · endereço 0x...

tron
Tron / TRC-20 · endereço T...

Polygon e Tron podem estar desativadas; consulte GET /api/v1/crypto/config (campo usdtNetworks) para ver o que está ativo agora. Além de USDT, o saque também sai em BTC, XMR, ETH, LTC, TRX e SOL, cada uma na rede nativa da moeda (escolha pelo campo asset).

Escolha a rede pelo campo network (default bsc). O walletAddress deve ser do formato da rede — 0x... em BSC/Polygon, T... na Tron. Um endereço T... sem network assume Tron automaticamente.
O valor mínimo e máximo por saque está em GET /api/v1/crypto/config.
Você pode enviar o walletAddress direto na requisição, ou referenciar uma carteira salva no painel via walletId.
Use GET /api/v1/crypto/quote para estimar quanto seu merchant vai receber no ativo escolhido.
Acompanhe o status (incluindo txHash quando entregue) via GET /api/v1/transactions/:id.
Segurança obrigatória
O endpoint POST /api/v1/crypto/withdraw exige IP whitelist. Operações on-chain são irreversíveis: uma vez enviado, não há como cancelar o saque. Forneca sempre um externalId único para garantir idempotência.

GET
Configuração de Saque Cripto
GET
/api/v1/crypto/config
Retorna a disponibilidade atual, os limites em centavos de BRL, os ativos habilitados e as redes de entrega. Monte seletores e validações a partir desta resposta, pois ativos ou redes podem ficar temporariamente indisponíveis.

Exemplo de resposta 200

{
  "enabled": true,
  "minAmountBRLCents": 10500,
  "maxAmountBRLCents": 5000000,
  "assets": ["USDT", "XMR", "BTC", "ETH", "LTC", "TRX", "SOL"],
  "usdtNetworks": [
    { "network": "bsc", "label": "BSC (BEP-20)" },
    { "network": "polygon", "label": "Polygon (PoS)" }
  ],
  "assetNetworks": {
    "USDT": "BNB Smart Chain (BEP-20)",
    "XMR": "Monero",
    "BTC": "Bitcoin",
    "ETH": "Ethereum",
    "LTC": "Litecoin",
    "TRX": "Tron",
    "SOL": "Solana"
  }
}
GET
Carteiras Salvas
GET
/api/v1/crypto/wallets
Lista as carteiras que você salvou no Painel do Merchant (com label opcional). Cada carteira tem um asset (um dos ativos retornados por GET /crypto/config) — o saque herda esse ativo. Use o id retornado como walletId na chamada de saque. O cadastro de novas carteiras é feito apenas pelo painel (requer 2FA + PIN).

Resposta 200

{
  "wallets": [
    {
      "id": "cly0abc123",
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "asset": "USDT",
      "label": "Wallet principal",
      "createdAt": "2026-04-20T10:00:00.000Z"
    },
    {
      "id": "cly0xmr456",
      "address": "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A",
      "asset": "XMR",
      "label": "Minha carteira Monero",
      "createdAt": "2026-06-29T10:00:00.000Z"
    }
  ]
}
GET
Cotação (Estimativa)
GET
/api/v1/crypto/quote
Cotação bidirecional. Envie exatamente um dos dois parâmetros: amountBRLCents (descobrir quanto chega no ativo escolhido) ou amountUSDT (descobrir quanto BRL pagar para receber um valor exato de USDT). A cotação é volátil; o valor efetivamente entregue pode variar ligeiramente (consulte actualUSDT na consulta de status após a conclusão).

Parâmetros de Query
amountBRLCents (inteiro, opcional) — valor em centavos de BRL. Caminho normal: retorna a estimativa no ativo escolhido.
amountUSDT (número, opcional) — quantia desejada de USDT (aceita decimais). Caminho reverso: retorna quanto BRL precisa pagar. Disponível apenas para asset=USDT.
asset (string, opcional) — USDT (padrão), XMR, BTC, ETH, LTC, TRX ou SOL, desde que o ativo esteja listado em GET /crypto/config. Define a unidade de estimatedAmount.
network (string, opcional) — para USDT, envie uma das redes retornadas em usdtNetworks. Os demais ativos usam a rede indicada em assetNetworks.
Enviar amountBRLCents e amountUSDT ao mesmo tempo, ou nenhum, retorna HTTP 400. O caminho amountUSDT é exclusivo de asset=USDT.
Exemplo — BRL → USDT

curl "https://ggpixapi.com/api/v1/crypto/quote?amountBRLCents=11000" \
  -H "X-API-Key: SEU_API_KEY"

{
  "amountBRLCents": 11000,
  "asset": "USDT",
  "estimatedAmount": 21.255128,
  "estimatedUSDT": 21.255128,
  "hasLiquidity": true
}
Exemplo — BRL → XMR

curl "https://ggpixapi.com/api/v1/crypto/quote?amountBRLCents=11000&asset=XMR" \
  -H "X-API-Key: SEU_API_KEY"

{
  "amountBRLCents": 11000,
  "asset": "XMR",
  "estimatedAmount": 0.062184,
  "hasLiquidity": true
}
Exemplo — USDT → BRL (reverso)

curl "https://ggpixapi.com/api/v1/crypto/quote?amountUSDT=50" \
  -H "X-API-Key: SEU_API_KEY"

{
  "amountBRLCents": 26044,
  "asset": "USDT",
  "estimatedAmount": 50.002021,
  "estimatedUSDT": 50.002021,
  "hasLiquidity": true
}
O estimatedUSDT da resposta reverso é garantidamente >= ao alvo informado (pode ficar 1-2 µUSDT acima por arredondamento de centavos). Use o amountBRLCents retornado direto no POST /crypto/withdraw.
POST
Criar Saque Cripto
POST
/api/v1/crypto/withdraw
Debita o saldo em BRL do merchant e envia o equivalente no ativo escolhido para a carteira informada. Para USDT, use uma rede presente em usdtNetworks; os demais ativos seguem a rede indicada por assetNetworks. Exige IP whitelist configurado no painel.

Body (JSON)
amountBRLCents (inteiro, obrigatório) — valor em centavos de BRL a debitar.
externalId (string, obrigatório) — ID único da sua aplicação para idempotência. Reenviar a mesma requisição com o mesmo externalId retorna a transação existente em vez de duplicar o débito.
walletId (string, opcional) — ID de uma carteira salva (ver GET /crypto/wallets). O ativo do saque é herdado da carteira.
walletAddress (string, opcional) — endereço de destino. O formato depende do ativo/rede: EVM (0x...) para BSC/Polygon/Ethereum, base58 para Solana, endereço Monero para XMR e base58check para Tron. Informe walletId OU walletAddress, não ambos.
asset (string, opcional) — USDT (padrão), XMR, BTC, ETH, LTC, TRX ou SOL. Usado com walletAddress avulso e aceito somente quando listado em GET /crypto/config.
network (string, opcional) — rede de entrega do USDT: bsc (padrão), polygon ou tron. Polygon e Tron precisam estar habilitadas (fale com o suporte); rede indisponível retorna 400. O walletAddress deve ser do formato da rede: 0x... em BSC/Polygon (o mesmo endereço serve nas duas) e T... na Tron. Se você informar um endereço T... sem o campo network, a rede Tron é assumida automaticamente.
webhookUrl (string, opcional) — URL HTTPS para receber o callback desta transação. Se omitido, usa a URL configurada no painel do merchant. Bloqueia IPs privados, metadata services, domínios DNS-rebinding (nip.io, sslip.io etc) e o próprio domínio ggatepixapi.com por segurança.
Exemplo — Request USDT

curl -X POST https://ggpixapi.com/api/v1/crypto/withdraw \
  -H "X-API-Key: SEU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amountBRLCents": 3000,
    "externalId": "crypto-order-001",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "network": "polygon",
    "webhookUrl": "https://seusite.com/webhooks/crypto"
  }'
Exemplo — Request XMR

curl -X POST https://ggpixapi.com/api/v1/crypto/withdraw \
  -H "X-API-Key: SEU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amountBRLCents": 11000,
    "externalId": "crypto-order-xmr-001",
    "asset": "XMR",
    "walletAddress": "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A"
  }'
Resposta 201

{
  "id": "cly0txn123",
  "status": "PENDING",
  "amountBRLCents": 3000,
  "asset": "USDT",
  "network": "polygon",
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "estimatedUSDT": 5.49,
  "estimatedAmount": 5.49,
  "externalId": "crypto-order-001",
  "createdAt": "2026-04-23T12:00:00.000Z"
}
O campo estimatedAmount vem na unidade de asset. estimatedUSDT é mantido apenas nas respostas de USDT; para XMR, BTC, ETH, LTC, TRX e SOL use o campo genérico. Um replay idempotente (mesmo externalId) retorna a transação existente com HTTP 200 (não 201).

Acompanhamento do status
Consulte GET /api/v1/crypto/withdraw/:id para acompanhar o saque. O webhook configurado também receberá os eventos de mudança de status (mesmo formato dos webhooks PIX Out, veja Webhooks).
Erros comuns
400 — valor fora dos limites, parâmetros inválidos, rede indisponível ou endereço incompatível com o ativo/rede.
400 — "Saldo insuficiente para realizar esta operação".
400/503 — "Saque neste ativo está indisponível no momento" (ativo não habilitado) ou "Valor abaixo do mínimo para este ativo".
403 — IP não está na whitelist (configure em "Credenciais e Webhooks" > "IPs Permitidos").
404 — walletId não encontrada para este merchant.
409 — externalId duplicado com requisição diferente.
503 — saque cripto temporariamente indisponível.
POST
Depósito PIX → Cripto
POST
/api/v1/pix-to-crypto/deposit
Gera uma cobrança PIX que, ao ser paga, não credita saldo na sua conta: o valor é convertido e entregamos USDT (BSC, Polygon ou Tron) direto na carteira que você informar. Ideal para quem vende em PIX e quer receber cripto automaticamente. O valor final em USDT é cotado no momento da confirmação do pagamento (cotação flutuante) — a resposta da criação traz apenas uma estimatedUSDT.

Recurso liberado sob demanda (whitelist): fale com o suporte para habilitar na sua conta. Exige IP whitelist configurado (por ser uma entrega de cripto).

Sem CPF/CNPJ do pagador

Este fluxo não exige CPF nem CNPJ do pagador: a cobrança PIX é gerada sem o documento e o pagador só precisa pagar e receber o cripto. O payerDocument continua aceito por compatibilidade, mas é opcional. O mesmo vale para o checkout hospedado (/pay/<link>), que não pede documento ao pagador.

Body (JSON)
amountCents (inteiro, obrigatório) — valor em centavos de BRL que o pagador vai pagar via PIX.
walletAddress (string, obrigatório) — endereço que receberá o USDT, no formato da rede: 0x... para BSC e Polygon, T... para Tron.
network (string, opcional) — rede de entrega: BSC (padrão), POLYGON ou TRON. Se a rede pedida estiver indisponível no momento, a criação retorna 400 (não geramos a cobrança sem poder entregar).
payerName (string, obrigatório) — nome do pagador.
payerDocument (string, opcional) — CPF/CNPJ do pagador. Não é exigido neste fluxo: a cobrança é gerada sem o documento do pagador. Se você optar por enviar, precisa ser um CPF/CNPJ válido.
asset (string, opcional) — USDT (padrão e único ativo disponível nesta fase).
description (string, opcional) — descrição da cobrança.
externalId (string, opcional) — ID único da sua aplicação para idempotência.
webhookUrl (string, opcional) — URL HTTPS para receber os callbacks. Se omitido, usa a URL do painel. Bloqueia IPs privados, metadata services, domínios DNS-rebinding e o próprio ggatepixapi.com.
metadata (object, opcional) — objeto livre repassado no webhook.
Exemplo — Request

curl -X POST https://ggpixapi.com/api/v1/pix-to-crypto/deposit \
  -H "X-API-Key: SEU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 50000,
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "asset": "USDT",
    "network": "BSC",
    "payerName": "Joao da Silva",
    "externalId": "p2c-order-001",
    "webhookUrl": "https://seusite.com/webhooks/crypto"
  }'
Resposta 201

{
  "id": "cly0txn456",
  "status": "PENDING",
  "amount": 50000,
  "asset": "USDT",
  "network": "BSC",
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "estimatedUSDT": 89.42,
  "pixCode": "00020126...",
  "pixCopyPaste": "00020126...5204000053039865802BR...",
  "externalId": "p2c-order-001",
  "createdAt": "2026-07-02T12:00:00.000Z"
}
estimatedUSDT é apenas uma estimativa no momento da criação. O valor efetivamente enviado é recalculado com a cotação vigente quando o pagamento PIX for confirmado.

Fluxo
Você cria o depósito e mostra o pixCopyPaste ao pagador.
O pagador paga o PIX.
Ao confirmar, entregamos o USDT na walletAddress, na rede escolhida em network, automaticamente.
Você recebe os callbacks de status no webhookUrl (mesmo formato dos webhooks PIX/cripto, veja Webhooks).
Erros comuns
400 — valor fora dos limites, endereço BSC inválido, ou payerDocument enviado com CPF/CNPJ inválido (o campo é opcional; se não enviar, não há essa validação).
403 — FEATURE_NOT_ENABLED: recurso não habilitado para a conta (whitelist).
403 — IP não está na whitelist (configure em "Credenciais e Webhooks" > "IPs Permitidos").
POST
Cripto → PIX
POST
/api/v1/crypto-to-pix/order
O inverso do Depósito PIX → Cripto: o usuário deposita USDT (BSC, Polygon ou Tron) e nós pagamos PIX na chave que você informar. Cada ordem gera um endereço de depósito exclusivo (carteira isolada); assim que o depósito confirma on-chain, o PIX é pago automaticamente. Não credita saldo na sua conta.

Cotação flutuante — você recebe conforme o que pagou. O valor em BRL do PIX é proporcional ao USDT efetivamente recebido, cotado no momento da confirmação do depósito (menos as taxas). Se o usuário depositar mais ou menos que o estimado, o PIX segue proporcional ao valor real recebido. A resposta da criação traz, no máximo, uma estimatedBRLCents.
Recurso liberado sob demanda (whitelist): fale com o suporte para habilitar na sua conta. Exige IP whitelist configurado (por ser uma saída de valor).

Body (JSON)
pixKey (string, obrigatório) — chave PIX de destino que receberá o pagamento.
pixKeyType (string, obrigatório) — CPF, CNPJ, EMAIL, PHONE ou EVP.
recipientDocument (string, opcional) — CPF/CNPJ do recebedor. Se informado, precisa ser válido; se omitido (chave EMAIL, PHONE ou EVP), o pagamento é processado normalmente sem o documento.
asset (string, opcional) — USDT (padrão e único ativo nesta fase; BTC/SOL/XMR em breve).
network (string, opcional) — rede do depósito: BSC (BEP-20, padrão), POLYGON (PoS) ou TRON (TRC-20). Consulte GET /crypto-to-pix/networks para saber quais estão ativas agora.
expectedUsdt (número, opcional) — quanto você espera receber, só para exibir a estimatedBRLCents. Não vincula o valor final.
externalId (string, opcional) — ID único da sua aplicação para idempotência.
webhookUrl (string, opcional) — URL HTTPS para receber os callbacks. Se omitido, usa a URL do painel.
metadata (object, opcional) — objeto livre repassado no webhook.
Exemplo — Request

curl -X POST https://ggpixapi.com/api/v1/crypto-to-pix/order \
  -H "X-API-Key: SEU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pixKey": "12345678909",
    "pixKeyType": "CPF",
    "recipientDocument": "12345678909",
    "asset": "USDT",
    "network": "BSC",
    "expectedUsdt": 100,
    "externalId": "c2p-order-001",
    "webhookUrl": "https://seusite.com/webhooks/crypto"
  }'
Resposta 201

{
  "id": "cly0ord789",
  "status": "PENDING",
  "state": "AWAITING_DEPOSIT",
  "asset": "USDT",
  "network": "BSC",
  "networkLabel": "BNB Smart Chain (BEP-20)",
  "depositAddress": "0xabc0000000000000000000000000000000000def",
  "expiresAt": "2026-07-20T13:00:00.000Z",
  "estimatedBRLCents": 57900,
  "externalId": "c2p-order-001",
  "note": "Voce recebe em PIX o valor proporcional ao USDT efetivamente recebido, a cotacao do momento da confirmacao (menos taxas).",
  "networkNote": "Envie USDT SOMENTE na rede indicada em `network` desta ordem. Deposito em outra rede ou de outro token nao e creditado automaticamente.",
  "createdAt": "2026-07-20T12:00:00.000Z"
}
Envie o USDT para o depositAddress desta ordem, na rede indicada em network. Cada ordem tem um endereço exclusivo e de uso único — não reutilize e não envie dois depósitos para o mesmo endereço. estimatedBRLCents é apenas estimativa; o PIX pago será proporcional ao USDT realmente recebido.

Atenção à rede. Na BSC e na Polygon o depositAddress tem o mesmo formato (0x…) e o endereço pode até coincidir — o que vale é o campo network da ordem. Na Tron o endereço é diferente (T…). Depósito feito em rede diferente da ordem, ou de outro token que não o USDT, não é pago automaticamente: a ordem vai para análise manual (UNDER_REVIEW). Sempre exiba a rede junto do endereço para o usuário final.
Fluxo
Você cria a ordem e mostra o depositAddress (rede BSC) ao usuário.
O usuário envia USDT para esse endereço.
Ao confirmar on-chain (algumas confirmações de rede), pagamos o PIX na pixKey informada — valor proporcional ao recebido, cotação do momento.
Você recebe os callbacks de status no webhookUrl (mesmo formato dos webhooks PIX Out, veja Webhooks).
Consulta de status
GET
/api/v1/crypto-to-pix/order/:id
O campo state resume o andamento da ordem:

AWAITING_DEPOSIT — aguardando o depósito de USDT no depositAddress.
CONFIRMING_DEPOSIT — depósito detectado, aguardando confirmações on-chain.
PAYING — pagamento PIX enviado, aguardando liquidação.
PAID — PIX pago (status: COMPLETE, com amountBRLCents e endToEndId).
EXPIRED — janela de depósito encerrada sem depósito (um depósito tardio ainda é honrado à cotação do momento).
UNDER_REVIEW — em verificação manual (ex.: valor fora dos limites). Fale com o suporte.
PENDING — ordem criada, ainda sem andamento definido.
FAILED — a ordem falhou (ex.: erro no pagamento PIX). Fale com o suporte.
Estimativa (opcional)
GET
/api/v1/crypto-to-pix/quote?usdt=100
Retorna estimatedBRLCents para um dado montante de USDT. É apenas referência — o valor final é recalculado na confirmação.

Redes disponíveis
GET
/api/v1/crypto-to-pix/networks
Lista as redes aceitas neste momento para depósito, com os limites em USDT. Consulte este endpoint em vez de fixar a lista no seu código: uma rede pode ser desativada temporariamente (manutenção) e, nesse caso, criar a ordem nela retorna 400.


{
  "networks": [
    { "network": "BSC", "label": "BNB Smart Chain (BEP-20)", "asset": "USDT", "addressFormat": "evm", "requiredConfirmations": 12 },
    { "network": "POLYGON", "label": "Polygon (PoS)", "asset": "USDT", "addressFormat": "evm", "requiredConfirmations": 30 },
    { "network": "TRON", "label": "Tron (TRC-20)", "asset": "USDT", "addressFormat": "base58check", "requiredConfirmations": 20 }
  ],
  "minUsdt": 5,
  "maxUsdt": 2000,
  "note": "Envie USDT SOMENTE na rede indicada em `network` desta ordem. Deposito em outra rede ou de outro token nao e creditado automaticamente."
}
Erros comuns
400 — parâmetros inválidos, tipo de chave não suportado, ou CPF/CNPJ do recebedor inválido.
400 — rede indisponível: o network pedido não está ativo agora (confira GET /crypto-to-pix/networks).
403 — FEATURE_NOT_ENABLED: recurso não habilitado para a conta (whitelist).
403 — IP não está na whitelist (configure em "Credenciais e Webhooks" > "IPs Permitidos").
GET
Status do Saque Cripto
GET
/api/v1/crypto/withdraw/:id
Retorna o estado atual de um saque cripto previamente criado, no mesmo formato da resposta do POST, acrescido dos campos de conclusão (paidAt, actualAmount, txHash) quando aplicáveis. Os campos de valor são na unidade do asset da transação. Para acompanhar transações PIX, use GET /api/v1/transactions/:id.

Exemplo — Request

curl -X GET https://ggpixapi.com/api/v1/crypto/withdraw/cly0txn123 \
  -H "X-API-Key: SEU_API_KEY"
Resposta 200 — USDT

{
  "id": "cly0txn123",
  "status": "COMPLETE",
  "amountBRLCents": 3000,
  "asset": "USDT",
  "network": "BSC",
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "estimatedAmount": 5.49,
  "actualAmount": 5.51,
  "estimatedUSDT": 5.49,
  "actualUSDT": 5.51,
  "txHash": "0xabc123...def",
  "externalId": "crypto-order-001",
  "createdAt": "2026-04-23T12:00:00.000Z",
  "paidAt": "2026-04-23T12:02:14.000Z"
}
Resposta 200 — XMR

{
  "id": "cly0txn999",
  "status": "COMPLETE",
  "amountBRLCents": 11000,
  "asset": "XMR",
  "wallet": "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A",
  "estimatedAmount": 0.062184,
  "actualAmount": 0.061902,
  "txHash": "f8a1...c3d9",
  "externalId": "crypto-order-xmr-001",
  "createdAt": "2026-06-29T12:00:00.000Z",
  "paidAt": "2026-06-29T12:05:31.000Z"
}
Campos da resposta
status — PENDING (em processamento), COMPLETE (cripto entregue), FAILED (falha — inclui failureReason), CANCELED.
asset — USDT ou XMR; define a unidade dos campos de valor.
amountBRLCents — valor debitado em BRL (centavos).
wallet — endereço de destino (BSC ou Monero).
estimatedAmount — estimativa entregue na unidade do asset.
actualAmount — valor efetivamente entregue (null até concluir).
estimatedUSDT / actualUSDT — presentes apenas quando asset = USDT (compatibilidade).
txHash — hash da transação on-chain (null até o envio concluir).
paidAt — timestamp da conclusão (null enquanto PENDING).
failureReason — presente apenas quando status = FAILED.
Erros
404 — id não encontrado, ou pertence a outro merchant, ou não é um saque cripto.
Webhooks (Callbacks)
Quando uma transação muda de status, enviamos um POST para sua URL de webhook configurada. Configure webhooks no Painel do Merchant → Credenciais e Webhooks → aba Webhooks.

Tipos de Evento
PIX_IN
PIX recebido (cash-in)

BOLETO_IN
Boleto pago (cash-in)

PIX_OUT
PIX enviado (cash-out)

BOLETO_OUT
Boleto/tributo pago (cash-out)

TED_OUT
TED enviada (cash-out)

TRANSFER_IN
Transferência recebida

TRANSFER_OUT
Transferencia enviada

Status Possíveis
PENDING
COMPLETE
FAILED
CANCELED
Payload do Webhook

{
  "transactionId": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "externalId": "pedido-12345",
  "status": "COMPLETE",
  "type": "PIX_IN",
  "amount": 10000,
  "netAmount": 9923,
  "gatewayFee": 77,
  "paidAt": "2025-01-15T10:35:30.000Z",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "merchantId": "73212165-3cca-4981-a5ea-87069c9ddb13",
  "endToEndId": "E00038166202501151035s0aB1c2d3e4",
  "payer": {
    "name": "MARIA SOUZA",
    "document": "12345678909",
    "bankName": "NUBANK"
  },
  "recipient": null
}
Pagador e recebedor (payer / recipient)

Em PIX_IN confirmado, payer identifica quem efetivamente pagou o PIX. Em PIX_OUT confirmado, recipient identifica quem efetivamente recebeu o saque — ambos conforme reportado pela instituição de pagamento, com a mesma forma: name (nome do titular), document (CPF/CNPJ, somente dígitos) e bankName (banco). Cada subcampo pode vir null quando a origem não informa o dado, e o campo que não se aplica ao tipo vem null (PIX_IN -> recipient: null; PIX_OUT -> payer: null). Ambos também estão na consulta de status (GET /api/v1/transactions/:id).

// Webhook de um PIX_OUT (saque) confirmado:
{
  "transactionId": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "externalId": "saque-987",
  "status": "COMPLETE",
  "type": "PIX_OUT",
  "amount": 10000,
  "netAmount": 10000,
  "gatewayFee": 0,
  "paidAt": "2025-01-15T10:35:30.000Z",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "merchantId": "73212165-3cca-4981-a5ea-87069c9ddb13",
  "endToEndId": "E00038166202501151035s0aB1c2d3e4",
  "payer": null,
  "recipient": {
    "name": "HENRIQUE GARCIA",
    "document": "12345678909",
    "bankName": "NUBANK"
  }
}
Webhook de Falha

Quando o status é FAILED, o payload inclui o campo failureReason com o motivo da falha:

{
  "transactionId": "8f320895-6ef1-4e9f-bfd3-d76efb40370e",
  "externalId": "pedido-12345",
  "status": "FAILED",
  "type": "PIX_OUT",
  "amount": 10000,
  "netAmount": 9923,
  "gatewayFee": 77,
  "paidAt": null,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "merchantId": "73212165-3cca-4981-a5ea-87069c9ddb13",
  "failureReason": "O documento (CPF/CNPJ) informado é inválido ou não confere com o destinatário."
}
Autenticação de Webhooks
OPCIONAL
A autenticação de webhooks é opcional. Nossa API já garante a segurança das requisições, mas se você desejar uma camada extra de validação, pode configurar Bearer Token, HMAC Secret, ou ambos. Caso não configure nenhum secret, os webhooks serão enviados normalmente sem headers de autenticação.

BEARER
Bearer Token
O webhook inclui o header Authorization com seu token.

Authorization: Bearer seu_token_aqui
Valide comparando com o token que você gerou no painel. Se não configurar, o header não será enviado.

HMAC
Assinatura HMAC-SHA256
O header X-Webhook-Signature contém timestamp e assinatura.

X-Webhook-Signature: t=1705315530,v1=5d4f8c2a1b3e...
Validação em Node.js (Express):

const crypto = require('crypto');

// IMPORTANTE: Use o body bruto (string), não o objeto parseado
// No Express, use: app.use('/webhook', express.raw({type: 'application/json'}))

function validateWebhookSignature(rawBody, signature, secret) {
  const parts = signature.split(',');
  const timestamp = parts[0].replace('t=', '');
  const receivedSig = parts[1].replace('v1=', '');

  // Verificar se não é replay attack (max 5 min)
  const age = Date.now() / 1000 - parseInt(timestamp);
  if (age > 300) return false;

  // Calcular assinatura esperada: HMAC-SHA256(timestamp.rawBody)
  const signedPayload = timestamp + '.' + rawBody;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(receivedSig),
    Buffer.from(expectedSig)
  );
}

// Uso no Express:
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = req.body.toString();

  if (!validateWebhookSignature(rawBody, signature, 'seu_secret')) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody);
  // Processar webhook...
  res.status(200).json({ received: true });
});
Confirme o recebimento

Retorne status 200 para confirmar o recebimento. Caso contrário, tentaremos novamente por até 24h.

Histórico de Entregas

Acompanhe o histórico de webhooks enviados no painel em Credenciais e Webhooks → aba Webhooks → Histórico. Veja status, tempo de resposta e erros de cada envio.

IP Whitelist
Para maior segurança, o endpoint de PIX Out requer que o IP do seu servidor esteja cadastrado na whitelist. Isso previne que terceiros façam saques usando sua API key mesmo que ela seja comprometida.

Como funciona
1
Acesse o Painel do Merchant

2
Clique em Credenciais e Webhooks

3
Va para a aba IPs Permitidos

4
Adicione o IP do seu servidor (requer PIN)

Limites
IPs por conta	20
Formatos aceitos	IPv4, IPv6
Erros de IP (HTTP 403)

// Nenhum IP cadastrado na whitelist:
{
  "error": "IP whitelist required",
  "message": "Para realizar saques via API, você deve configurar pelo menos um IP permitido no painel do merchant em 'Credenciais e Webhooks' > 'IPs Permitidos'",
  "clientIp": "203.0.113.45"
}

// IP não está na lista de permitidos:
{
  "error": "IP not authorized",
  "message": "O IP 203.0.113.45 não está na lista de IPs permitidos. Adicione este IP no painel do merchant em 'Credenciais e Webhooks' > 'IPs Permitidos'",
  "clientIp": "203.0.113.45"
}
Dica: IP do seu servidor

Para descobrir o IP do seu servidor, execute: curl ifconfig.me ou veja o campo clientIp na resposta de erro.

GGPIXAPI logo
Gateway PIX © 2026