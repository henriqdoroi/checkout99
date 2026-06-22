CHECKOUT MOBILE CLEAN V3

Arquivos:
- index.html
- style.css
- script.js

VISUAL
- Layout mobile-first mais limpo, delicado e com cara de app.
- Slot de banner no topo: troque o arquivo banner-placeholder.png pelo seu banner.
- Caso o banner não exista, entra um fallback visual automático.
- CSS preparado para usar a fonte DiDi Sans, se você tiver a fonte licenciada.

COMO TROCAR O BANNER
1. Coloque sua imagem na mesma pasta do projeto.
2. Use o nome: banner-placeholder.png
ou troque no HTML a linha:
   src="banner-placeholder.png"

COMO LIGAR SUA API REAL
No script.js, troque:
  useMockApi: true
para:
  useMockApi: false

ROTA PARA GERAR PIX
- /api/criar-pix

ROTA PARA CONSULTAR STATUS
- /api/pix-status?id=ID_DA_TRANSACAO

FORMATO IDEAL DE RESPOSTA AO GERAR PIX
{
  "sucesso": true,
  "id": "tx_123",
  "valor": 32.57,
  "expiresIn": 600,
  "pixCopiaECola": "000201010212...",
  "qrCodeText": "000201010212...",
  "qrCodeBase64": ""
}

FORMATO IDEAL DE STATUS
{
  "status": "approved"
}

OBSERVAÇÃO
Este layout foi refinado para ficar com aparência clean e de app mobile, sem copiar a identidade exata de um app financeiro oficial.
