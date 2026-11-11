/* DachaDesign — shared Monobank checkout for 29 project pages.
 * This script runs on the public GitHub Pages origin only; project-b01 uses its own tested checkout.
 * Server remains the source of prices and R2 file keys.
 */
(() => {
  "use strict";

  const API = "https://dachadesign-payments.topala-cv.workers.dev";
  const STORAGE_KEY = "dachadesign-purchase-v1";
  const HISTORY_KEY = "dachadesign-orders-v1";

  function validSavedOrder(item) {
    return item && /^DD-[a-f0-9-]{36}$/i.test(item.orderId || "") &&
      /^[a-f0-9-]{70,100}$/.test(item.accessToken || "") &&
      /^DD-[BGHKNST][0-9]{2}$/.test(item.projectId || "");
  }

  function rememberOrder(next) {
    // Keep the existing current-order key for all already deployed pages.
    // Import that order into the new history before overwriting it.
    let previous = null;
    try { previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    // Save history before overwriting the former single-order record.
    // History is best-effort; never prevent checkout if the history is full.
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const list = Array.isArray(value) ? value : [];
      const seen = new Set();
      const saved = [];
      for (const candidate of [next, previous, ...list]) {
        if (!validSavedOrder(candidate) || seen.has(candidate.orderId)) continue;
        seen.add(candidate.orderId);
        saved.push({
          orderId: candidate.orderId,
          accessToken: candidate.accessToken,
          projectId: candidate.projectId,
          createdAt: Number.isFinite(candidate.createdAt) ? candidate.createdAt : Date.now()
        });
        if (saved.length >= 50) break;
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(saved));
    } catch (_) {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const match = /^project-([bghknst])(\d{2})(?:\.html)?$/i.exec(location.pathname.split("/").pop() || "");
  if (!match) return;
  const projectId = `DD-${match[1].toUpperCase()}${match[2]}`;
  if (projectId === "DD-B01") return;
  const form = document.querySelector("#order-form form.order-form");
  if (!form) {
    console.error("DachaDesign checkout: order form not found", projectId);
    return;
  }

  const button = form.querySelector('button[type="submit"],input[type="submit"]');
  if (!button) {
    console.error("DachaDesign checkout: submit button not found", projectId);
    return;
  }

  const words = {
    uk: {
      pay: "Перейти до оплати Monobank →", paying: "Створюємо рахунок для оплати…",
      description: "Заповніть контактні дані та перейдіть до безпечної оплати через monobank. Після підтвердження оплати завантажте придбаний PNG-проєкт.",
      error: "Не вдалося створити рахунок. Перевірте підключення та спробуйте ще раз. Гроші не списані цим запитом.",
      storage: "Браузер забороняє зберігати дані замовлення. Дозвольте зберігання для сайту й повторіть спробу.",
      url: "Сервер повернув некоректне посилання на оплату. Спробуйте пізніше.",
      disabled: "Оплата тимчасово недоступна. Спробуйте пізніше.",
      resume: "Переглянути попереднє замовлення →"
    },
    ru: {
      pay: "Перейти к оплате Monobank →", paying: "Создаём счёт на оплату…",
      description: "Заполните контакты и перейдите к безопасной оплате через monobank. После подтверждения оплаты скачайте приобретённый PNG-проект.",
      error: "Не удалось создать счёт. Проверьте соединение и попробуйте ещё раз. Этот запрос не списал деньги.",
      storage: "Браузер не позволяет сохранить данные заказа. Разрешите хранение данных сайта и попробуйте снова.",
      url: "Сервер вернул неверную ссылку оплаты. Попробуйте позже.",
      disabled: "Оплата временно недоступна. Попробуйте позже.",
      resume: "Посмотреть предыдущий заказ →"
    },
    en: {
      pay: "Proceed to Monobank payment →", paying: "Creating a payment invoice…",
      description: "Enter your contact details and continue to secure payment through monobank. After confirmation, download your purchased PNG project.",
      error: "Could not create an invoice. Check your connection and try again. This request did not charge your card.",
      storage: "The browser cannot save your order details. Allow site storage and try again.",
      url: "Invalid payment link returned. Please try later.",
      disabled: "Checkout is temporarily unavailable. Please try later.",
      resume: "View previous order →"
    }
  };
  function language() {
    let saved;
    try { saved = localStorage.getItem("dachadesign-language"); } catch (_) {}
    const lang = saved || document.documentElement.lang || "uk";
    return words[lang] ? lang : "uk";
  }
  const t = () => words[language()];
  let busy = false;

  // Prevent older translation code from restoring the Telegram enquiry label.
  button.removeAttribute("data-project-i18n");
  const description = document.querySelector("#order-form .order-form-text");
  if (description) description.removeAttribute("data-project-i18n");

  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.style.cssText = "display:none;margin:14px 0;padding:13px 16px;background:#fff2ef;color:#8a3029;border-radius:10px;line-height:1.5";
  button.parentNode.insertBefore(status, button.nextSibling);

  const resume = document.createElement("a");
  resume.href = "order-status.html";
  resume.style.cssText = "display:none;margin-top:14px;color:#3f7048;font-weight:700;text-decoration:underline";
  status.parentNode.insertBefore(resume, status.nextSibling);

  function label(text) {
    if (button.tagName === "INPUT") button.value = text;
    else button.textContent = text;
  }
  function refreshLabels() {
    if (!busy) label(t().pay);
    if (description) description.textContent = t().description;
    resume.textContent = t().resume;
  }
  function savedForThisProject() {
    let latest = null, history = [];
    try { latest = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(parsed)) history = parsed;
    } catch (_) {}
    return [latest, ...history].find(item =>
      validSavedOrder(item) && item.projectId === projectId) || null;
  }
  function refreshResume() {
    resume.style.display = savedForThisProject() ? "inline-block" : "none";
  }
  resume.addEventListener("click", () => {
    const saved = savedForThisProject();
    if (!saved) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) {}
  });
  function showError(text) {
    status.textContent = text;
    status.style.display = "block";
  }
  refreshLabels();
  refreshResume();

  // The existing project-page scripts register a normal bubble-phase submit handler
  // which sends enquiries to Telegram. A document capture listener runs first and
  // stops that handler so one action cannot create both an enquiry and an invoice.
  document.addEventListener("submit", async (event) => {
    if (event.target !== form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) return;

    const field = (name) => String(form.elements.namedItem(name)?.value || "").trim();
    const name = field("name");
    const contact = field("contact");
    const message = field("message");
    const website = field("website");
    if (name.length < 2 || contact.length < 3) {
      showError(t().error);
      return;
    }
    if (website) return; // Honeypot: do not send spam requests.

    busy = true;
    button.disabled = true;
    status.style.display = "none";
    label(t().paying);
    let redirecting = false;
    try {
      const response = await fetch(`${API}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ projectId, name, contact, message, website })
      });
      if (response.status === 503) throw new Error("disabled");
      if (!response.ok) throw new Error("checkout");
      const result = await response.json();
      if (result.projectId !== projectId ||
          !/^DD-[a-f0-9-]{36}$/i.test(result.orderId || "") ||
          !/^[a-f0-9-]{70,100}$/.test(result.accessToken || "") ||
          typeof result.paymentUrl !== "string") {
        throw new Error("checkout");
      }
      let paymentUrl;
      try { paymentUrl = new URL(result.paymentUrl); }
      catch (_) { throw new Error("paymentUrl"); }
      if (paymentUrl.protocol !== "https:" ||
          !["pay.monobank.ua", "pay.mbnk.biz"].includes(paymentUrl.hostname)) {
        throw new Error("paymentUrl");
      }
      try {
        rememberOrder({
          orderId: result.orderId,
          accessToken: result.accessToken,
          projectId,
          createdAt: Date.now()
        });
      } catch (_) { throw new Error("storage"); }
      refreshResume();
      redirecting = true;
      location.assign(paymentUrl.href);
    } catch (error) {
      console.error("DachaDesign checkout failed:", error.message);
      const msg = error.message === "storage" ? t().storage :
                  error.message === "paymentUrl" ? t().url :
                  error.message === "disabled" ? t().disabled : t().error;
      showError(msg);
    } finally {
      if (!redirecting) {
        busy = false;
        button.disabled = false;
        refreshLabels();
      }
    }
  }, true);

  // The page's existing language switcher can run after this script.
  document.addEventListener("click", (event) => {
    if (event.target.closest(".dd-language-switch")) {
      setTimeout(refreshLabels, 0);
    }
  }, true);
})();
