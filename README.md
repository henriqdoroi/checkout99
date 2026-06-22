# Checkout BravoPay integrado

Projeto pronto para Vercel com checkout Pix BravoPay.

## Campos no checkout

O checkout pede somente:

- Nome completo
- Telefone / WhatsApp

E-mail e CPF foram removidos da tela.

## Observação importante sobre CPF

O backend não gera CPF aleatório/falso. CPF é dado pessoal e deve ser enviado somente quando for fornecido pelo cliente ou quando você tiver base legal/consentimento.

Pela documentação fornecida, `amount_cents` é o único campo obrigatório. Então esta versão envia `customer.name` e `customer.phone`. Se a BravoPay exigir e-mail no seu cadastro, configure `BRAVOPAY_FALLBACK_EMAIL` na Vercel com um e-mail seu.

## Variáveis da Vercel

Obrigatórias:

```txt
BRAVOPAY_API_KEY=bp_live_sua_chave_aqui
CHECKOUT_AMOUNT_CENTS=3257
```

Opcionais:

```txt
BRAVOPAY_PRODUCT_ID=seu_product_id_real
BRAVOPAY_FALLBACK_EMAIL=checkout@seudominio.com
BRAVOPAY_CUSTOMER_CPF=cpf_legitimo_autorizado_somente_se_necessario
```

## Redirecionamento pós-pagamento

Quando a API retornar `PAID`, o frontend redireciona para `/upsell`.

Para mudar, edite em `script.js`:

```js
upsellUrl: "/upsell"
```
