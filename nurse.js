/* =========================================================
   CareBridge AI — Nurse Monitoring Portal
   nurse.js
   ========================================================= */

// ---------------------------------------------------------
// Supabase configuration
// ---------------------------------------------------------
const SUPABASE_URL = "https://zuhlajnydnfdmaglrazb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z2LMztBgCqofPHxJ6bQ9wQ_IKcdtM2F";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// ---------------------------------------------------------
// Session guard
// ---------------------------------------------------------
const nurseSession = sessionStorage.getItem("carebridgeNurseSession");
if (!nurseSession) {
  window.location.href = "login.html";
}

// ---------------------------------------------------------
// DOM references
// ---------------------------------------------------------
const nurseIdDisplay = document.getElementById("nurseIdDisplay");
const currentDateDisplay = document.getElementById("currentDateDisplay");
const logoutBtn = document.getElementById("logoutBtn");

const searchInput = document.getElementById("searchInput");
const patientCount = document.getElementById("patientCount");
const patientTable = document.getElementById("patientTable");
const patientTableBody = document.getElementById("patientTableBody");

const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");
const errorMessage = document.getElementById("errorMessage");
const noResultsState = document.getElementById("noResultsState");
const retryBtn = document.getElementById("retryBtn");

const detailPlaceholder = document.getElementById("detailPlaceholder");
const detailContent = document.getElementById("detailContent");

const vitalsForm = document.getElementById("vitalsForm");
const saveCheckBtn = document.getElementById("saveCheckBtn");
const saveStatus = document.getElementById("saveStatus");
const formPatientLabel = document.getElementById("formPatientLabel");

// ---------------------------------------------------------
// State
// ---------------------------------------------------------
let allPatients = [];
let selectedPatient = null;

// ---------------------------------------------------------
// Header: nurse id + date
// ---------------------------------------------------------
nurseIdDisplay.textContent = nurseSession;
currentDateDisplay.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("carebridgeNurseSession");
  window.location.href = "index.html";
});

// ---------------------------------------------------------
// Patient list: load, render, search (WITH BULLETPROOF FILTER)
// ---------------------------------------------------------
async function loadPatients() {
  setListState("loading");

  try {
    // 1. BULLETPROOF LOOKUP: Fetch all staff and search via JavaScript
    const { data: allStaff, error: staffError } = await supabaseClient
      .from("staff")
      .select("*");

    let nurseDept = null;

    if (allStaff) {
      const sessionVal = nurseSession.trim().toLowerCase();
      
      // Look for the nurse by matching EITHER their ID or their Full Name
      const matchedNurse = allStaff.find(staff => 
        (staff.employee_id && staff.employee_id.toLowerCase() === sessionVal) || 
        (staff.full_name && staff.full_name.toLowerCase() === sessionVal)
      );

      if (matchedNurse) {
        nurseDept = matchedNurse.department || matchedNurse.specialty || matchedNurse.ward;
      } else {
        console.warn("Could not find a staff match for:", nurseSession);
      }
    }

    // 2. Query patients (Active only)
    let query = supabaseClient
      .from("patients")
      .select("*")
      .eq("status", "Active")
      .order("created_at", { ascending: false });

    // 3. Apply department filter if we found the nurse's department
    if (nurseDept && nurseDept.trim() !== "" && nurseDept !== "—") {
      query = query.ilike("department", nurseDept.trim());
    }

    // 4. Execute final patient query
    const { data, error } = await query;

    if (error) {
      console.error("Failed to load patients:", error);
      errorMessage.textContent = error.message || "Please check your connection and try again.";
      setListState("error");
      return;
    }

    allPatients = data || [];
    patientCount.textContent = allPatients.length;

    if (allPatients.length === 0) {
      setListState("empty");
      return;
    }

    renderPatientRows(allPatients);
    setListState("table");

  } catch (err) {
    console.error("Unexpected error loading patients:", err);
    errorMessage.textContent = "An unexpected error occurred.";
    setListState("error");
  }
}

