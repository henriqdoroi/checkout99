const CONFIG = {
  // true = simulação para testar visual. false = usa /api/criar-pix e /api/pix-status?id=...
  useMockApi: true,
  amount: 32.57,
  productName: "Taxa de Segurança",
  createPixEndpoint: "/api/criar-pix",
  statusEndpoint: "/api/pix-status",
  pollingEveryMs: 4000,
  mockApproveAfterSeconds: 0 // coloque 15 para testar aprovação automática no mock
};

const $ = (selector) => document.querySelector(selector);

const screens = {
  checkout: $("#checkoutScreen"),
  pix: $("#pixScreen"),
  approved: $("#approvedScreen")
};

const els = {
  form: $("#checkoutForm"),
  fullName: $("#fullName"),
  phone: $("#phoneNumber"),
  generate: $("#generatePixBtn"),
  checkoutAmount: $("#checkoutAmount"),
  pixAmount: $("#pixAmountGenerated"),
  pixCodeText: $("#pixCodeText"),
  countdown: $("#countdown"),
  progressBar: $("#progressBar"),
  backToCheckout: $("#backToCheckout"),
  howItWorks: $("#howItWorksBtn"),
  copySmall: $("#copySmallBtn"),
  copyBig: $("#copyBigBtn"),
  openQr: $("#openQrBtn"),
  closeQr: $("#closeQrBtn"),
  qrOverlay: $("#qrOverlay"),
  qrcodeCanvas: $("#qrcodeModalCanvas"),
  finish: $("#finishBtn"),
  toast: $("#toast")
};

let currentPix = {
  id: null,
  code: "",
  qrBase64: "",
  amount: CONFIG.amount,
  expiresIn: 600,
  createdAt: null
};

let countdownInterval = null;
let pollingInterval = null;
let totalSeconds = 600;
let remainingSeconds = 600;

init();

function init() {
  els.checkoutAmount.textContent = formatBRL(CONFIG.amount);
  els.pixAmount.textContent = formatBRLCompact(CONFIG.amount);
  validateCheckout();

  els.fullName.addEventListener("input", validateCheckout);
  els.phone.addEventListener("input", handlePhoneInput);
  els.form.addEventListener("submit", handleCreatePix);
  els.backToCheckout.addEventListener("click", backToCheckout);
  els.copySmall.addEventListener("click", () => copyCurrentPixCode());
  els.copyBig.addEventListener("click", () => copyCurrentPixCode(true));
  els.openQr.addEventListener("click", openQrModal);
  els.closeQr.addEventListener("click", closeQrModal);
  els.qrOverlay.addEventListener("click", (event) => {
    if (event.target === els.qrOverlay) closeQrModal();
  });
  els.howItWorks.addEventListener("click", () => {
    showToast("Copie o código ou escaneie o QR no app do banco");
  });
  els.finish.addEventListener("click", () => showScreen("checkout"));
}

function handlePhoneInput(event) {
  event.target.value = maskPhone(event.target.value);
  validateCheckout();
}

function validateCheckout() {
  const name = els.fullName.value.trim();
  const phoneDigits = els.phone.value.replace(/\D/g, "");
  const isValid = name.length >= 3 && phoneDigits.length >= 10;

  els.generate.disabled = !isValid;
}

async function handleCreatePix(event) {
  event.preventDefault();

  const payload = buildPayload();
  if (!payload) return;

  setLoading(true);

  try {
    const data = CONFIG.useMockApi
      ? await createPixMock(payload)
      : await createPixReal(payload);

    fillPixData(data);
    showScreen("pix");
    startCountdown(currentPix.expiresIn);
    startPolling();
  } catch (error) {
    console.error(error);
    showToast("Não foi possível gerar o Pix");
  } finally {
    setLoading(false);
  }
}

function buildPayload() {
  const nome = els.fullName.value.trim();
  const telefone = els.phone.value.trim();

  if (!nome || telefone.replace(/\D/g, "").length < 10) {
    showToast("Preencha nome e telefone");
    return null;
  }

  return {
    nome,
    telefone,
    produto: CONFIG.productName,
    valor: CONFIG.amount
  };
}

async function createPixReal(payload) {
  const response = await fetch(CONFIG.createPixEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Erro ao gerar Pix");
  }

  return data;
}

async function createPixMock(payload) {
  await wait(850);

  return {
    sucesso: true,
    id: "mock_tx_" + Date.now(),
    valor: payload.valor,
    expiresIn: 592,
    pixCopiaECola:
      "00020101021226900014br.gov.bcb.pix2571pix.exemplo.com/qr/v2/cob/f49d8c9b6de2450e9f78185204000053039865802BR5924PAGAMENTO SEGURO6009SAO PAULO62070503***6304A1B2",
    qrCodeText:
      "00020101021226900014br.gov.bcb.pix2571pix.exemplo.com/qr/v2/cob/f49d8c9b6de2450e9f78185204000053039865802BR5924PAGAMENTO SEGURO6009SAO PAULO62070503***6304A1B2",
    qrCodeBase64: ""
  };
}

