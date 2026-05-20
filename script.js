const PROFILE_KEY = "astralProfile";
const SESSION_KEY = "astralSession";
const REVIEWS_KEY = "astralReviews";
const SUPPORT_EMAIL = "sergeybruskov1@gmail.com";
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 1.6
      }
    });
  }

  initAccountModal();
  initHelpModal();
  initReviewModal();
  initShopModal();
  initDonateModal();
});

function initBaseModal({ modalSelector, triggerSelector, closeSelector, onOpen }) {
  const modal = document.querySelector(modalSelector);
  if (!modal) return null;

  const triggers = document.querySelectorAll(triggerSelector);
  const closers = modal.querySelectorAll(closeSelector);

  const openModal = () => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (onOpen) onOpen(modal);
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal();
    });
  });

  closers.forEach((closer) => {
    closer.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  return { modal, openModal, closeModal };
}

function initShopModal() {
  const modalApi = initBaseModal({
    modalSelector: "#shop-modal",
    triggerSelector: "[data-shop-trigger]",
    closeSelector: "[data-shop-close]"
  });
  if (!modalApi) return;

  const message = modalApi.modal.querySelector("[data-shop-message]");
  const buttons = modalApi.modal.querySelectorAll("[data-plan]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const plan = button.dataset.plan || "Подписка";
      if (plan === "Обычная") {
        setMessage(message, "Обычная подписка уже доступна всем бесплатно.");
        return;
      }

      const subject = `[Astral] Подписка ${plan}`;
      const body = [
        `Пользователь хочет оформить подписку: ${plan}.`,
        "",
        "После подключения платежей здесь будет автоматическая покупка."
      ].join("\n");

      window.location.href = buildMailto(subject, body);
      setMessage(message, `Заявка на ${plan} подготовлена.`);
    });
  });
}

function initDonateModal() {
  const modalApi = initBaseModal({
    modalSelector: "#donate-modal",
    triggerSelector: "[data-donate-trigger]",
    closeSelector: "[data-donate-close]"
  });
  if (!modalApi) return;

  const form = modalApi.modal.querySelector("[data-donate-form]");
  const message = modalApi.modal.querySelector("[data-donate-message]");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const amount = String(formData.get("amount") || "").trim();
    const note = String(formData.get("message") || "").trim();

    const subject = `[Astral] Донат $${amount}`;
    const body = [
      `Сумма: $${amount}`,
      "",
      "Комментарий:",
      note || "Без комментария",
      "",
      "После подключения платежей здесь будет автоматический донат."
    ].join("\n");

    window.location.href = buildMailto(subject, body);
    setMessage(message, "Заявка на донат подготовлена.");
  });
}

function initHelpModal() {
  const modalApi = initBaseModal({
    modalSelector: "#help-modal",
    triggerSelector: "[data-help-trigger]",
    closeSelector: "[data-help-close]",
    onOpen: (modal) => {
      setMessage(modal.querySelector("[data-help-message]"), "");
    }
  });
  if (!modalApi) return;

  const form = modalApi.modal.querySelector("[data-help-form]");
  const message = modalApi.modal.querySelector("[data-help-message]");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const type = String(formData.get("type") || "Обращение").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const text = String(formData.get("message") || "").trim();
    const file = form.querySelector('input[name="attachment"]')?.files?.[0];

    if (file && file.size > MAX_ATTACHMENT_SIZE) {
      setMessage(message, "Файл слишком большой. Можно прикрепить изображение до 5 МБ.");
      return;
    }

    const bodyLines = [
      `Тип обращения: ${type}`,
      `Ваш email: ${email}`,
      file ? `Файл: ${file.name} (${Math.round(file.size / 1024)} КБ)` : "Файл: не прикреплен",
      "",
      "Сообщение:",
      text
    ];

    window.location.href = buildMailto(`[Astral] ${type}: ${subject}`, bodyLines.join("\n"));
    setMessage(message, "Письмо подготовлено. Если нужен файл в письме, прикрепи его в почтовом приложении.");
  });
}

