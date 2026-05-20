const SUPPORT_EMAIL = "sergeybruskov1@gmail.com";
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const SUPABASE_URL = "https://tdlqsnutibrnkodecwbk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_0Th8PHpxHzSrMx6blRO2Yg_oe5L_ovR";

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 1.6
      }
    });
  }

  initHelpModal();
  initReviewModal();
  initShopModal();
  initDonateModal();
  await initAccountModal();
});

function initBaseModal({ modalSelector, triggerSelector, closeSelector, onOpen }) {
  const modal = document.querySelector(modalSelector);
  if (!modal) return null;

  const triggers = document.querySelectorAll(triggerSelector);
  const closers = modal.querySelectorAll(closeSelector);

  const openModal = async () => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (onOpen) {
      await onOpen(modal);
    }
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", async (event) => {
      event.preventDefault();
      await openModal();
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
    button.addEventListener("click", async () => {
      const plan = button.dataset.plan || "Подписка";
      if (plan === "Обычная") {
        setMessage(message, "Обычная подписка уже доступна всем бесплатно.");
        return;
      }

      button.disabled = true;
      try {
        await insertRow("shop_orders", {
          plan,
          email: await getCurrentUserEmail()
        });
        setMessage(message, `Заявка на ${plan} сохранена. Когда подключим платежи, здесь появится настоящая покупка.`);
      } catch (error) {
        setMessage(message, getErrorMessage(error, "Не получилось сохранить заявку на подписку."));
      } finally {
        button.disabled = false;
      }
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

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const amount = Number(formData.get("amount") || 0);
    const note = String(formData.get("message") || "").trim();

    if (amount < 1) {
      setMessage(message, "Минимальная сумма доната — 1 доллар.");
      return;
    }

    toggleFormBusy(form, true);
    try {
      await insertRow("donations", {
        amount,
        message: note || null
      });
        setMessage(message, "Спасибо. Донат сохранен в системе. Следующим шагом подключим настоящую оплату.");
        form.reset();
        form.elements.amount.value = "1";
    } catch (error) {
      setMessage(message, getErrorMessage(error, "Не получилось сохранить донат."));
    } finally {
      toggleFormBusy(form, false);
    }
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

  form?.addEventListener("submit", async (event) => {
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

    toggleFormBusy(form, true);
    try {
      await insertRow("support_requests", {
        request_type: type,
        email,
        subject,
        message: text,
        attachment_name: file?.name || null
      });
      setMessage(
        message,
        `Обращение сохранено. Автоматическую отправку на ${SUPPORT_EMAIL} подключим следующим шагом через почтовый сервис.`
      );
      form.reset();
    } catch (error) {
      setMessage(message, getErrorMessage(error, "Не получилось сохранить обращение."));
    } finally {
      toggleFormBusy(form, false);
    }
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
    rating: "",
    text: card.querySelector("p")?.textContent || ""
  }));

  renderReviews().catch((error) => {
    console.error(error);
  });
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const review = {
      name: String(formData.get("name") || "").trim(),
      rating: Number(formData.get("rating") || 0),
      text: String(formData.get("text") || "").trim()
    };

    if (review.rating < 1) {
      setMessage(message, "Выбери оценку от 1 до 5 звезд.");
      return;
    }

    toggleFormBusy(form, true);
    try {
      await insertRow("reviews", review);
      await renderReviews();
      form.reset();
      ratingInput.value = "0";
      setStars(0);
      setMessage(message, "Отзыв опубликован в ленте.");
    } catch (error) {
      setMessage(message, getErrorMessage(error, "Не получилось опубликовать отзыв."));
    } finally {
      toggleFormBusy(form, false);
    }
  });

  async function renderReviews() {
    const remoteReviews = await fetchReviews();
    const reviews = remoteReviews.length ? remoteReviews : defaultReviews;
    const looped = [...reviews, ...reviews];
    track.innerHTML = looped.map(renderReviewCard).join("");
  }

  function renderReviewCard(review) {
    const rating = review.rating ? `<small>${"★".repeat(Number(review.rating))}</small>` : "";
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

async function initAccountModal() {
  const modalApi = initBaseModal({
    modalSelector: "#account-modal",
    triggerSelector: "[data-account-trigger]",
    closeSelector: "[data-account-close]",
    onOpen: async () => {
      await refreshAccountState();
    }
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

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveAuthTab(tab.dataset.authTab);
      clearMessages();
    });
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    toggleFormBusy(loginForm, true);
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      await refreshAccountState();
      loginForm.reset();
    } catch (error) {
      setMessage(loginMessage, getErrorMessage(error, "Не получилось войти в профиль."));
    } finally {
      toggleFormBusy(loginForm, false);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const formData = new FormData(registerForm);
    const birthday = String(formData.get("birthday") || "").trim();
    const sign = getZodiacSign(birthday);
    const profile = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      birthDate: birthday,
      zodiacSign: sign,
      password: String(formData.get("password") || "")
    };

    toggleFormBusy(registerForm, true);
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: profile.email,
        password: profile.password,
        options: {
          data: {
            name: profile.name,
            birth_date: profile.birthDate,
            zodiac_sign: profile.zodiacSign
          }
        }
      });
      if (error) throw error;

      if (data.session) {
        await upsertProfile({
          id: data.user.id,
          name: profile.name,
          email: profile.email,
          birth_date: profile.birthDate,
          zodiac_sign: profile.zodiacSign
        });
        await refreshAccountState();
      } else {
        setMessage(registerMessage, "Профиль создан. Подтверди email в письме от Supabase и потом войди.");
        registerForm.reset();
        registerForm.elements.sign.value = "";
        setActiveAuthTab("login");
      }
    } catch (error) {
      setMessage(registerMessage, getErrorMessage(error, "Не получилось создать профиль."));
    } finally {
      toggleFormBusy(registerForm, false);
    }
  });

  logoutButton.addEventListener("click", async () => {
    clearMessages();
    try {
      await supabaseClient.auth.signOut();
      showAuthView();
      setActiveAuthTab("login");
    } catch (error) {
      setMessage(loginMessage, getErrorMessage(error, "Не получилось выйти из профиля."));
    }
  });

  editButton.addEventListener("click", async () => {
    const profile = await loadCurrentProfile();
    if (!profile) return;

    editForm.elements.name.value = profile.name || "";
    editForm.elements.email.value = profile.email || "";
    editForm.elements.birthday.value = profile.birth_date || "";
    editForm.elements.sign.value = profile.zodiac_sign || getZodiacSign(profile.birth_date) || "";
    showEditForm();
  });

  cancelEditButton.addEventListener("click", hideEditForm);

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      setMessage(editMessage, "Сессия истекла. Войди еще раз.");
      showAuthView();
      setActiveAuthTab("login");
      return;
    }

    const formData = new FormData(editForm);
    const birthday = String(formData.get("birthday") || "").trim();
    const sign = getZodiacSign(birthday);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      birth_date: birthday,
      zodiac_sign: sign
    };

    toggleFormBusy(editForm, true);
    try {
      const { error: authError } = await supabaseClient.auth.updateUser({
        email: payload.email,
        data: {
          name: payload.name,
          birth_date: payload.birth_date,
          zodiac_sign: payload.zodiac_sign
        }
      });
      if (authError) throw authError;

      await upsertProfile({
        id: user.id,
        ...payload
      });

      await refreshAccountState();
      hideEditForm();
      setMessage(
        editMessage,
        payload.email === user.email
          ? "Изменения сохранены."
          : "Изменения сохранены. Если ты сменил email, Supabase может попросить подтвердить новый адрес."
      );
    } catch (error) {
      setMessage(editMessage, getErrorMessage(error, "Не получилось сохранить изменения."));
    } finally {
      toggleFormBusy(editForm, false);
    }
  });

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (!modal.classList.contains("is-open")) return;

    if (session?.user) {
      await refreshAccountState();
    } else {
      showAuthView();
      setActiveAuthTab("login");
      hideEditForm();
    }
  });

  await refreshAccountState();

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
    modal.querySelector("[data-profile-sign]").textContent = profile.zodiac_sign || "Не выбран";
    modal.querySelector("[data-profile-birthday]").textContent = formatDate(profile.birth_date);
  }

  async function refreshAccountState() {
    clearMessages();
    const profile = await loadCurrentProfile();
    if (profile) {
      renderProfile(profile);
      showProfileView();
    } else {
      showAuthView();
      setActiveAuthTab("login");
    }
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

async function loadCurrentProfile() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error(error);
    return null;
  }

  if (!user) return null;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, name, email, birth_date, zodiac_sign, subscription, forecast_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(profileError);
    return {
      id: user.id,
      name: user.user_metadata?.name || "Пользователь",
      email: user.email || "",
      birth_date: user.user_metadata?.birth_date || "",
      zodiac_sign: user.user_metadata?.zodiac_sign || "",
      subscription: "Обычная",
      forecast_type: "День и неделя"
    };
  }

  if (profile) return profile;

  const fallbackProfile = {
    id: user.id,
    name: user.user_metadata?.name || "Пользователь",
    email: user.email || "",
    birth_date: user.user_metadata?.birth_date || "",
    zodiac_sign: user.user_metadata?.zodiac_sign || getZodiacSign(user.user_metadata?.birth_date || ""),
    subscription: "Обычная",
    forecast_type: "День и неделя"
  };

  try {
    await upsertProfile(fallbackProfile);
  } catch (error) {
    console.error(error);
  }

  return fallbackProfile;
}

async function upsertProfile(profile) {
  const payload = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    birth_date: profile.birth_date || null,
    zodiac_sign: profile.zodiac_sign || null,
    subscription: profile.subscription || "Обычная",
    forecast_type: profile.forecast_type || "День и неделя"
  };

  const { error } = await supabaseClient.from("profiles").upsert(payload, {
    onConflict: "id"
  });
  if (error) throw error;
}

async function fetchReviews() {
  const { data, error } = await supabaseClient
    .from("reviews")
    .select("name, rating, text, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function insertRow(table, payload) {
  const { error } = await supabaseClient.from(table).insert(payload);
  if (error) throw error;
}

async function getCurrentUserEmail() {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  return user?.email || null;
}

function toggleFormBusy(form, isBusy) {
  const controls = form.querySelectorAll("button, input, select, textarea");
  controls.forEach((control) => {
    control.disabled = isBusy;
  });
}

function setMessage(element, text) {
  if (element) {
    element.textContent = text;
  }
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

function getErrorMessage(error, fallback) {
  if (!error) return fallback;
  return error.message || fallback;
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
