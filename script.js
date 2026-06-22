const CONFIG = {
  // Produção: deixar false para usar as rotas /api/criar-pix e /api/pix-status.
  // Teste visual local: pode colocar true.
  useMockApi: false,

  amount: 32.57,
  productName: "Taxa de Segurança",

  // Se você usa UTMify, cole aqui o product_id real do produto BravoPay.
  // Também dá para configurar no Vercel como BRAVOPAY_PRODUCT_ID.
  productId: "",

  createPixEndpoint: "/api/criar-pix",
  statusEndpoint: "/api/pix-status",

  // Polling a cada 3s.
  pollingEveryMs: 3000,

  // Redirecionamento imediato após status PAID.
  upsellUrl: "/upsell",

  mockApproveAfterSeconds: 0,
  utmStorageKey: "checkout_first_utm_bravo"
};

const $ = (selector) => document.querySelector(selector);

const screens = {
  checkout: $("#checkoutScreen"),
  pix: $("#pixScreen"),
  approved: $("#approvedScreen")
};

const els = {
  app: $("#app"),
  form: $("#checkoutForm"),
  fullName: $("#fullName"),
  phone: $("#phoneNumber"),
  generate: $("#generatePixBtn"),
  productName: $("#productName"),
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
  toast: $("#toast"),
  bannerImage: $("#bannerImage"),
  bannerFallback: $("#bannerFallback")
};

let currentPix = {
  id: null,
  code: "",
  qrBase64: "",
  amount: CONFIG.amount,
  expiresIn: 600,
  createdAt: null,
  status: "PENDING"
};

let countdownInterval = null;
let pollingTimer = null;
let totalSeconds = 600;
let remainingSeconds = 600;
let toastTimer = null;

init();

function init() {
  captureUtmOnFirstAccess();

  els.productName.textContent = CONFIG.productName;
  els.checkoutAmount.textContent = formatBRL(CONFIG.amount);
  els.pixAmount.textContent = formatBRLCompact(CONFIG.amount);

  toggleBannerFallback();
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

  els.finish.addEventListener("click", redirectToUpsell);

  if (els.bannerImage) {
    els.bannerImage.addEventListener("error", toggleBannerFallback);
    els.bannerImage.addEventListener("load", toggleBannerFallback);
  }
}

function toggleBannerFallback() {
  if (!els.bannerImage || !els.bannerFallback) return;
  const loaded = !!els.bannerImage.complete && els.bannerImage.naturalWidth > 0;
  els.bannerFallback.style.display = loaded ? "none" : "block";
}

function handlePhoneInput(event) {
  event.target.value = maskPhone(event.target.value);
  validateCheckout();
}

function validateCheckout() {
  const name = els.fullName.value.trim();
  const phoneDigits = onlyDigits(els.phone.value);
  const valid = name.length >= 3 && phoneDigits.length >= 10;
  els.generate.disabled = !valid;
}

async function handleCreatePix(event) {
  event.preventDefault();

  const payload = buildPayload();
  if (!payload) return;

  setLoading(true);

  try {
    const data = CONFIG.useMockApi ? await createPixMock(payload) : await createPixReal(payload);

    fillPixData(data);
    showScreen("pix");
    startCountdown(currentPix.expiresIn);
    startPolling();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Não foi possível gerar o Pix");
  } finally {
    setLoading(false);
  }
}

function buildPayload() {
  const nome = els.fullName.value.trim();
  const telefone = els.phone.value.trim();
  const phoneDigits = onlyDigits(telefone);

  if (nome.length < 3) {
    showToast("Preencha o nome completo");
    return null;
  }

  if (phoneDigits.length < 10) {
    showToast("Preencha o telefone");
    return null;
  }

  return {
    nome,
    telefone,
    produto: CONFIG.productName,
    valor: CONFIG.amount,
    product_id: CONFIG.productId || undefined,
    external_reference: createExternalReference(),
    utm: getStoredUtm()
  };
}

async function createPixReal(payload) {
  const response = await fetch(CONFIG.createPixEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Erro ao gerar Pix");
  return data;
}

async function createPixMock(payload) {
  await wait(850);

  return {
    sucesso: true,
    id: "mock_tx_" + Date.now(),
    status: "PENDING",
    valor: payload.valor,
    expiresIn: 592,
    pixCopiaECola: "00020101021226900014br.gov.bcb.pix2571pix.exemplo.com/qr/v2/cob/f49d8c9b6de2450e9f78185204000053039865802BR5924PAGAMENTO SEGURO6009SAO PAULO62070503***6304A1B2",
    qrCodeText: "00020101021226900014br.gov.bcb.pix2571pix.exemplo.com/qr/v2/cob/f49d8c9b6de2450e9f78185204000053039865802BR5924PAGAMENTO SEGURO6009SAO PAULO62070503***6304A1B2",
    qrCodeBase64: ""
  };
}

function fillPixData(data) {
  currentPix = {
    id: data.id || data.transactionId || data.txid || null,
    status: String(data.status || "PENDING").toUpperCase(),
    code: data.pixCopiaECola || data.qrCodeText || data.copyPaste || data?.pix?.copy_paste || "",
    qrBase64: data.qrCodeBase64 || data.qrcodeBase64 || data.qrBase64 || "",
    amount: Number(data.valor || data.amount || centsToBRL(data.amount_cents) || CONFIG.amount),
    expiresIn: Number(data.expiresIn || data.expiration || secondsUntil(data.expiresAt || data.expires_at) || 600),
    createdAt: Date.now()
  };

  if (!currentPix.code) throw new Error("A API não retornou o código Pix copia e cola.");

  els.checkoutAmount.textContent = formatBRL(currentPix.amount);
  els.pixAmount.textContent = formatBRLCompact(currentPix.amount);
  els.pixCodeText.textContent = truncatePix(currentPix.code);
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
  screens[name].classList.add("is-active");
}

function backToCheckout() {
  stopPolling();
  clearInterval(countdownInterval);
  closeQrModal();
  showScreen("checkout");
}

function startCountdown(seconds) {
  clearInterval(countdownInterval);
  totalSeconds = Number(seconds || 600);
  remainingSeconds = Number(seconds || 600);
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
      pollingTimer = setTimeout(redirectToUpsell, CONFIG.mockApproveAfterSeconds * 1000);
    }
    return;
  }

  if (!currentPix.id) {
    showToast("ID da transação não retornado");
    return;
  }

  checkPixStatusOnce();
  pollingTimer = setInterval(checkPixStatusOnce, CONFIG.pollingEveryMs);
}

