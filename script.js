// Kape d' Rico — interactions

// ---------- Nav: transparent over hero, solid ink on scroll ----------
const nav = document.getElementById("nav");

function updateNav() {
  nav.classList.toggle("is-scrolled", window.scrollY > 40);
}
window.addEventListener("scroll", updateNav, { passive: true });
updateNav();

// ---------- Mobile menu ----------
const burger = document.getElementById("navBurger");
const overlay = document.getElementById("menuOverlay");

function setMenu(open) {
  burger.classList.toggle("is-open", open);
  overlay.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
  overlay.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("menu-open", open);
  document.body.style.overflow = open ? "hidden" : "";
}

burger.addEventListener("click", () => {
  setMenu(!overlay.classList.contains("is-open"));
});

overlay.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

// ---------- Scroll-triggered fade-up ----------
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// ---------- Visit form (posts to GoHighLevel via /api/submit) ----------
const form = document.getElementById("visitForm");
const confirmMsg = document.getElementById("visitConfirm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const btn = form.querySelector('button[type="submit"]');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Sending\u2026";

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });

    if (!res.ok) {
      throw new Error("Request failed");
    }

    form.reset();
    confirmMsg.hidden = false;
  } catch {
    alert("Sorry, something went wrong. Please text us instead.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});
