CHECKOUT PIX MOBILE - VERSÃO PROFISSIONAL

Arquivos:
- index.html
- style.css
- script.js

Como testar:
1. Abra index.html no navegador.
2. Preencha Nome completo e Telefone.
3. Clique em Continuar.
4. A tela Pix será aberta com contador, código copia e cola, botão copiar e modal QR Code.

Como ligar sua API real:
1. Abra script.js
2. Troque:
   useMockApi: true
   para:
   useMockApi: false

3. Sua API precisa responder em /api/criar-pix ou altere createPixEndpoint.

Formato ideal de resposta:
{
  "sucesso": true,
  "id": "ID_DA_TRANSACAO",
  "valor": 22.74,
  "expiresIn": 600,
  "pixCopiaECola": "00020101021226900014br.gov.bcb.pix...",
  "qrCodeText": "00020101021226900014br.gov.bcb.pix...",
  "qrCodeBase64": ""
}

Status automático:
- O código já tem polling em /api/status-pix?id=ID_DA_TRANSACAO.
- A API de status pode retornar status: "paid", "approved", "aprovado" ou "completed" para abrir a tela de aprovado.

Fonte:
- O CSS já está preparado para DiDi Sans.
- Você precisa adicionar a fonte licenciada em /fonts e descomentar os @font-face no style.css.
