CHECKOUT BRAVOPAY - VERCEL

ALTERAÇÃO DESTA VERSÃO
- O checkout pede somente Nome completo e Telefone/WhatsApp.
- E-mail e CPF foram removidos da tela.
- O backend NÃO gera CPF aleatório/falso.
- O backend envia customer.name e customer.phone para a BravoPay.
- Se a BravoPay exigir e-mail no seu cadastro, configure um e-mail seu na Vercel:
  BRAVOPAY_FALLBACK_EMAIL=checkout@seudominio.com
- Se a BravoPay exigir CPF, o correto é coletar o CPF do cliente ou confirmar com a BravoPay se o campo pode ser omitido. Não use CPF gerado aleatoriamente.

VARIÁVEIS OBRIGATÓRIAS NA VERCEL
BRAVOPAY_API_KEY=bp_live_sua_chave_aqui
CHECKOUT_AMOUNT_CENTS=3257

VARIÁVEIS OPCIONAIS
BRAVOPAY_PRODUCT_ID=seu_product_id_real
BRAVOPAY_FALLBACK_EMAIL=checkout@seudominio.com
BRAVOPAY_CUSTOMER_CPF=cpf_legitimo_autorizado_somente_se_necessario

ROTAS
POST /api/criar-pix
GET /api/pix-status?id=tx_xxx
POST /api/bravopay-webhook

UTMS
O frontend salva no primeiro acesso e envia no POST:
utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, ttclid, gclid.

REDIRECIONAMENTO
Quando status = PAID, o frontend redireciona para /upsell.
Para alterar, edite no script.js:
upsellUrl: "/upsell"
