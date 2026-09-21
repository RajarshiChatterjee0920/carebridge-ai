// ======================================================================
// SUPABASE CONFIG
// ======================================================================
const SUPABASE_URL = "https://zuhlajnydnfdmaglrazb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_z2LMztBgCqofPHxJ6bQ9wQ_IKcdtM2F";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================================================================
// AUTH CHECK
// ======================================================================
const doctorName = sessionStorage.getItem("carebridgeDoctorSession");

if (!doctorName) {
  window.location.href = "login.html";
}

document.getElementById("doctorNameBadge").textContent = doctorName;

// ======================================================================
// STATE
// ======================================================================
let currentPatient = null; // holds the full patient row object currently open in Patient Detail

// ======================================================================
// STATUS BANNER HELPER
// ======================================================================
function showStatus(message, type = "info") {
  const banner = document.getElementById("statusBanner");
  banner.textContent = message;
  banner.className = `status-banner show ${type}`;
  setTimeout(() => {
    banner.classList.remove("show");
  }, 4500);
}

// ======================================================================
// SIDEBAR NAVIGATION
// ======================================================================
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".content-section");

function switchSection(sectionId) {
  sections.forEach((s) => s.classList.remove("active-section"));
  document.getElementById(sectionId).classList.add("active-section");

  navItems.forEach((b) => b.classList.remove("active"));
  const matchingNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (matchingNav) matchingNav.classList.add("active");
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => switchSection(btn.dataset.section));
});

document.getElementById("backToPatientsBtn").addEventListener("click", () => {
  switchSection("patients");
});

// ======================================================================
// LOGOUT
// ======================================================================
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("carebridgeDoctorSession");
  window.location.href = "login.html";
});

// ======================================================================
// DEMO SCHEDULE DATA (Dashboard/Schedule tab — no table for this yet)
// ======================================================================
const demoSchedule = [
  { time: "08:00 AM", patient: "Morning Ward Round", type: "Round", location: "General Ward", status: "Completed" },
  { time: "09:30 AM", patient: "Ramesh Gupta", type: "Checkup", location: "ICU-04", status: "Completed" },
  { time: "11:00 AM", patient: "Anita Roy", type: "Follow-up", location: "GW-12", status: "Upcoming" },
  { time: "02:00 PM", patient: "New Admission Review", type: "Consultation", location: "OPD-3", status: "Upcoming" },
  { time: "05:00 PM", patient: "Evening Ward Round", type: "Round", location: "General Ward", status: "Upcoming" },
];

function renderSchedule() {
  const body = document.getElementById("scheduleTableBody");
  body.innerHTML = demoSchedule.map((s) => `
    <tr>
      <td>${s.time}</td>
      <td>${s.patient}</td>
      <td>${s.type}</td>
      <td>${s.location}</td>
      <td><span class="status-pill ${s.status === "Completed" ? "status-active" : "status-discharged"}">${s.status}</span></td>
    </tr>
  `).join("");

  document.getElementById("statRoundsToday").textContent =
    demoSchedule.filter((s) => s.type === "Round").length;
}