function setListState(state) {
  loadingState.hidden = state !== "loading";
  emptyState.hidden = state !== "empty";
  errorState.hidden = state !== "error";
  patientTable.hidden = state !== "table" && state !== "table-filtered";
  noResultsState.hidden = true;
}

function renderPatientRows(patients) {
  patientTableBody.innerHTML = "";

  patients.forEach((patient) => {
    const row = document.createElement("tr");
    row.dataset.patientId = patient.id;

    row.innerHTML = `
      <td>
        <span class="nb-patient-name">${escapeHtml(patient.full_name || "—")}</span>
        <span class="nb-patient-id">${escapeHtml(patient.patient_id || "—")}</span>
      </td>
      <td>${escapeHtml(patient.department || "—")}</td>
      <td>${escapeHtml(formatWardBed(patient))}</td>
      <td>${escapeHtml(patient.assigned_doctor || "—")}</td>
      <td>${escapeHtml(patient.admission_type || "—")}</td>
      <td><button type="button" class="nb-view-link">View</button></td>
    `;

    row.addEventListener("click", () => selectPatient(patient, row));

    patientTableBody.appendChild(row);
  });
}

function formatWardBed(patient) {
  const ward = patient.ward || "—";
  const bed = patient.bed_number || "—";
  return `${ward} / ${bed}`;
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    renderPatientRows(allPatients);
    patientTable.hidden = false;
    noResultsState.hidden = true;
    return;
  }

  const filtered = allPatients.filter((p) => {
    const name = (p.full_name || "").toLowerCase();
    const pid = (p.patient_id || "").toLowerCase();
    return name.includes(query) || pid.includes(query);
  });

  if (filtered.length === 0) {
    patientTable.hidden = true;
    noResultsState.hidden = false;
  } else {
    patientTable.hidden = false;
    noResultsState.hidden = true;
    renderPatientRows(filtered);
  }
});

retryBtn.addEventListener("click", loadPatients);

