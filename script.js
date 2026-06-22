(() => {
  "use strict";

  /************************************************************
   * CONFIGURAÇÃO
   ************************************************************/
  const CONFIG = {
    useMockApi: true, // coloque false para chamar /api/criar-pix
    createPixEndpoint: "/api/criar-pix",
    statusPixEndpoint: "/api/status-pix",
    productName: "Taxa de Segurança",
    amount: 22.74,
    defaultExpiresIn: 592,
    enableStatusPolling: true,
    mockApproveAfterMs: 0 // teste: coloque 8000 para simular aprovação automática
  };

  /************************************************************
   * ELEMENTOS
   ************************************************************/
  const $ = (selector) => document.querySelector(selector);

  const screens = {
    checkout: $("#checkoutScreen"),
    pix: $("#pixScreen"),
    approved: $("#approvedScreen")
  };

  const checkoutForm = $("#checkoutForm");
  const fullName = $("#fullName");
  const phone = $("#phone");
  const nameErrorLine = fullName.closest(".field-line");
  const phoneErrorLine = phone.closest(".field-line");
  const continueBtn = $("#continueBtn");
  const loadingOverlay = $("#loadingOverlay");

  const pixAmount = $("#pixAmount");
  const pixCodePreview = $("#pixCodePreview");
  const countdown = $("#countdown");
  const progressBar = $("#progressBar");
  const pixStatusTitle = $("#pixStatusTitle");

  const backToCheckout = $("#backToCheckout");
  const copySmallBtn = $("#copySmallBtn");
  const copyBigBtn = $("#copyBigBtn");
  const openQrBtn = $("#openQrBtn");
  const closeQrBtn = $("#closeQrBtn");
  const qrOverlay = $("#qrOverlay");
  const qrcodeCanvas = $("#qrcodeCanvas");
  const howItWorksBtn = $("#howItWorksBtn");
  const howModal = $("#howModal");
  const closeHowBtn = $("#closeHowBtn");
  const toast = $("#toast");
  const finishApproved = $("#finishApproved");
  const newPaymentBtn = $("#newPaymentBtn");

  /************************************************************
   * ESTADO
   ************************************************************/
  const state = {
    transactionId: null,
    currentPixCode: "",
    currentQrBase64: "",
    currentAmount: CONFIG.amount,
    totalSeconds: CONFIG.defaultExpiresIn,
    remainingSeconds: CONFIG.defaultExpiresIn,
    timer: null,
    polling: null,
    toastTimer: null,
    mockApprovalTimer: null
  };

  /************************************************************
   * UTILITÁRIOS
   ************************************************************/
  function vibrate(ms = 12) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  function money(value, compact = false) {
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));

    return compact ? formatted.replace(/\s/g, "") : formatted;
  }

  function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 11);
  }

  function maskPhone(value) {
    const digits = normalizePhone(value);

    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
    if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
    return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
  }

  function isValidName(value) {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    return parts.length >= 2 && parts.join(" ").length >= 5;
  }

  function isValidPhone(value) {
    const digits = normalizePhone(value);
    return digits.length >= 10 && digits.length <= 11;
  }

  function validate({ showErrors = false } = {}) {
    const nameOk = isValidName(fullName.value);
    const phoneOk = isValidPhone(phone.value);
    const valid = nameOk && phoneOk;

    continueBtn.disabled = !valid;
    continueBtn.classList.toggle("enabled", valid);
    continueBtn.classList.toggle("disabled", !valid);

    if (showErrors) {
      nameErrorLine.classList.toggle("invalid", !nameOk);
      phoneErrorLine.classList.toggle("invalid", !phoneOk);
    } else {
      if (nameOk) nameErrorLine.classList.remove("invalid");
      if (phoneOk) phoneErrorLine.classList.remove("invalid");
    }

    return valid;
  }

  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("active"));
    screens[name].classList.add("active");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function setLoading(active) {
    loadingOverlay.classList.toggle("active", active);
    loadingOverlay.setAttribute("aria-hidden", active ? "false" : "true");
    continueBtn.classList.toggle("loading", active);
    continueBtn.disabled = active || !validate();
    document.body.style.overflow = active ? "hidden" : "";
  }

  function showToast(message = "Código copiado") {
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.add("active");
    state.toastTimer = setTimeout(() => toast.classList.remove("active"), 1700);
  }

  async function copyText(text) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
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

    vibrate();
    showToast("Código copiado");
  }

  function truncatePix(code) {
    if (!code) return "";
    return code.length > 43 ? `${code.slice(0, 43)}...` : code;
  }

  function timerText(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function stopTimers() {
    clearInterval(state.timer);
    clearInterval(state.polling);
    clearTimeout(state.mockApprovalTimer);
    state.timer = null;
    state.polling = null;
    state.mockApprovalTimer = null;
  }

  function startCountdown(seconds) {
    clearInterval(state.timer);

    state.totalSeconds = Number(seconds || CONFIG.defaultExpiresIn);
    state.remainingSeconds = state.totalSeconds;
    updateCountdownUI();

    state.timer = setInterval(() => {
      state.remainingSeconds -= 1;

      if (state.remainingSeconds <= 0) {
        state.remainingSeconds = 0;
        updateCountdownUI();
        clearInterval(state.timer);
        pixStatusTitle.textContent = "Pix expirado";
        showToast("O Pix expirou");
        return;
      }

      updateCountdownUI();
    }, 1000);
  }

  function updateCountdownUI() {
    countdown.textContent = timerText(state.remainingSeconds);
    const percent = (state.remainingSeconds / state.totalSeconds) * 100;
    progressBar.style.width = `${Math.max(0, percent)}%`;
    progressBar.classList.toggle("low", percent <= 25);
  }

  function openModal(modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function renderQr() {
    qrcodeCanvas.innerHTML = "";

    if (state.currentQrBase64) {
      const img = document.createElement("img");
      img.src = state.currentQrBase64.startsWith("data:")
        ? state.currentQrBase64
        : `data:image/png;base64,${state.currentQrBase64}`;
      img.alt = "QR Code Pix";
      qrcodeCanvas.appendChild(img);
      return;
    }

    if (!window.QRCode) {
      showToast("Biblioteca QR não carregou");
      return;
    }

    new QRCode(qrcodeCanvas, {
      text: state.currentPixCode,
      width: 238,
      height: 238,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  function getPayload() {
    return {
      nome: fullName.value.trim(),
      telefone: phone.value.trim(),
      telefoneDigits: normalizePhone(phone.value),
      produto: CONFIG.productName,
      valor: CONFIG.amount
    };
  }

  /************************************************************
   * API / MOCK
   ************************************************************/
  async function createPix(payload) {
    if (CONFIG.useMockApi) return createPixMock(payload);

    const response = await fetch(CONFIG.createPixEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Erro ao gerar Pix.");
    }

    return data;
  }

  async function createPixMock(payload) {
    await new Promise((resolve) => setTimeout(resolve, 950));

    return {
      sucesso: true,
      id: `mock_${Date.now()}`,
      valor: payload.valor,
      expiresIn: CONFIG.defaultExpiresIn,
      pixCopiaECola: "00020101021226900014br.gov.bcb.pix2571pix.exemplo.com/qr/v2/cob/98f7f2e2c0c34f8d8d0aa41a8d9a52035204000053039865802BR5925EMPRESA EXEMPLO LTDA6009SAO PAULO62070503***6304A1B2",
      qrCodeText: "00020101021226900014br.gov.bcb.pix2571pix.exemplo.com/qr/v2/cob/98f7f2e2c0c34f8d8d0aa41a8d9a52035204000053039865802BR5925EMPRESA EXEMPLO LTDA6009SAO PAULO62070503***6304A1B2",
      qrCodeBase64: ""
    };
  }

  async function getPaymentStatus(transactionId) {
    if (!transactionId) return { status: "pending" };

    if (CONFIG.useMockApi) return { status: "pending" };

    const url = `${CONFIG.statusPixEndpoint}?id=${encodeURIComponent(transactionId)}`;
    const response = await fetch(url, { method: "GET" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) return { status: "pending" };
    return data;
  }

  function startStatusPolling() {
    clearInterval(state.polling);

    if (!CONFIG.enableStatusPolling) return;

    if (CONFIG.useMockApi && CONFIG.mockApproveAfterMs > 0) {
      state.mockApprovalTimer = setTimeout(() => approvePayment(), CONFIG.mockApproveAfterMs);
      return;
    }

    if (CONFIG.useMockApi) return;

    state.polling = setInterval(async () => {
      try {
        const data = await getPaymentStatus(state.transactionId);
        const status = String(data.status || data.paymentStatus || "").toLowerCase();

        if (["paid", "approved", "aprovado", "completed", "concluido"].includes(status)) {
          approvePayment();
        }
      } catch (_) {
        // mantém silencioso para não quebrar UX
      }
    }, 5000);
  }

  function approvePayment() {
    stopTimers();
    closeModal(qrOverlay);
    closeModal(howModal);
    vibrate(20);
    showScreen("approved");
  }

  function fillPixScreen(data) {
    const amount = Number(data.valor || data.amount || CONFIG.amount);
    const pixCode = data.pixCopiaECola || data.qrCodeText || data.pixCode || data.copyPaste || "";

    state.transactionId = data.id || data.transactionId || data.txid || null;
    state.currentAmount = amount;
    state.currentPixCode = pixCode;
    state.currentQrBase64 = data.qrCodeBase64 || data.qrCodeImage || data.qrcodeBase64 || "";

    pixAmount.textContent = money(amount, true);
    pixCodePreview.textContent = truncatePix(pixCode);
    pixStatusTitle.textContent = "Aguardando pagamento";

    startCountdown(Number(data.expiresIn || data.expirationSeconds || CONFIG.defaultExpiresIn));
    showScreen("pix");
    startStatusPolling();
  }

  /************************************************************
   * EVENTOS
   ************************************************************/
  fullName.addEventListener("input", () => validate());
  fullName.addEventListener("blur", () => validate({ showErrors: true }));

  phone.addEventListener("input", () => {
    phone.value = maskPhone(phone.value);
    validate();
  });
  phone.addEventListener("blur", () => validate({ showErrors: true }));

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validate({ showErrors: true })) {
      vibrate(30);
      return;
    }

    setLoading(true);

    try {
      const data = await createPix(getPayload());
      fillPixScreen(data);
    } catch (error) {
      console.error(error);
      showToast(error.message || "Não foi possível gerar Pix");
    } finally {
      setLoading(false);
    }
  });

  backToCheckout.addEventListener("click", () => {
    stopTimers();
    showScreen("checkout");
  });

  copySmallBtn.addEventListener("click", () => copyText(state.currentPixCode));
  copyBigBtn.addEventListener("click", () => copyText(state.currentPixCode));

  openQrBtn.addEventListener("click", () => {
    renderQr();
    openModal(qrOverlay);
  });

  closeQrBtn.addEventListener("click", () => closeModal(qrOverlay));
  qrOverlay.addEventListener("click", (event) => {
    if (event.target === qrOverlay) closeModal(qrOverlay);
  });

  howItWorksBtn.addEventListener("click", () => openModal(howModal));
  closeHowBtn.addEventListener("click", () => closeModal(howModal));
  howModal.addEventListener("click", (event) => {
    if (event.target === howModal) closeModal(howModal);
  });

  finishApproved.addEventListener("click", () => showScreen("checkout"));
  newPaymentBtn.addEventListener("click", () => {
    fullName.value = "";
    phone.value = "";
    validate();
    showScreen("checkout");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeModal(qrOverlay);
    closeModal(howModal);
  });

  validate();
})();
