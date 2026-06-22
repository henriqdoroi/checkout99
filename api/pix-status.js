const BRAVOPAY_BASE_URL = "https://bravopay.club/api/v1";

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método não permitido. Use GET." });
  }

  try {
    const apiKey = process.env.BRAVOPAY_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: "BRAVOPAY_API_KEY não configurada no ambiente da Vercel." });
    }

    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).json({ message: "ID da transação não informado." });

    const response = await fetch(`${BRAVOPAY_BASE_URL}/transactions/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        message: data.message || data.error || "Erro ao consultar status do Pix na BravoPay.",
        details: data
      });
    }

    return res.status(200).json(normalizeTransaction(data));
  } catch (error) {
    console.error("Erro consultar Pix BravoPay:", error);
    return res.status(500).json({ message: "Erro interno ao consultar Pix." });
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

function secondsUntil(isoDate) {
  if (!isoDate) return null;
  const ms = new Date(isoDate).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 1000));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