function initReviewModal() {
  const modalApi = initBaseModal({
    modalSelector: "#review-modal",
    triggerSelector: "[data-review-trigger]",
    closeSelector: "[data-review-close]",
    onOpen: (modal) => {
      setMessage(modal.querySelector("[data-review-message]"), "");
    }
  });
  const track = document.querySelector("[data-reviews-track]");
  if (!modalApi || !track) return;

  const form = modalApi.modal.querySelector("[data-review-form]");
  const message = modalApi.modal.querySelector("[data-review-message]");
  const ratingInput = form.querySelector('input[name="rating"]');
  const stars = Array.from(form.querySelectorAll("[data-rating]"));
  const starGroup = form.querySelector("[data-star-rating]");
  const defaultReviews = Array.from(track.children).map((card) => ({
    name: card.querySelector("strong")?.textContent || "Гость",
    rating: card.querySelector("small")?.textContent || "",
    text: card.querySelector("p")?.textContent || ""
  }));

  renderReviews();
  setStars(0);

  stars.forEach((star) => {
    star.addEventListener("mouseenter", () => {
      setStars(Number(star.dataset.rating || 0));
    });
    star.addEventListener("click", () => {
      const value = Number(star.dataset.rating || 0);
      ratingInput.value = String(value);
      setStars(value);
    });
  });

  starGroup?.addEventListener("mouseleave", () => {
    setStars(Number(ratingInput.value || 0));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const review = {
      name: String(formData.get("name") || "").trim(),
      rating: String(formData.get("rating") || "0"),
      text: String(formData.get("text") || "").trim()
    };

    if (Number(review.rating) < 1) {
      setMessage(message, "Выбери оценку от 1 до 5 звезд.");
      return;
    }

    const reviews = getStoredReviews();
    reviews.unshift(review);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews.slice(0, 20)));
    renderReviews();
    form.reset();
    ratingInput.value = "0";
    setStars(0);
    setMessage(message, "Отзыв опубликован в ленте.");

    const bodyLines = [
      `Имя: ${review.name}`,
      `Оценка: ${review.rating}/5`,
      "",
      "Отзыв:",
      review.text
    ];
    window.location.href = buildMailto(`[Astral] Новый отзыв: ${review.rating}/5`, bodyLines.join("\n"));
  });

  function renderReviews() {
    const stored = getStoredReviews();
    const reviews = [...stored, ...defaultReviews];
    const looped = [...reviews, ...reviews];
    track.innerHTML = looped.map(renderReviewCard).join("");
  }

  function renderReviewCard(review) {
    const rating = review.rating ? `<small>${escapeHtml(review.rating)}</small>` : "";
    return [
      '<article class="review-card">',
      `<strong>${escapeHtml(review.name || "Гость")}</strong>`,
      rating,
      `<p>${escapeHtml(review.text || "")}</p>`,
      "</article>"
    ].join("");
  }

  function setStars(value) {
    stars.forEach((star) => {
      star.classList.toggle("is-active", Number(star.dataset.rating || 0) <= value);
    });
  }
}

