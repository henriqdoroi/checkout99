INTEGRAÇÃO BRAVOPAY + VERCEL

1) Arquivos principais
- index.html: checkout com nome, email, telefone e CPF.
- script.js: cria Pix, gera QR code, salva UTMs, faz polling a cada 3s e redireciona para /upsell quando PAID.
- api/criar-pix.js: backend Vercel que chama POST https://bravopay.club/api/v1/transactions.
- api/pix-status.js: backend Vercel que chama GET https://bravopay.club/api/v1/transactions/{id}.
- api/bravopay-webhook.js: endpoint recomendado para receber webhooks de produção.

2) Variáveis na Vercel
No painel da Vercel, configure:

BRAVOPAY_API_KEY = sua API key da BravoPay
CHECKOUT_AMOUNT_CENTS = 3257
BRAVOPAY_PRODUCT_ID = opcional, mas recomendado se usa UTMify

3) UTMify
O script lê no primeiro acesso:
utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, ttclid, gclid

Ele salva no localStorage e envia sempre no campo utm para /api/criar-pix.
O backend repassa para a BravoPay no POST /transactions.

4) URL do upsell
No script.js, troque se precisar:
upsellUrl: "/upsell"

5) Webhook
Cadastre no painel BravoPay:
https://SEU-DOMINIO.vercel.app/api/bravopay-webhook

Eventos recomendados:
transaction.created
transaction.paid
transaction.refunded
transaction.chargeback

6) Segurança
A API key não deve ficar em index.html nem script.js.
Ela fica somente em variável de ambiente na Vercel.
