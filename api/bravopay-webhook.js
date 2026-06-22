// Webhook recomendado para produção.
// Cadastre esta URL no painel da BravoPay:
// https://SEU-DOMINIO.vercel.app/api/bravopay-webhook
//
// Sem banco de dados neste projeto, a função apenas recebe e registra o evento.
// Em produção, salve o transaction.id e status no seu banco/CRM para confirmar a venda pelo backend.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido. Use POST." });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    console.log("Webhook BravoPay recebido:", JSON.stringify({
      event: payload.event,
      transaction_id: payload?.transaction?.id,
      status: payload?.transaction?.status,
      amount_cents: payload?.transaction?.amount_cents
    }));

    // Exemplo:
    // if (payload.event === "transaction.paid") {
    //   await salvarPagamentoNoBanco(payload.transaction.id, payload.transaction);
    // }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro no webhook BravoPay:", error);
    return res.status(500).json({ message: "Erro ao processar webhook." });
  }
};
