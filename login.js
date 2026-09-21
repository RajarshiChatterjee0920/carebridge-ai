/* =======================================================================
   CareBridge AI — login.js
   ======================================================================= */

document.addEventListener("DOMContentLoaded", function () {
  setupRoleTabs();
  setupAdminLogin(); 
  setupRealNurseLogin(); // Real Supabase Auth
  setupRealDoctorLogin(); // Real Supabase Auth
});

/* -----------------------------------------------------------------------
   1. ROLE TABS (Administration / Nurse / Doctor)
   ----------------------------------------------------------------------- */
function setupRoleTabs() {
  const adminTab = document.getElementById("adminTab");
  const nurseTab = document.getElementById("nurseTab");
  const doctorTab = document.getElementById("doctorTab");

  const adminPanel = document.getElementById("adminPanel");
  const nursePanel = document.getElementById("nursePanel");
  const doctorPanel = document.getElementById("doctorPanel");

  if (!adminTab || !nurseTab || !doctorTab || !adminPanel || !nursePanel || !doctorPanel) return;

  const tabPanelMap = new Map([
    [adminTab, adminPanel],
    [nurseTab, nursePanel],
    [doctorTab, doctorPanel]
  ]);

  const tabs = Array.from(tabPanelMap.keys());

  function selectTab(tabToSelect) {
    tabs.forEach(function (tab) {
      const isSelected = tab === tabToSelect;
      tab.setAttribute("aria-selected", String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      tabPanelMap.get(tab).hidden = !isSelected;
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { selectTab(tab); });
  });

  tabs.forEach(function (tab, index) {
    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const nextIndex = event.key === "ArrowRight"
          ? (index + 1) % tabs.length
          : (index - 1 + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      selectTab(tabs[nextIndex]);
    });
  });
}

/* -----------------------------------------------------------------------
   2. ADMIN LOGIN (Keep as Demo for now)
   ----------------------------------------------------------------------- */
function setupAdminLogin() {
  const form = document.getElementById("adminLoginForm");
  const errorBox = document.getElementById("adminLoginError");

  if (!form || !errorBox) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const enteredId = document.getElementById("adminId").value.trim();
    const enteredPassword = document.getElementById("adminPassword").value;

    if (enteredId === "ADMIN001" && enteredPassword === "admin2026") {
      errorBox.hidden = true;
      sessionStorage.setItem("carebridgeAdminSession", "ADMIN001");
      window.location.href = "admin.html";
    } else {
      errorBox.textContent = "Invalid Employee ID or password. Please try again.";
      errorBox.hidden = false;
    }
  });
}

// ======================================================================
// 3. REAL SUPABASE STAFF LOGIN (NURSE & DOCTOR)
// ======================================================================
const SUPABASE_URL = "https://zuhlajnydnfdmaglrazb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_z2LMztBgCqofPHxJ6bQ9wQ_IKcdtM2F";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function setupRealNurseLogin() {
  const form = document.getElementById("nurseLoginForm");
  const errorBox = document.getElementById("loginError"); // The ID used in your HTML for nurse error

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const enteredId = document.getElementById("nurseId").value.trim();
      const enteredPassword = document.getElementById("nursePassword").value;

      const submitBtn = form.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying...";

      const { data, error } = await supabaseClient
        .from("staff")
        .select("full_name, role, password")
        .eq("employee_id", enteredId)
        .single();

      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";

      if (error || !data || data.role.toLowerCase() !== "nurse") {
        errorBox.textContent = "Invalid Nurse ID. Staff member not found.";
        errorBox.hidden = false;
        return;
      }

      const expectedPassword = data.password || "carebridge2026";
      
      if (enteredPassword !== expectedPassword) {
        errorBox.textContent = "Incorrect password. Please try again.";
        errorBox.hidden = false;
        return;
      }

      errorBox.hidden = true;
      sessionStorage.setItem("carebridgeNurseSession", data.full_name);
      window.location.href = "nurse.html";
    });
  }
}

function setupRealDoctorLogin() {
  const form = document.getElementById("doctorLoginForm");
  const errorBox = document.getElementById("doctorLoginError");

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const enteredId = document.getElementById("doctorId").value.trim();
      const enteredPassword = document.getElementById("doctorPassword").value;

      const submitBtn = form.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying...";

      const { data, error } = await supabaseClient
        .from("staff")
        .select("full_name, role, password")
        .eq("employee_id", enteredId)
        .single();

      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";

      if (error || !data || data.role.toLowerCase() !== "doctor") {
        errorBox.textContent = "Invalid Doctor ID. Staff member not found.";
        errorBox.hidden = false;
        return;
      }

      const expectedPassword = data.password || "doctor2026";
      
      if (enteredPassword !== expectedPassword) {
        errorBox.textContent = "Incorrect password. Please try again.";
        errorBox.hidden = false;
        return;
      }

      errorBox.hidden = true;
      sessionStorage.setItem("carebridgeDoctorSession", data.full_name);
      window.location.href = "doctor.html";
    });
  }
}