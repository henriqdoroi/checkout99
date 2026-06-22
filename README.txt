CHECKOUT MOBILE PIX - V2

Arquivos:
- index.html
- style.css
- script.js

IMPORTANTE:
Esta versão foi feita com layout mobile app-style, usando uma marca genérica para você trocar pela sua marca própria.
Não inclui fonte proprietária. Se você tiver licença da fonte DiDi Sans, coloque os arquivos em /fonts e descomente o @font-face no style.css.

COMO TESTAR:
Abra index.html no navegador. Por padrão está em modo simulação.

LIGAR API REAL:
No script.js, troque:
  useMockApi: true
para:
  useMockApi: false

Endpoint esperado para criar Pix:
  POST /api/criar-pix

Payload enviado:
{
  "nome": "Nome do cliente",
  "telefone": "(11) 99999-9999",
  "produto": "Taxa de Segurança",
  "valor": 32.57
}

Resposta ideal:
{
  "sucesso": true,
  "id": "id_da_transacao",
  "valor": 32.57,
  "expiresIn": 600,
  "pixCopiaECola": "00020101021226900014br.gov.bcb.pix...",
  "qrCodeText": "00020101021226900014br.gov.bcb.pix...",
  "qrCodeBase64": ""
}

Endpoint opcional de status:
  GET /api/pix-status?id=ID_DA_TRANSACAO

Resposta de status:
{
  "status": "approved"
}

O QR é gerado com a biblioteca qrcodejs via CDN. Se sua API mandar qrCodeBase64, ele usa a imagem retornada pela API.