async function checkPixStatusOnce() {
  try {
    const data = await fetchPixStatus(currentPix.id);
    const status = String(data.status || data.paymentStatus || "").toUpperCase();

    if (status === "PAID") {
      redirectToUpsell();
      return;
    }

    if (["EXPIRED", "FAILED", "CANCELED", "CANCELLED"].includes(status)) {
      stopPolling();
      clearInterval(countdownInterval);
      showToast(status === "EXPIRED" ? "Pix expirado" : "Pagamento não aprovado");
    }
  } catch (error) {
    console.warn("Erro ao consultar Pix", error);
  }
}

function stopPolling() {
  if (!pollingTimer) return;
  clearInterval(pollingTimer);
  clearTimeout(pollingTimer);
  pollingTimer = null;
}

async function fetchPixStatus(id) {
  const response = await fetch(`${CONFIG.statusEndpoint}?id=${encodeURIComponent(id)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Erro ao consultar Pix");
  return data;
}

function redirectToUpsell() {
  stopPolling();
  clearInterval(countdownInterval);
  closeQrModal();
  window.location.href = CONFIG.upsellUrl;
}

function openQrModal() {
  if (!currentPix.code) {
    showToast("Gere o Pix primeiro");
    return;
  }

  els.qrcodeCanvas.innerHTML = "";

  if (currentPix.qrBase64) {
    const img = document.createElement("img");
    img.src = currentPix.qrBase64.startsWith("data:") ? currentPix.qrBase64 : `data:image/png;base64,${currentPix.qrBase64}`;
    img.alt = "QR Code Pix";
    els.qrcodeCanvas.appendChild(img);
  } else {
    new QRCode(els.qrcodeCanvas, {
      text: currentPix.code,
      width: 236,
      height: 236,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  els.qrOverlay.classList.add("is-open");
  els.qrOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeQrModal() {
  els.qrOverlay.classList.remove("is-open");
  els.qrOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function copyCurrentPixCode(isBigButton = false) {
  if (!currentPix.code) {
    showToast("Gere o Pix primeiro");
    return;
  }

  await copyText(currentPix.code);
  showToast("Código copiado");

  if (isBigButton) {
    const oldText = els.copyBig.textContent;
    els.copyBig.textContent = "Código copiado";
    setTimeout(() => { els.copyBig.textContent = oldText; }, 1200);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function setLoading(loading) {
  if (loading) {
    els.generate.disabled = true;
    els.generate.textContent = "GERANDO PIX...";
  } else {
    els.generate.textContent = "GERAR PIX";
    validateCheckout();
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 1800);
}

function captureUtmOnFirstAccess() {
  try {
    const alreadySaved = localStorage.getItem(CONFIG.utmStorageKey);
    if (alreadySaved) return;

    const params = new URLSearchParams(window.location.search);
    const utm = {
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      content: params.get("utm_content") || "",
      term: params.get("utm_term") || "",
      fbclid: params.get("fbclid") || "",
      ttclid: params.get("ttclid") || "",
      gclid: params.get("gclid") || ""
    };

    const hasAnyValue = Object.values(utm).some(Boolean);
    if (hasAnyValue) localStorage.setItem(CONFIG.utmStorageKey, JSON.stringify(utm));
  } catch (error) {
    console.warn("Não foi possível salvar UTMs", error);
  }
}

function getStoredUtm() {
  try {
    const saved = localStorage.getItem(CONFIG.utmStorageKey);
    if (!saved) return {};
    return JSON.parse(saved) || {};
  } catch {
    return {};
  }
}

function createExternalReference() {
  return `pedido_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function maskPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function truncatePix(code) {
  if (!code) return "";
  return code.length > 44 ? `${code.slice(0, 44)}...` : code;
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function formatBRLCompact(value) {
  return formatBRL(value).replace(/\s/g, "");
}

function centsToBRL(cents) {
  if (cents === undefined || cents === null || cents === "") return null;
  return Number(cents) / 100;
}

function secondsUntil(isoDate) {
  if (!isoDate) return null;
  const ms = new Date(isoDate).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 1000));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
