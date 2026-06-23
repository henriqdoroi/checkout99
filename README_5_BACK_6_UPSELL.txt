CHECKOUT COM 5 BACK REDIRECTS E 6 UPSELLS

PÁGINAS CRIADAS

Checkouts principais:
- /checkout1.html => R$ 19,44 => após pagamento vai para /checkout2.html
- /checkout2.html => R$ 29,27 => após pagamento vai para /checkout3.html
- /checkout3.html => R$ 32,57 => após pagamento vai para /upsell1.html

Upsells:
- /upsell1.html => R$ 47,00 => após pagamento vai para /upsell2.html
- /upsell2.html => R$ 67,00 => após pagamento vai para /upsell3.html
- /upsell3.html => R$ 97,00 => após pagamento vai para /upsell4.html
- /upsell4.html => R$ 127,00 => após pagamento vai para /upsell5.html
- /upsell5.html => R$ 147,00 => após pagamento vai para /upsell6.html
- /upsell6.html => R$ 197,00 => após pagamento vai para /obrigado.html

Back redirects:
- /back1.html => R$ 14,90 => após pagamento vai para /checkout2.html
- /back2.html => R$ 19,90 => após pagamento vai para /checkout3.html
- /back3.html => R$ 27,00 => após pagamento vai para /upsell1.html
- /back4.html => R$ 37,00 => após pagamento vai para /upsell2.html
- /back5.html => R$ 47,00 => após pagamento vai para /obrigado.html

COMO O BACK REDIRECT FUNCIONA
O script.js agora tem a opção backRedirectUrl em cada checkout. Quando o usuário toca no botão voltar ou tenta voltar pelo navegador/celular, ele é levado para a página configurada.

ONDE MUDAR VALORES E LINKS
1) Frontend: edite o objeto CHECKOUTS no script.js.
2) Backend seguro: edite DEFAULT_CHECKOUTS em api/criar-pix.js.

IMPORTANTE: O valor real cobrado pela BravoPay fica no backend api/criar-pix.js. Não altere só o script.js.

BRAVOPAY / VERCEL
Configure na Vercel:
BRAVOPAY_API_KEY=bp_live_sua_chave

Se usa UTMify, configure product_id real. Pode ser por checkout:
BRAVOPAY_PRODUCT_ID_CHECKOUT1=prod_xxx
BRAVOPAY_PRODUCT_ID_UPSELL1=prod_xxx
BRAVOPAY_PRODUCT_ID_BACK1=prod_xxx

Ou um product_id geral:
BRAVOPAY_PRODUCT_ID=prod_xxx
