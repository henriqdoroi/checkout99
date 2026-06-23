COMO USAR VALORES DIFERENTES NO MESMO CHECKOUT

Este projeto agora usa o MESMO script.js e a MESMA API /api/criar-pix para vários valores.
O valor muda automaticamente conforme o nome do arquivo aberto:

- /checkout1.html => R$ 19,44
- /checkout2.html => R$ 29,27
- /checkout3.html => R$ 32,57
- /index.html     => R$ 32,57

Também deixei exemplos para upsells:

- /upsell1.html => R$ 47,00
- /upsell2.html => R$ 67,00

ONDE EDITAR OS VALORES NO FRONT
Abra script.js e edite o objeto CHECKOUTS no topo do arquivo:

const CHECKOUTS = {
  checkout1: { amount: 19.44, productName: "Taxa de Segurança", productId: "", upsellUrl: "/checkout2.html" },
  checkout2: { amount: 29.27, productName: "Taxa de Segurança", productId: "", upsellUrl: "/checkout3.html" },
  checkout3: { amount: 32.57, productName: "Taxa de Segurança", productId: "", upsellUrl: "/upsell" }
};

ONDE EDITAR OS VALORES NO BACKEND
Abra api/criar-pix.js e edite o DEFAULT_CHECKOUTS:

checkout1: { amount_cents: 1944, name: "Taxa de Segurança" }
checkout2: { amount_cents: 2927, name: "Taxa de Segurança" }
checkout3: { amount_cents: 3257, name: "Taxa de Segurança" }

IMPORTANTE
O valor que vale de verdade para a BravoPay é o do backend em api/criar-pix.js.
O valor do script.js é para exibir no checkout e enviar o checkout_id correto.
Isso evita que alguém altere o valor pelo navegador.

PRODUCT_ID PARA UTMIFY
Você pode configurar product_id por checkout de 2 formas:

1) No script.js, dentro do checkout desejado:
   productId: "prod_xxx"

2) Na Vercel, por variável:
   BRAVOPAY_PRODUCT_ID_CHECKOUT1=prod_xxx
   BRAVOPAY_PRODUCT_ID_CHECKOUT2=prod_xxx
   BRAVOPAY_PRODUCT_ID_CHECKOUT3=prod_xxx

Se todos os checkouts usarem o mesmo produto:
   BRAVOPAY_PRODUCT_ID=prod_xxx

REDIRECIONAMENTO APÓS PAGAMENTO
No script.js, edite upsellUrl em cada checkout:

checkout1: { ..., upsellUrl: "/checkout2.html" }
checkout2: { ..., upsellUrl: "/checkout3.html" }
checkout3: { ..., upsellUrl: "/upsell" }

CONFIGURAÇÃO NA VERCEL
Obrigatório:
BRAVOPAY_API_KEY=bp_live_sua_chave

Opcional:
BRAVOPAY_PRODUCT_ID=prod_xxx
BRAVOPAY_PRODUCT_ID_CHECKOUT1=prod_xxx
BRAVOPAY_PRODUCT_ID_CHECKOUT2=prod_xxx
BRAVOPAY_PRODUCT_ID_CHECKOUT3=prod_xxx

NÃO precisa mais usar CHECKOUT_AMOUNT_CENTS para esses fluxos, porque o valor agora vem do checkout_id.
