const BRAVOPAY_BASE_URL = "https://bravopay.club/api/v1";

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido. Use POST." });
  }

  try {
    const apiKey = process.env.BRAVOPAY_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: "BRAVOPAY_API_KEY não configurada no ambiente da Vercel."
      });
    }

    const body = parseBody(req.body);

    const name = String(body.nome || body.name || body?.customer?.name || "").trim();
    const phone = normalizePhone(body.telefone || body.phone || body?.customer?.phone || "");

    if (name.length < 3) return res.status(400).json({ message: "Nome inválido." });
    if (phone.length < 12) return res.status(400).json({ message: "Telefone inválido." });

    // Valor definido no backend para evitar alteração maliciosa no front.
    // Para trocar o valor na Vercel, use CHECKOUT_AMOUNT_CENTS=3257.
    const amountCents = Number(process.env.CHECKOUT_AMOUNT_CENTS || "3257");

    const productId = cleanOptional(
      process.env.BRAVOPAY_PRODUCT_ID || body.product_id || body.productId || ""
    );

    const externalReference = cleanOptional(body.external_reference) || createExternalReference();

    // IMPORTANTE:
    // O checkout não pede e-mail nem CPF na tela.
    // Não geramos CPF aleatório/falso. CPF é dado pessoal e deve ser enviado somente
    // quando for fornecido pelo cliente ou quando você tiver base legal/consentimento.
    // Se a BravoPay realmente exigir e-mail, configure BRAVOPAY_FALLBACK_EMAIL na Vercel.
    // Ex.: BRAVOPAY_FALLBACK_EMAIL=checkout@seudominio.com
    const fallbackEmail = cleanOptional(process.env.BRAVOPAY_FALLBACK_EMAIL || "");
    const customerEmail = isValidEmail(body.email) ? String(body.email).trim() : fallbackEmail;

    // Só envie CPF se você configurar manualmente um CPF legítimo/autorizado na Vercel.
    // Não use CPF gerado aleatoriamente.
    const configuredCpf = onlyDigits(process.env.BRAVOPAY_CUSTOMER_CPF || body.cpf || "");

    const customer = {
      name,
      phone
    };

    if (customerEmail && isValidEmail(customerEmail)) customer.email = customerEmail;
    if (configuredCpf && isValidCpf(configuredCpf)) customer.cpf = configuredCpf;

    const payload = {
      amount_cents: amountCents,
      method: "pix",
      customer,
      external_reference: externalReference,
      utm: normalizeUtm(body.utm || {})
    };

    // Se você usa UTMify, configure um product_id real para a venda não cair em produto ghost.
    if (productId) payload.product_id = productId;

    const response = await fetch(`${BRAVOPAY_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        message: data.message || data.error || "Erro ao criar transação Pix na BravoPay.",
        details: data
      });
    }

    return res.status(200).json(normalizeTransaction(data));
  } catch (error) {
    console.error("Erro criar Pix BravoPay:", error);
    return res.status(500).json({ message: "Erro interno ao gerar Pix." });
  }
};

function normalizeTransaction(tx) {
  const copyPaste = tx?.pix?.copy_paste || tx.pixCopiaECola || tx.qrCodeText || "";
  const expiresAt = tx?.pix?.expires_at || tx.expires_at || tx.expiresAt || null;
  const amountCents = Number(tx.amount_cents || 0);

  return {
    sucesso: true,
    id: tx.id,
    status: tx.status,
    method: tx.method,
    amount_cents: amountCents,
    valor: amountCents ? amountCents / 100 : undefined,
    expiresAt,
    expiresIn: secondsUntil(expiresAt) || 600,
    pixCopiaECola: copyPaste,
    qrCodeText: copyPaste
  };
}

function normalizePhone(value) {
  let digits = onlyDigits(value);

  // Front envia DDD+número porque o +55 fica separado no layout.
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;

  return digits;
}

function normalizeUtm(utm) {
  const allowed = ["source", "medium", "campaign", "content", "term", "fbclid", "ttclid", "gclid"];
  const normalized = {};

  for (const key of allowed) {
    normalized[key] = cleanOptional(utm[key]) || "";
  }

  return normalized;
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return body;
}

function createExternalReference() {
  return `pedido_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function cleanOptional(value) {
  const text = String(value || "").trim();
  return text || undefined;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function isValidCpf(cpf) {
  cpf = onlyDigits(cpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  if (digit1 !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  return digit2 === Number(cpf[10]);
}

function secondsUntil(isoDate) {
  if (!isoDate) return null;
  const ms = new Date(isoDate).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 1000));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
