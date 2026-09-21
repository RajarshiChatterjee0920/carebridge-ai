/* =======================================================================
   CareBridge AI — script.js
   Plain, vanilla JavaScript. No frameworks, no build step.
   Everything here is placeholder/demo behavior — once a backend and
   database are ready, the TODO section near the bottom is where real
   navigation / authentication logic would go.
   ======================================================================= */

document.addEventListener("DOMContentLoaded", function () {
  setupMobileMenu();
  setupStaffLoginNavigation();
  setupScrollReveal();
  setupHeroTilt();
});

/* -----------------------------------------------------------------------
   1. MOBILE MENU
   Toggles the hamburger menu open/closed on small screens.
   ----------------------------------------------------------------------- */
function setupMobileMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (!menuToggle || !mobileMenu) return;

  menuToggle.addEventListener("click", function () {
    const isOpen = !mobileMenu.hidden;

    mobileMenu.hidden = isOpen;
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
  });

  // Close the mobile menu automatically after tapping a link inside it.
  mobileMenu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mobileMenu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}
function setupStaffLoginNavigation() {
  const staffLoginButtonIds = [
    "staffLoginBtn",
    "staffLoginNavBtn",
    "staffLoginMobileBtn"
  ];

  staffLoginButtonIds.forEach(function (buttonId) {
    const button = document.getElementById(buttonId);

    if (!button) return;

    button.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "login.html";
    });
  });
}

/* -----------------------------------------------------------------------
   2. DEMO MODAL
   "Patient Admission" and "Staff Login" don't have a real backend yet,
   so clicking them opens a small popup explaining that this is a
   prototype, instead of doing nothing at all.
   ----------------------------------------------------------------------- */
function setupDemoModal() {
  const modal = document.getElementById("demoModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const closeBtn = document.getElementById("modalClose");

  if (!modal || !modalTitle || !modalBody || !closeBtn) return;

  // Text shown for each button, keyed by button id.
  const demoMessages = {
    patientAdmissionBtn: {
      title: "Patient Admission (Demo)",
      body: "In the full version, this opens the admission form and saves the new patient to the hospital's central database. No real patient data is stored in this prototype."
    },
    staffLoginBtn: {
      title: "Staff Login (Demo)",
      body: "In the full version, this takes staff to a secure, role-based sign-in screen. Authentication isn't wired up yet in this prototype."
    },
    staffLoginNavBtn: {
      title: "Staff Login (Demo)",
      body: "In the full version, this takes staff to a secure, role-based sign-in screen. Authentication isn't wired up yet in this prototype."
    },
    staffLoginMobileBtn: {
      title: "Staff Login (Demo)",
      body: "In the full version, this takes staff to a secure, role-based sign-in screen. Authentication isn't wired up yet in this prototype."
    }
  };

  // TODO (once a backend exists): instead of opening this modal, redirect
  // "Patient Admission" to admission.html and "Staff Login" to a real
  // login page, e.g. window.location.href = "admission.html";

  Object.keys(demoMessages).forEach(function (buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.addEventListener("click", function () {
      const message = demoMessages[buttonId];
      modalTitle.textContent = message.title;
      modalBody.textContent = message.body;
      modal.hidden = false;
      closeBtn.focus();
    });
  });

  function closeModal() {
    modal.hidden = true;
  }

  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
}

/* -----------------------------------------------------------------------
   3. SCROLL-REVEAL
   Fades and lifts elements with the "reveal-on-scroll" class into place
   once they enter the viewport. This is the page's main animated
   moment, applied consistently across sections rather than scattered
   one-off effects, and staggered slightly within each group so related
   items (like the five workflow steps) settle in left-to-right.
   ----------------------------------------------------------------------- */
function setupScrollReveal() {
  const items = document.querySelectorAll(".reveal-on-scroll");
  if (items.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach(function (item) {
      item.classList.add("in-view");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        // Small stagger based on position among siblings in the same
        // parent container, so grouped items (steps, cards) cascade in.
        const siblings = Array.from(entry.target.parentElement.children)
          .filter(function (el) { return el.classList.contains("reveal-on-scroll"); });
        const index = siblings.indexOf(entry.target);

        setTimeout(function () {
          entry.target.classList.add("in-view");
        }, Math.max(index, 0) * 80);

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );

  items.forEach(function (item) {
    observer.observe(item);
  });
}

/* -----------------------------------------------------------------------
   4. HERO DASHBOARD TILT (subtle 3D micro-interaction)
   As the pointer moves over the hero illustration, the floating
   dashboard card tilts slightly toward it. This is a CSS-only "3D
   feel" — just a transform, no 3D engine involved. Skipped entirely
   on touch devices and for people who prefer reduced motion.
   ----------------------------------------------------------------------- */
function setupHeroTilt() {
  const stage = document.getElementById("heroStage");
  const card = document.getElementById("dashboardCard");
  if (!stage || !card) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

  if (prefersReducedMotion || isTouchDevice) return;

  stage.addEventListener("mousemove", function (event) {
    const bounds = stage.getBoundingClientRect();

    // Position of the pointer within the stage, from -1 to 1 on each axis
    const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;

    // Keep the tilt gentle: a handful of degrees, not a full spin
    const rotateY = relativeX * 14;   // left/right tilt
    const rotateX = relativeY * -10;  // up/down tilt

    card.style.transform =
      "rotateY(" + rotateY + "deg) rotateX(" + rotateX + "deg)";
  });

  // Ease back to the resting tilt when the pointer leaves the stage
  stage.addEventListener("mouseleave", function () {
    card.style.transform = "rotateY(-7deg) rotateX(5deg)";
  });
}

/* -----------------------------------------------------------------------
   TODO — FUTURE DATABASE / BACKEND CONNECTION
   When a backend is ready, this is roughly where an actual API call
   would replace the demo modal, for example:

   fetch("/api/patients", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name: "...", age: "..." })
   });
   ----------------------------------------------------------------------- */