function initAccountModal() {
  const modalApi = initBaseModal({
    modalSelector: "#account-modal",
    triggerSelector: "[data-account-trigger]",
    closeSelector: "[data-account-close]"
  });
  if (!modalApi) return;

  const { modal } = modalApi;
  const authView = modal.querySelector("[data-auth-view]");
  const profileView = modal.querySelector("[data-profile-view]");
  const tabs = modal.querySelectorAll("[data-auth-tab]");
  const forms = modal.querySelectorAll("[data-auth-form]");
  const loginForm = modal.querySelector('[data-auth-form="login"]');
  const registerForm = modal.querySelector('[data-auth-form="register"]');
  const loginMessage = modal.querySelector("[data-login-message]");
  const registerMessage = modal.querySelector("[data-register-message]");
  const editMessage = modal.querySelector("[data-edit-message]");
  const editForm = modal.querySelector("[data-profile-edit-form]");
  const logoutButton = modal.querySelector("[data-logout]");
  const editButton = modal.querySelector("[data-edit-profile]");
  const cancelEditButton = modal.querySelector("[data-cancel-edit]");
  const profileSummary = modal.querySelector(".profile-summary");
  const profileDetails = modal.querySelector(".profile-details");

  registerForm.elements.birthday?.addEventListener("input", () => {
    updateSignFromBirthday(registerForm);
  });

  editForm.elements.birthday?.addEventListener("input", () => {
    updateSignFromBirthday(editForm);
  });

  modalApi.openModal = () => {};
  document.querySelectorAll("[data-account-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const profile = getStoredProfile();
      const isLoggedIn = localStorage.getItem(SESSION_KEY) === "active";

      clearMessages();
      if (profile && isLoggedIn) {
        renderProfile(profile);
        showProfileView();
      } else {
        showAuthView();
        setActiveAuthTab("login");
      }
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveAuthTab(tab.dataset.authTab);
      clearMessages();
    });
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const profile = getStoredProfile();
    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim().toLowerCase();

    if (!profile) {
      setMessage(loginMessage, "Профиль еще не создан. Перейди во вкладку регистрации.");
      return;
    }

    if ((profile.email || "").toLowerCase() !== email) {
      setMessage(loginMessage, "Такой email не найден. Проверь адрес или зарегистрируйся.");
      return;
    }

    localStorage.setItem(SESSION_KEY, "active");
    renderProfile(profile);
    showProfileView();
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const profile = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      birthday: String(formData.get("birthday") || "").trim(),
      sign: getZodiacSign(String(formData.get("birthday") || "").trim())
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(SESSION_KEY, "active");
    renderProfile(profile);
    showProfileView();
    registerForm.reset();
    registerForm.elements.sign.value = "";
  });

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    hideEditForm();
    showAuthView();
    setActiveAuthTab("login");
  });

  editButton.addEventListener("click", () => {
    const profile = getStoredProfile();
    if (!profile) return;

    editForm.elements.name.value = profile.name || "";
    editForm.elements.email.value = profile.email || "";
    editForm.elements.birthday.value = profile.birthday || "";
    editForm.elements.sign.value = profile.sign || getZodiacSign(profile.birthday) || "";
    showEditForm();
  });

  cancelEditButton.addEventListener("click", hideEditForm);

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(editForm);
    const birthday = String(formData.get("birthday") || "").trim();
    const profile = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      birthday,
      sign: getZodiacSign(birthday)
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(SESSION_KEY, "active");
    renderProfile(profile);
    hideEditForm();
    setMessage(editMessage, "Изменения сохранены.");
  });

  function setActiveAuthTab(name) {
    tabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.authTab === name);
    });
    forms.forEach((form) => {
      form.classList.toggle("is-active", form.dataset.authForm === name);
    });
  }

  function showAuthView() {
    authView.hidden = false;
    profileView.hidden = true;
  }

  function showProfileView() {
    authView.hidden = true;
    profileView.hidden = false;
    hideEditForm();
  }

  function renderProfile(profile) {
    modal.querySelector("[data-profile-name]").textContent = profile.name || "Пользователь";
    modal.querySelector("[data-profile-email]").textContent = profile.email || "email не указан";
    modal.querySelector("[data-profile-sign]").textContent = profile.sign || "Не выбран";
    modal.querySelector("[data-profile-birthday]").textContent = formatDate(profile.birthday);
  }

  function showEditForm() {
    profileSummary.hidden = true;
    profileDetails.hidden = true;
    editForm.hidden = false;
    editButton.hidden = true;
    logoutButton.hidden = true;
    cancelEditButton.hidden = false;
    setMessage(editMessage, "");
  }

  function hideEditForm() {
    profileSummary.hidden = false;
    profileDetails.hidden = false;
    editForm.hidden = true;
    editButton.hidden = false;
    logoutButton.hidden = false;
    cancelEditButton.hidden = true;
  }

  function clearMessages() {
    setMessage(loginMessage, "");
    setMessage(registerMessage, "");
    setMessage(editMessage, "");
  }
}

function getStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY));
  } catch {
    return null;
  }
}

function getStoredReviews() {
  try {
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY));
    return Array.isArray(reviews) ? reviews : [];
  } catch {
    return [];
  }
}

function setMessage(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function buildMailto(subject, body) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatDate(value) {
  if (!value) return "Не указана";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateSignFromBirthday(form) {
  const birthday = form.elements.birthday?.value || "";
  const sign = getZodiacSign(birthday);
  if (form.elements.sign) {
    form.elements.sign.value = sign || "";
  }
}

function getZodiacSign(value) {
  if (!value) return "";
  const [, monthRaw, dayRaw] = value.split("-").map(Number);
  const month = monthRaw;
  const day = dayRaw;

  if (!month || !day) return "";
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Овен";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Телец";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Близнецы";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Рак";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Лев";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Дева";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Весы";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Скорпион";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Стрелец";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Козерог";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Водолей";
  return "Рыбы";
}