// ---------------------------------------------------------
// Patient details
// ---------------------------------------------------------
function selectPatient(patient, rowEl) {
  selectedPatient = patient;

  document
    .querySelectorAll(".nb-table tbody tr")
    .forEach((tr) => tr.classList.remove("is-active"));
  if (rowEl) rowEl.classList.add("is-active");

  detailPlaceholder.hidden = true;
  detailContent.hidden = false;

  document.getElementById("detailName").textContent = patient.full_name || "—";
  document.getElementById("detailPid").textContent = patient.patient_id || "—";
  document.getElementById("detailAdmissionType").textContent =
    patient.admission_type || "—";

  document.getElementById("detailAgeGender").textContent = `${
    patient.age ?? "—"
  } yrs · ${patient.gender || "—"}`;
  document.getElementById("detailBloodGroup").textContent =
    patient.blood_group || "—";
  document.getElementById("detailDepartment").textContent =
    patient.department || "—";
  document.getElementById("detailWardBed").textContent = formatWardBed(patient);
  document.getElementById("detailDoctor").textContent =
    patient.assigned_doctor || "—";
  document.getElementById("detailAdmissionDate").textContent = formatDate(
    patient.admission_date
  );
  document.getElementById("detailComplaint").textContent =
    patient.complaint || "Not recorded.";

  document.getElementById("detailGuardianName").textContent =
    patient.guardian_name || "—";
  document.getElementById("detailGuardianRelation").textContent =
    patient.relationship || "—";
  document.getElementById("detailGuardianPhone").textContent =
    patient.guardian_phone || "—";

  // Load the Doctor's Orders
  document.getElementById("detailCarePlan").textContent = 
    patient.routine_tests || "Standard Vitals (BP, HR, Temp)";

  formPatientLabel.textContent = `${patient.full_name || "—"} (${
    patient.patient_id || "—"
  })`;

  vitalsForm.reset();
  clearFieldErrors();
  saveStatus.textContent = "";
  saveStatus.removeAttribute("data-state");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------
// Daily routine check — validation + Supabase insert
// ---------------------------------------------------------
const vitalsFieldConfig = [
  { id: "heartRate", label: "Heart rate", min: 20, max: 250 },
  { id: "systolicBp", label: "Systolic BP", min: 50, max: 260 },
  { id: "diastolicBp", label: "Diastolic BP", min: 30, max: 180 },
  { id: "spo2", label: "SpO₂", min: 0, max: 100 },
  { id: "temperature", label: "Temperature", min: 85, max: 110 },
  { id: "bloodSugar", label: "Blood sugar", min: 0, max: 800 },
];

function clearFieldErrors() {
  vitalsFieldConfig.forEach(({ id }) => {
    const field = document.getElementById(id).closest(".nb-field");
    field.classList.remove("is-invalid");
    const errEl = document.querySelector(`[data-error-for="${id}"]`);
    if (errEl) errEl.textContent = "";
  });
}

function validateVitalsForm() {
  clearFieldErrors();
  let isValid = true;
  let hasAtLeastOneValue = false; 
  const values = {};

  vitalsFieldConfig.forEach(({ id, label, min, max }) => {
    const input = document.getElementById(id);
    const raw = input.value.trim();
    const field = input.closest(".nb-field");
    const errEl = document.querySelector(`[data-error-for="${id}"]`);

    // If blank, it's optional! Skip validation and set to null.
    if (raw === "") {
      values[id] = null;
      return; 
    }

    hasAtLeastOneValue = true;
    const num = Number(raw);
    if (Number.isNaN(num) || num < min || num > max) {
      field.classList.add("is-invalid");
      if (errEl) errEl.textContent = `Enter a value between ${min} and ${max}.`;
      isValid = false;
      return;
    }

    values[id] = num;
  });

  const nurseNotes = document.getElementById("nurseNotes").value.trim();
  if (nurseNotes !== "") hasAtLeastOneValue = true;

  // Ensure they didn't submit a completely empty form
  if (!hasAtLeastOneValue && isValid) {
      isValid = false;
      saveStatus.dataset.state = "error";
      saveStatus.textContent = "Please enter at least one measurement or note.";
  }

  return { isValid, values };
}

vitalsForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedPatient) {
    saveStatus.dataset.state = "error";
    saveStatus.textContent = "Select a patient before saving a check.";
    return;
  }

  saveStatus.textContent = ""; // Clear old status
  const { isValid, values } = validateVitalsForm();
  
  if (!isValid) {
    if (saveStatus.textContent === "") {
        saveStatus.dataset.state = "error";
        saveStatus.textContent = "Please fix the highlighted fields.";
    }
    return;
  }

  const nurseNotes = document.getElementById("nurseNotes").value.trim();

  saveCheckBtn.disabled = true;
  saveStatus.dataset.state = "saving";
  saveStatus.textContent = "Saving…";

  const { error } = await supabaseClient.from("vitals").insert({
    patient_id: selectedPatient.patient_id,
    heart_rate: values.heartRate,
    systolic_bp: values.systolicBp,
    diastolic_bp: values.diastolicBp,
    spo2: values.spo2,
    temperature: values.temperature,
    blood_sugar: values.bloodSugar,
    nurse_notes: nurseNotes || null,
  });

  saveCheckBtn.disabled = false;

  if (error) {
    console.error("Failed to save vitals:", error);
    saveStatus.dataset.state = "error";
    saveStatus.textContent =
      error.message || "Couldn't save this check. Please try again.";
    return;
  }

  saveStatus.dataset.state = "success";
  saveStatus.textContent = "Daily check saved.";

  vitalsFieldConfig.forEach(({ id }) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("nurseNotes").value = "";
});

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
loadPatients();