// ======================================================================
// FETCH MY PATIENTS (assigned_doctor = doctorName, status = 'Active')
// ======================================================================
async function loadMyPatients() {
  const body = document.getElementById("patientsTableBody");
  body.innerHTML = `<tr><td colspan="7" class="muted-text">Loading patients...</td></tr>`;

  const { data, error } = await supabaseClient
    .from("patients")
    .select("*")
    .eq("assigned_doctor", doctorName)
    .eq("status", "Active");

  if (error) {
    console.error("Error loading patients:", error);
    body.innerHTML = `<tr><td colspan="7" class="muted-text">Failed to load patients: ${error.message}</td></tr>`;
    showStatus("Could not load your patients. Check console for details.", "error");
    return;
  }

  if (!data || data.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="muted-text">No active patients assigned to you right now.</td></tr>`;
    document.getElementById("statAssignedPatients").textContent = "0";
    document.getElementById("statCriticalCases").textContent = "0";
    return;
  }

  document.getElementById("statAssignedPatients").textContent = data.length;
  document.getElementById("statCriticalCases").textContent = "0";

  body.innerHTML = data.map((p) => `
    <tr>
      <td>${p.patient_id}</td>
      <td>${p.full_name}</td>
      <td>${p.bed_number || "—"}</td>
      <td>${p.guardian_name || "—"}</td>
      <td>${p.guardian_phone || "—"}</td>
      <td><span class="status-pill status-active">${p.status}</span></td>
      <td><button class="link-btn" data-patient-id="${p.patient_id}">View Details →</button></td>
    </tr>
  `).join("");

  // attach click handlers to the "View Details" buttons
  body.querySelectorAll("[data-patient-id]").forEach((btn) => {
    btn.addEventListener("click", () => openPatientDetail(btn.dataset.patientId, data));
  });
}

document.getElementById("refreshPatientsBtn").addEventListener("click", loadMyPatients);

// ======================================================================
// OPEN PATIENT DETAIL
// ======================================================================
function openPatientDetail(patientId, patientList) {
  const patient = patientList.find((p) => p.patient_id === patientId);
  if (!patient) return;

  currentPatient = patient;

  document.getElementById("detailPatientName").textContent = patient.full_name;
  document.getElementById("detailPatientMeta").textContent =
    `Patient ID: ${patient.patient_id}  •  Bed: ${patient.bed_number || "—"}`;

  const statusPill = document.getElementById("detailPatientStatus");
  statusPill.textContent = patient.status;
  statusPill.className = `status-pill ${patient.status === "Active" ? "status-active" : "status-discharged"}`;

  document.getElementById("guardianNameDisplay").textContent = patient.guardian_name || "—";
  document.getElementById("guardianPhoneDisplay").textContent = patient.guardian_phone || "—";

  // Load the current routine tests into the text area
  document.getElementById("routineTestsInput").value = patient.routine_tests || "Standard Vitals (BP, HR, Temp)";

  switchSection("patientDetail");

  loadPatientVitals(patient.patient_id);
  loadPrescriptions(patient.patient_id);
  loadSmsLog(patient.patient_id);
}

// ======================================================================
// FETCH LATEST VITALS FOR SELECTED PATIENT
// ======================================================================
async function loadPatientVitals(patientId) {
  const body = document.getElementById("vitalsTableBody");
  body.innerHTML = `<tr><td colspan="6" class="muted-text">Loading vitals...</td></tr>`;

  const { data, error } = await supabaseClient
    .from("vitals")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error loading vitals:", error);
    body.innerHTML = `<tr><td colspan="6" class="muted-text">Failed to load vitals: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="muted-text">No vitals recorded yet for this patient.</td></tr>`;
    return;
  }

  body.innerHTML = data.map((v) => {
    const recordedDate = v.recorded_at ? new Date(v.recorded_at).toLocaleString() : "—";
    const bp = (v.systolic_bp !== null && v.diastolic_bp !== null) ? `${v.systolic_bp}/${v.diastolic_bp} mmHg` : "<span class='muted-text' style='font-size:0.85em'>Not Tested</span>";
    const hr = (v.heart_rate !== null) ? `${v.heart_rate} bpm` : "<span class='muted-text' style='font-size:0.85em'>Not Tested</span>";
    const temp = (v.temperature !== null) ? `${v.temperature} °F` : "<span class='muted-text' style='font-size:0.85em'>Not Tested</span>";
    const sugar = (v.blood_sugar !== null) ? `${v.blood_sugar} mg/dL` : "<span class='muted-text' style='font-size:0.85em'>Not Tested</span>";
    
    // Grab the nurse's note from the database
    const notes = v.nurse_notes ? v.nurse_notes : "—"; 

    return `
      <tr>
        <td>${recordedDate}</td>
        <td>${hr}</td>
        <td>${bp}</td>
        <td>${temp}</td>
        <td>${sugar}</td>
        <td><strong>${notes}</strong></td> <!-- Display the note in the new 6th column -->
      </tr>
    `;
  }).join("");
}

document.getElementById("refreshVitalsBtn").addEventListener("click", () => {
  if (currentPatient) loadPatientVitals(currentPatient.patient_id);
});

// ======================================================================
// PRESCRIPTIONS
// ======================================================================
async function loadPrescriptions(patientId) {
  const body = document.getElementById("prescriptionsTableBody");
  body.innerHTML = `<tr><td colspan="5" class="muted-text">Loading prescriptions...</td></tr>`;

  const { data, error } = await supabaseClient
    .from("prescriptions")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading prescriptions:", error);
    body.innerHTML = `<tr><td colspan="5" class="muted-text">Could not load prescriptions. Have you created the 'prescriptions' table? (${error.message})</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="muted-text">No prescriptions added yet.</td></tr>`;
    return;
  }

  body.innerHTML = data.map((rx) => {
    const createdDate = rx.created_at ? new Date(rx.created_at).toLocaleDateString() : "—";
    return `
      <tr>
        <td>${rx.medicine_name}</td>
        <td>${rx.dosage}</td>
        <td>${rx.frequency}</td>
        <td>${rx.instructions || "—"}</td>
        <td>${createdDate}</td>
      </tr>
    `;
  }).join("");
}

document.getElementById("prescriptionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentPatient) {
    showStatus("No patient selected.", "error");
    return;
  }

  const medicineName = document.getElementById("medicineName").value.trim();
  const dosage = document.getElementById("medicineDosage").value.trim();
  const frequency = document.getElementById("medicineFrequency").value.trim();
  const instructions = document.getElementById("medicineInstructions").value.trim();

  // Safer button selection to prevent JS crashes
  const submitBtn = e.target.querySelector("button");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding...";
  }

  // 1. Save to the prescriptions table for the Doctor's records
  const { error: rxError } = await supabaseClient
    .from("prescriptions")
    .insert([{
      patient_id: currentPatient.patient_id,
      medicine_name: medicineName,
      dosage: dosage,
      frequency: frequency,
      instructions: instructions || null,
      prescribed_by: doctorName,
    }]);

  if (rxError) {
    console.error("Error adding prescription:", rxError);
    showStatus(`Failed to add prescription: ${rxError.message}`, "error");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "➕ Add to Daily Routine";
    }
    return;
  }

  // 2. HACKATHON MAGIC: Automatically alert the Nurse!
  // This grabs the current nursing instructions and appends the new medicine.
  const currentOrders = currentPatient.routine_tests || "Standard Vitals (BP, HR, Temp)";
  const newNurseAlert = `${currentOrders}\n[NEW RX]: ${medicineName} (${dosage}) - ${frequency}. ${instructions}`;
  
  const { error: updateError } = await supabaseClient
    .from("patients")
    .update({ routine_tests: newNurseAlert })
    .eq("patient_id", currentPatient.patient_id);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "➕ Add to Daily Routine";
  }

  if (updateError) {
     console.error("Prescription saved, but failed to alert nurse:", updateError);
     showStatus("Prescription saved, but failed to update Nurse's screen.", "info");
  } else {
     // Update the local Doctor screen instantly
     currentPatient.routine_tests = newNurseAlert;
     const routineBox = document.getElementById("routineTestsInput");
     if (routineBox) routineBox.value = newNurseAlert;
     
     showStatus("Prescription added and Nurse alerted!", "success");
  }

  e.target.reset();
  loadPrescriptions(currentPatient.patient_id);
});

// ======================================================================
// GUARDIAN CONTACT / SMS SIMULATION
// ======================================================================
async function loadSmsLog(patientId) {
  const body = document.getElementById("smsTableBody");
  body.innerHTML = `<tr><td colspan="4" class="muted-text">Loading notification log...</td></tr>`;

  const { data, error } = await supabaseClient
    .from("sms_notifications")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error loading SMS log:", error);
    body.innerHTML = `<tr><td colspan="4" class="muted-text">Failed to load log: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="muted-text">No notifications sent yet for this patient.</td></tr>`;
    return;
  }

  body.innerHTML = data.map((sms) => {
    const sentDate = sms.created_at ? new Date(sms.created_at).toLocaleString() : "—";
    const pillClass = sms.message_status === "sent" ? "status-sent" : "status-failed";
    return `
      <tr>
        <td>${sms.recipient_phone}</td>
        <td><span class="status-pill ${pillClass}">${sms.message_status}</span></td>
        <td>${sms.error_message || "—"}</td>
        <td>${sentDate}</td>
      </tr>
    `;
  }).join("");
}

document.getElementById("guardianForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentPatient) {
    showStatus("No patient selected.", "error");
    return;
  }

  if (!currentPatient.guardian_phone) {
    showStatus("This patient has no guardian phone number on file.", "error");
    return;
  }

  const urgency = document.getElementById("guardianUrgency").value;
  const message = document.getElementById("guardianMessage").value.trim();

  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  const fullMessage = `[${urgency}] ${message}`;

  const { error } = await supabaseClient
    .from("sms_notifications")
    .insert([{
      patient_id: currentPatient.patient_id,
      recipient_phone: currentPatient.guardian_phone,
      message_status: "sent",
      error_message: null,
    }]);

  submitBtn.disabled = false;
  submitBtn.textContent = "📩 Send Message";

  if (error) {
    console.error("Error sending guardian notification:", error);
    showStatus(`Failed to send notification: ${error.message}`, "error");
    return;
  }

  console.log("Simulated SMS content sent to guardian:", fullMessage);
  showStatus(`Message sent to guardian at ${currentPatient.guardian_phone} (simulated).`, "success");
  e.target.reset();
  loadSmsLog(currentPatient.patient_id);
});

// ======================================================================
// DISCHARGE PATIENT
// ======================================================================
document.getElementById("dischargeBtn").addEventListener("click", async () => {
  if (!currentPatient) {
    showStatus("No patient selected.", "error");
    return;
  }

  const confirmed = confirm(
    `Are you sure you want to discharge ${currentPatient.full_name} (${currentPatient.patient_id})? This will mark them as Discharged and free up bed ${currentPatient.bed_number || "N/A"}.`
  );

  if (!confirmed) return;

  const dischargeBtn = document.getElementById("dischargeBtn");
  dischargeBtn.disabled = true;
  dischargeBtn.textContent = "Discharging...";

  // STEP 1: Update the patient's status
  const { error: patientError } = await supabaseClient
    .from("patients")
    .update({ status: "Discharged" })
    .eq("patient_id", currentPatient.patient_id);

  if (patientError) {
    console.error("Error discharging patient:", patientError);
    showStatus(`Failed to discharge patient: ${patientError.message}`, "error");
    dischargeBtn.disabled = false;
    dischargeBtn.textContent = "🏁 Discharge Patient";
    return;
  }

  // STEP 2: Free up the bed, if the patient had one assigned
  if (currentPatient.bed_number) {
    const { error: bedError } = await supabaseClient
      .from("beds")
      .update({ status: "Available" })
      .eq("bed_number", currentPatient.bed_number);

    if (bedError) {
      console.error("Error updating bed status:", bedError);
      showStatus(
        `Patient discharged, but bed status update failed: ${bedError.message}`,
        "error"
      );
      dischargeBtn.disabled = false;
      dischargeBtn.textContent = "🏁 Discharge Patient";
    } else {
      showStatus(`${currentPatient.full_name} discharged and bed ${currentPatient.bed_number} marked Available.`, "success");
    }
  } else {
    showStatus(`${currentPatient.full_name} discharged.`, "success");
  }

  dischargeBtn.disabled = false;
  dischargeBtn.textContent = "🏁 Discharge Patient";

  currentPatient.status = "Discharged";
  const statusPill = document.getElementById("detailPatientStatus");
  statusPill.textContent = "Discharged";
  statusPill.className = "status-pill status-discharged";

  setTimeout(() => {
    switchSection("patients");
    loadMyPatients();
  }, 1200);
});

// ======================================================================
// SAVE ROUTINE TESTS / NURSING ORDERS
// ======================================================================
document.getElementById("routineTestsForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentPatient) {
    showStatus("No patient selected.", "error");
    return;
  }

  const newTests = document.getElementById("routineTestsInput").value.trim();
  const submitBtn = e.target.querySelector("button[type='submit']");
  
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  const { error } = await supabaseClient
    .from("patients")
    .update({ routine_tests: newTests })
    .eq("patient_id", currentPatient.patient_id);

  submitBtn.disabled = false;
  submitBtn.textContent = "💾 Save Orders";

  if (error) {
    console.error("Error updating routine tests:", error);
    showStatus(`Failed to update orders: ${error.message}`, "error");
    return;
  }

  currentPatient.routine_tests = newTests;
  showStatus("Nursing orders updated successfully!", "success");
});
// --- NEW: STRUCTURED PRESCRIPTION & DISCHARGE WORKFLOW ---
// --- NEW: DYNAMIC MEDICINE ROW GENERATOR ---
function addMedicineRow() {
  const container = document.getElementById("medicationContainer");
  const row = document.createElement("div");
  row.className = "med-row";
  row.style = "display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;";
  row.innerHTML = `
    <input type="text" class="rxMed" placeholder="Medicine (e.g., Ibuprofen)" style="flex: 2; min-width: 150px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
    <input type="text" class="rxTime" placeholder="Times (e.g., 1-0-1)" style="flex: 1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
    <select class="rxMeal" style="flex: 1; min-width: 120px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
      <option value="After Meal">After Meal</option>
      <option value="Before Meal">Before Meal</option>
      <option value="With Meal">With Meal</option>
    </select>
  `;
  container.appendChild(row);
}

// --- NEW: DYNAMIC MEDICINE ROW GENERATOR ---
function addMedicineRow() {
  const container = document.getElementById("medicationContainer");
  const row = document.createElement("div");
  row.className = "med-row";
  row.style = "display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;";
  row.innerHTML = `
    <input type="text" class="rxMed" placeholder="Medicine (e.g., Ibuprofen)" style="flex: 2; min-width: 150px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
    <input type="text" class="rxTime" placeholder="Times (e.g., 1-0-1)" style="flex: 1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
    <select class="rxMeal" style="flex: 1; min-width: 120px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
      <option value="After Meal">After Meal</option>
      <option value="Before Meal">Before Meal</option>
      <option value="With Meal">With Meal</option>
    </select>
  `;
  container.appendChild(row);
}

// --- UPGRADED: STRUCTURED PRESCRIPTION & DISCHARGE ---
async function handleDischargeWithRx(patientId, patientName, doctorName) {
  const rxFollowUp = document.getElementById("rxFollowUp").value.trim();
  const medRows = document.querySelectorAll(".med-row");
  let rowsHtml = "";

  // Loop through all medicine rows added by the doctor
  medRows.forEach(row => {
    const med = row.querySelector(".rxMed").value.trim();
    const time = row.querySelector(".rxTime").value.trim();
    const meal = row.querySelector(".rxMeal").value;
    
    if (med) {
      rowsHtml += `<tr style="border-bottom: 1px solid #ddd;">
                     <td style="padding: 12px 0;"><strong>${med}</strong></td>
                     <td style="padding: 12px 0;">${time || '--'}</td>
                     <td style="padding: 12px 0;">${meal}</td>
                   </tr>`;
    }
  });

  if (rowsHtml === "") {
    alert("Please prescribe at least one medicine before discharging.");
    return;
  }

  // Populate Print Template
  document.getElementById("printDocName").innerText = doctorName || "Attending Doctor";
  document.getElementById("printPatName").innerText = patientName || "Patient";
  document.getElementById("printDate").innerText = new Date().toLocaleDateString();
  document.getElementById("printMedTableBody").innerHTML = rowsHtml;
  document.getElementById("printFollowUpText").innerText = rxFollowUp || "None";

  // CRITICAL FIX: Temporarily add CSS class to format print specifically for Rx
  document.body.classList.add("print-rx-mode");
  const printContainer = document.getElementById("printRxContainer");
  printContainer.style.display = "block";
  
  window.print(); 
  
  // Cleanup CSS and HTML after printing
  printContainer.style.display = "none";
  document.body.classList.remove("print-rx-mode");

  // Execute Database Discharge
  try {
    await supabaseClient
      .from("patients")
      .update({ status: "Discharged", assigned_bed: null })
      .eq("patient_id", patientId);

    alert("Patient discharged successfully.");
    location.reload(); 
    
  } catch (error) {
    console.error("Error during discharge:", error);
    alert("Failed to update database.");
  }
}
// --- WIRE UP THE DISCHARGE BUTTON ---
const dischargeBtn = document.getElementById("dischargeBtn");

if (dischargeBtn) {
  dischargeBtn.addEventListener("click", () => {
    // For your hackathon demo, we are passing placeholder names here. 
    // If you have a way to grab the selected patient's actual name/ID from the UI, you can swap these out!
    const demoPatientId = "PAT_101";
    const demoPatientName = "John Doe";
    const demoDoctorName = "Dr. Smith";

    // Trigger the print and discharge function!
    handleDischargeWithRx(demoPatientId, demoPatientName, demoDoctorName);
  });
}
// ======================================================================
// INITIALIZE
// ======================================================================
renderSchedule();
loadMyPatients();