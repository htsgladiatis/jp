// Job Person — behaviour without dependencies.
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- шапка: тень при скролле ---------- */
  var header = document.getElementById("header");
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- мобильное меню ---------- */
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");

  var closeMenu = function () {
    if (!nav || !burger) return;
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Открыть меню");
  };

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  /* ---------- появление блоков ---------- */
  var revealTargets = document.querySelectorAll(
    ".section__head, .card, .step, .stats, .plan, .pay, .person, .form, .cards__footer, .note"
  );

  if (!reduced && "IntersectionObserver" in window) {
    revealTargets.forEach(function (el, index) {
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min(index % 4, 3) * 70 + "ms";
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    revealTargets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- форма заявки ---------- */
  var form = document.getElementById("lead-form");
  if (!form) return;

  var statusEl = form.querySelector(".form__status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var fields = {
    name: form.querySelector('[name="name"]'),
    phone: form.querySelector('[name="phone"]')
  };

  var setStatus = function (text, state) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("is-error", "is-ok");
    if (state) statusEl.classList.add(state);
  };

  var setInvalid = function (input, message) {
    var wrap = input.closest(".field");
    var errorEl = wrap && wrap.querySelector(".field__error");
    if (wrap) wrap.classList.toggle("is-invalid", Boolean(message));
    if (errorEl) errorEl.textContent = message || "";
    input.setAttribute("aria-invalid", message ? "true" : "false");
  };

  var validate = function () {
    var ok = true;

    var name = fields.name;
    if (name) {
      if (name.value.trim().length < 2) {
        setInvalid(name, "Напишите, как к вам обращаться");
        ok = false;
      } else {
        setInvalid(name, "");
      }
    }

    var phone = fields.phone;
    if (phone) {
      var digits = phone.value.replace(/\D/g, "");
      if (digits.length < 10) {
        setInvalid(phone, "Укажите телефон, чтобы мы могли перезвонить");
        ok = false;
      } else {
        setInvalid(phone, "");
      }
    }

    return ok;
  };

  // мягкое форматирование номера во время ввода
  if (fields.phone) {
    fields.phone.addEventListener("input", function () {
      var digits = this.value.replace(/\D/g, "");
      if (digits.startsWith("8")) digits = "7" + digits.slice(1);
      if (digits && digits[0] !== "7") digits = "7" + digits;
      digits = digits.slice(0, 11);

      var out = "";
      if (digits.length) {
        out = "+7";
        if (digits.length > 1) out += " " + digits.slice(1, 4);
        if (digits.length >= 5) out += " " + digits.slice(4, 7);
        if (digits.length >= 8) out += "-" + digits.slice(7, 9);
        if (digits.length >= 10) out += "-" + digits.slice(9, 11);
      }
      this.value = out;
      if (this.closest(".field")) {
        this.closest(".field").classList.remove("is-invalid");
      }
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setStatus("");

    if (!validate()) {
      var firstInvalid = form.querySelector(".is-invalid input");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // защита от ботов: скрытое поле должно остаться пустым
    var honeypot = form.querySelector('[name="company"]');
    if (honeypot && honeypot.value) return;

    var endpoint = form.getAttribute("data-endpoint");
    var data = new FormData(form);

    // Пока data-endpoint пустой, форма работает в демо-режиме:
    // показывает успешный ответ и ничего не отправляет.
    if (!endpoint) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Отправляем…";
      window.setTimeout(function () {
        setStatus("Спасибо! В демо-режиме заявка не отправляется — подключите php/send.php", "is-ok");
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить заявку";
        form.reset();
      }, 500);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляем…";

    fetch(endpoint, { method: "POST", body: data, headers: { "X-Requested-With": "fetch" } })
      .then(function (response) {
        return response.json().catch(function () {
          return { ok: response.ok };
        });
      })
      .then(function (result) {
        if (result && result.ok) {
          setStatus("Заявка отправлена. Перезвоним в течение 15 минут.", "is-ok");
          form.reset();
        } else {
          setStatus((result && result.error) || "Не получилось отправить. Позвоните: +7 903 136-40-09", "is-error");
        }
      })
      .catch(function () {
        setStatus("Сеть недоступна. Позвоните: +7 903 136-40-09", "is-error");
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить заявку";
      });
  });

  Object.keys(fields).forEach(function (key) {
    var input = fields[key];
    if (!input) return;
    input.addEventListener("input", function () {
      if (input.closest(".field") && input.closest(".field").classList.contains("is-invalid")) {
        setInvalid(input, "");
      }
    });
  });
})();