function fillPixData(data) {
  currentPix = {
    id: data.id || data.transactionId || data.txid || null,
    code: data.pixCopiaECola || data.qrCodeText || data.copyPaste || "",
    qrBase64: data.qrCodeBase64 || data.qrcodeBase64 || data.qrBase64 || "",
    amount: Number(data.valor || data.amount || CONFIG.amount),
    expiresIn: Number(data.expiresIn || data.expiration || 600),
    createdAt: Date.now()
  };

  els.checkoutAmount.textContent = formatBRL(currentPix.amount);
  els.pixAmount.textContent = formatBRLCompact(currentPix.amount);
  els.pixCodeText.textContent = truncatePix(currentPix.code);
}

function startCountdown(seconds) {
  clearInterval(countdownInterval);

  totalSeconds = seconds;
  remainingSeconds = seconds;
  updateTimerUI();

  countdownInterval = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateTimerUI();
      clearInterval(countdownInterval);
      stopPolling();
      showToast("Pix expirado");
      return;
    }

    updateTimerUI();
  }, 1000);
}

function updateTimerUI() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  els.countdown.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const percentage = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  els.progressBar.style.width = `${percentage}%`;
}

function startPolling() {
  stopPolling();

  if (CONFIG.useMockApi) {
    if (CONFIG.mockApproveAfterSeconds > 0) {
      pollingInterval = setTimeout(approvePayment, CONFIG.mockApproveAfterSeconds * 1000);
    }
    return;
  }

  if (!currentPix.id) return;

  pollingInterval = setInterval(async () => {
    try {
      const status = await fetchPixStatus(currentPix.id);
      const normalized = String(status.status || status.paymentStatus || "").toLowerCase();

      if (["paid", "approved", "aprovado", "pago", "completed", "concluido"].includes(normalized)) {
        approvePayment();
      }
    } catch (error) {
      console.warn("Erro ao consultar status Pix", error);
    }
  }, CONFIG.pollingEveryMs);
}

async function fetchPixStatus(id) {
  const response = await fetch(`${CONFIG.statusEndpoint}?id=${encodeURIComponent(id)}`);
  const data = await response.json();

  if (!response.ok) throw new Error(data.message || "Erro ao consultar Pix");
  return data;
}

function approvePayment() {
  stopPolling();
  clearInterval(countdownInterval);
  closeQrModal();
  showScreen("approved");
}

function stopPolling() {
  if (!pollingInterval) return;
  clearInterval(pollingInterval);
  clearTimeout(pollingInterval);
  pollingInterval = null;
}

function backToCheckout() {
  stopPolling();
  clearInterval(countdownInterval);
  closeQrModal();
  showScreen("checkout");
}

async function copyCurrentPixCode(isMain = false) {
  if (!currentPix.code) return;

  await copyText(currentPix.code);
  showToast("Código copiado");

  if (isMain) {
    const old = els.copyBig.textContent;
    els.copyBig.textContent = "Código copiado";
    setTimeout(() => (els.copyBig.textContent = old), 1400);
  }
}

function openQrModal() {
  if (!currentPix.code && !currentPix.qrBase64) return;

  renderQr();
  els.qrOverlay.classList.add("is-active");
  els.qrOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeQrModal() {
  els.qrOverlay.classList.remove("is-active");
  els.qrOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderQr() {
  els.qrcodeCanvas.innerHTML = "";

  if (currentPix.qrBase64) {
    const img = document.createElement("img");
    img.src = currentPix.qrBase64.startsWith("data:")
      ? currentPix.qrBase64
      : `data:image/png;base64,${currentPix.qrBase64}`;
    img.alt = "QR Code Pix";
    els.qrcodeCanvas.appendChild(img);
    return;
  }

  if (typeof QRCode === "undefined") {
    els.qrcodeCanvas.textContent = "QR indisponível";
    return;
  }

  new QRCode(els.qrcodeCanvas, {
    text: currentPix.code,
    width: 240,
    height: 240,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
  screens[name].classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function setLoading(isLoading) {
  els.generate.disabled = isLoading;
  els.generate.textContent = isLoading ? "GERANDO..." : "GERAR PIX";

  if (!isLoading) validateCheckout();
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");

  return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function formatBRLCompact(value) {
  return formatBRL(value).replace(/\s/g, "");
}

function truncatePix(code) {
  if (!code) return "";
  return code.length > 45 ? `${code.slice(0, 45)}...` : code;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("is-visible"), 1800);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
