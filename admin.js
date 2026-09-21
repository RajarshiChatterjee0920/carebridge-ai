/* ======================================================================
   CareBridge AI — Administration & Operations Portal (FINAL & BULLETPROOF)
   ====================================================================== */

const SUPABASE_URL = "https://zuhlajnydnfdmaglrazb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z2LMztBgCqofPHxJ6bQ9wQ_IKcdtM2F";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ======================================================================
// 1. SESSION GUARD & BADGE
// ======================================================================
const adminSession = sessionStorage.getItem("carebridgeAdminSession") || "ADMIN001";
const adminBadge = document.getElementById("adminNameBadge");
if (adminBadge) adminBadge.textContent = adminSession;

// ======================================================================
// 2. SAFE SIDEBAR NAVIGATION
// ======================================================================
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".content-section");

function switchSection(sectionId) {
  sections.forEach((s) => s.classList.remove("active-section"));
  navItems.forEach((b) => b.classList.remove("active"));

  const targetSection = document.getElementById(sectionId);
  const targetNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);

  if (targetSection) targetSection.classList.add("active-section");
  if (targetNav) targetNav.classList.add("active");
}

navItems.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const sectionId = btn.dataset.section;
    if (sectionId) switchSection(sectionId);
  });
});

// ======================================================================
// 3. LOGOUT
// ======================================================================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem("carebridgeAdminSession");
    window.location.href = "index.html";
  });
}

// ======================================================================
// 4. MODALS & DYNAMIC DROPDOWNS
// ======================================================================
window.openModal = async function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
    try {
      await populateAllDropdownsAndLists();
    } catch (err) {
      console.error("Error populating dropdowns:", err);
    }
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
};

document.querySelectorAll("[data-modal]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const modalId = btn.dataset.modal;
    if (modalId) window.openModal(modalId);
  });
});

window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.style.display = "none";
  }
});

// THIS FUNCTION POPULATES EVERY DROPDOWN IN EVERY MODAL SAFELY
async function populateAllDropdownsAndLists() {
  // 1. Fetch all data from Supabase first
  const [staffRes, bedsRes, patRes] = await Promise.all([
    supabaseClient.from("staff").select("*"),
    supabaseClient.from("beds").select("*"),
    supabaseClient.from("patients").select("*")
  ]);

  const staff = staffRes.data || [];
  const beds = bedsRes.data || [];
  const patients = patRes.data || [];

  // 2. Base Hospital Departments & Wards (Ensures dropdowns are never empty)
  const defaultDepartments = [
    "Cardiology", "Orthopedics", "Neurology", "Emergency Medicine", 
    "General Surgery", "Pediatrics", "Gynecology", "Oncology", 
    "Radiology", "Internal Medicine", "ENT"
  ];
  
  const defaultWards = [
    "General Ward", "Emergency Ward", "ICU Ward", 
    "Maternity Ward", "Pediatric Ward", "Private Ward", "Recovery Room"
  ];

  // Merge defaults with any custom ones in the database

  const allDepartments = [...defaultDepartments].sort();
  const allWards = [...defaultWards].sort();

  // 3. Fill basic text dropdowns (Departments and Wards)
  const admitDept = document.getElementById("admitDepartment");
  if (admitDept) admitDept.innerHTML = `<option value="">Select Department</option>` + allDepartments.map(d => `<option value="${d}">${d}</option>`).join("");

  const admitWard = document.getElementById("admitWard");
  if (admitWard) admitWard.innerHTML = `<option value="">Select Ward</option>` + allWards.map(w => `<option value="${w}">${w}</option>`).join("");

  const nurseDept = document.getElementById("nurseDepartment");
  if (nurseDept) nurseDept.innerHTML = `<option value="">Select Department</option>` + allDepartments.map(d => `<option value="${d}">${d}</option>`).join("");

  const docDept = document.getElementById("doctorDepartment");
  if (docDept) docDept.innerHTML = `<option value="">Select Department</option>` + allDepartments.map(d => `<option value="${d}">${d}</option>`).join("");

  const bedWard = document.getElementById("bedWard");
  if (bedWard) bedWard.innerHTML = `<option value="">Select Ward</option>` + allWards.map(w => `<option value="${w}">${w}</option>`).join("");

  const bedDept = document.getElementById("bedDepartment");
  if (bedDept) bedDept.innerHTML = `<option value="">Select Department</option>` + allDepartments.map(d => `<option value="${d}">${d}</option>`).join("");

  // 4. Fill entity dropdowns (Beds, Doctors, Nurses, Patients)
  const availableBeds = beds.filter(b => b.status === "Available" || !b.status);
  const admitBed = document.getElementById("admitBed");
  if (admitBed) admitBed.innerHTML = `<option value="">Select Bed (Available Only)</option>` + availableBeds.map(b => `<option value="${b.bed_number}">${b.bed_number} (${b.ward || 'General'})</option>`).join("");

  const doctors = staff.filter(s => s.role && s.role.toLowerCase() === "doctor");
  const admitDoc = document.getElementById("admitDoctor");
  if (admitDoc) admitDoc.innerHTML = `<option value="">Assign Doctor</option>` + doctors.map(d => `<option value="${d.full_name}">${d.full_name}</option>`).join("");

  const activePatients = patients.filter(p => p.status === "Active" || !p.status);
  const assignPat = document.getElementById("assignPatient");
  if (assignPat) assignPat.innerHTML = `<option value="">Select Patient</option>` + activePatients.map(p => `<option value="${p.patient_id}">${p.full_name} (${p.patient_id})</option>`).join("");

  const assignDoc = document.getElementById("assignDoctor");
  if (assignDoc) assignDoc.innerHTML = `<option value="">Select Doctor</option>` + doctors.map(d => `<option value="${d.full_name}">${d.full_name}</option>`).join("");

  const nurses = staff.filter(s => s.role && s.role.toLowerCase() === "nurse");
  const assignNurse = document.getElementById("assignNurse");
  if (assignNurse) assignNurse.innerHTML = `<option value="">Select Nurse</option>` + nurses.map(n => `<option value="${n.full_name}">${n.full_name}</option>`).join("");

  const assignBed = document.getElementById("assignBed");
  if (assignBed) assignBed.innerHTML = `<option value="">Select Bed</option>` + beds.map(b => `<option value="${b.bed_number}">${b.bed_number} (${b.status || 'Available'})</option>`).join("");

  const billPatSelect = document.getElementById("billPatientSelect");
  if (billPatSelect) {
    const dischargedPatients = patients.filter(p => p.status === "Discharged");
    billPatSelect.innerHTML = `<option value="">-- Choose Discharged Patient --</option>` + 
      dischargedPatients.map(p => `<option value="${p.patient_id}">${p.full_name} (${p.patient_id}) - ${p.department || 'General'}</option>`).join("");
  }

  // 5. Auto-generate Patient ID for admission
  const patientIdInput = document.getElementById("admitPatientId");
  if (patientIdInput && !patientIdInput.value) {
    patientIdInput.value = "CB-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
  }
  // === NEW: SMART DROPDOWN FILTERS ===
  
  // 1. Admit Patient: Filter Doctors by selected Department
  const admitDeptDrop = document.getElementById("admitDepartment");
  if (admitDeptDrop && admitDoc) {
    admitDeptDrop.onchange = (e) => {
      const selectedDept = e.target.value;
      const filteredDocs = doctors.filter(d => d.department === selectedDept);
      admitDoc.innerHTML = `<option value="">Assign Doctor</option>` + 
        filteredDocs.map(d => `<option value="${d.full_name}">${d.full_name}</option>`).join("");
    };
  }

  // 2. Assign Patient: Filter Doctors & Nurses by the chosen Patient's Department
  if (assignPat && assignDoc && assignNurse) {
    assignPat.onchange = (e) => {
      const patient = activePatients.find(p => p.patient_id === e.target.value);
      if (patient) {
        const filteredDocs = doctors.filter(d => d.department === patient.department);
        const filteredNurses = nurses.filter(n => n.department === patient.department);
        
        assignDoc.innerHTML = `<option value="">Select Doctor</option>` + 
          filteredDocs.map(d => `<option value="${d.full_name}">${d.full_name}</option>`).join("");
        assignNurse.innerHTML = `<option value="">Select Nurse</option>` + 
          filteredNurses.map(n => `<option value="${n.full_name}">${n.full_name}</option>`).join("");
      }
    };
  }
}

// ======================================================================
// 5. LOAD DASHBOARD DATA & TABLES
// ======================================================================
async function loadAdminDashboard() {
  try {
    const [patientsRes, bedsRes, staffRes] = await Promise.all([
      supabaseClient.from("patients").select("*"),
      supabaseClient.from("beds").select("*"),
      supabaseClient.from("staff").select("*")
    ]);

    const patients = patientsRes.data || [];
    const beds = bedsRes.data || [];
    const staff = staffRes.data || [];

    const activePatients = patients.filter(p => p.status === "Active" || !p.status);
    const occupiedBeds = beds.filter(b => b.status === "Occupied" || b.status === "Assigned");
    const availableBeds = beds.filter(b => b.status === "Available" || !b.status);

    // Update Counters
    setElText("statTotalPatients", activePatients.length);
    setElText("statOccupiedBeds", occupiedBeds.length);
    setElText("statAvailableBeds", availableBeds.length);
    setElText("statActiveStaff", staff.length);

   // Render Data
  renderRecentAdmissions(patients);
  renderPatientsTable(patients);
  renderBedsGrid(beds);
  renderStaffTable(staff);
  loadDischargedBills(patients);

  // Render Data
  renderRecentAdmissions(patients);
  renderPatientsTable(patients);
  renderBedsGrid(beds);
  renderStaffTable(staff);
  loadDischargedBills(patients);

  // --- NEW: RENDER ASSIGNMENTS TABLE & SEARCH ---
  const assignBody = document.getElementById("assignmentsTableBody");
  const searchAssign = document.getElementById("searchAssignments");
  
  if (assignBody) {
    const activeAssignments = patients.filter(p => p.status === "Active");
    
    const renderAssignments = (list) => {
      if (list.length === 0) {
        assignBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #777;">No active assignments found.</td></tr>`;
        return;
      }
      assignBody.innerHTML = list.map(p => `
        <tr>
          <td><strong>${p.full_name || 'N/A'}</strong><br><small style="color: #666;">${p.patient_id || 'N/A'}</small></td>
          <td>${p.bed_number || '<span style="color:#999">Unassigned</span>'}</td>
          <td>${p.assigned_doctor || '<span style="color:#999">Unassigned</span>'}</td>
          <td>${p.assigned_nurse || '<span style="color:#999">Unassigned</span>'}</td>
          <td><strong style="color: #0F6B57;">${p.status}</strong></td>
        </tr>
      `).join("");
    };

    renderAssignments(activeAssignments);

    if (searchAssign) {
      searchAssign.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = activeAssignments.filter(p => 
          (p.full_name && p.full_name.toLowerCase().includes(term)) || 
          (p.patient_id && p.patient_id.toLowerCase().includes(term))
        );
        renderAssignments(filtered);
      });
    }
  }

  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}
// <--- END OF loadAdminDashboard FUNCTION --->

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderRecentAdmissions(patients) {
  const tbody = document.getElementById("recentAdmissionsBody");
  if (!tbody) return;
  const active = patients.filter(p => p.status === "Active" || !p.status).slice(0, 5);
  if (active.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">No active admissions.</td></tr>`;
    return;
  }
  tbody.innerHTML = active.map(p => `
    <tr>
      <td>${p.patient_id || "—"}</td>
      <td><strong>${p.full_name || "—"}</strong></td>
      <td>${p.department || "—"}</td>
      <td>${p.ward || "—"}</td>
      <td>${p.bed_number || "—"}</td>
      <td>${p.assigned_doctor || "—"}</td>
      <td><span style="background: #e1f5fe; color: #0277bd; padding: 3px 8px; border-radius: 4px; font-weight: bold;">Active</span></td>
    </tr>
  `).join("");
}

function renderPatientsTable(patients) {
  const tbody = document.getElementById("patientsTableBody");
  if (!tbody) return;
  const active = patients.filter(p => p.status === "Active" || !p.status);
  if (active.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #888;">No patients found.</td></tr>`;
    return;
  }
  tbody.innerHTML = active.map(p => `
    <tr>
      <td>${p.patient_id || "—"}</td>
      <td><strong>${p.full_name || "—"}</strong></td>
      <td>${p.age || "—"}</td>
      <td>${p.gender || "—"}</td>
      <td>${p.department || "—"}</td>
      <td>${p.ward || "—"}</td>
      <td>${p.bed_number || "—"}</td>
      <td>${p.assigned_doctor || "—"}</td>
      <td>
        <button onclick="dischargePatient('${p.patient_id}', '${p.bed_number}')" style="background: #d32f2f; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Discharge</button>
      </td>
    </tr>
  `).join("");
}

function renderBedsGrid(beds) {
  const grid = document.getElementById("bedDetailGrid") || document.getElementById("bedOverviewGrid");
  if (!grid) return;
  if (beds.length === 0) {
    grid.innerHTML = `<p style="color: #888;">No beds registered.</p>`;
    return;
  }
  grid.innerHTML = beds.map(b => `
    <div style="background: ${b.status === 'Available' ? '#e8f5e9' : '#ffebee'}; border: 1px solid ${b.status === 'Available' ? '#c8e6c9' : '#ffcdd2'}; padding: 15px; border-radius: 8px; text-align: center;">
      <h4>Bed: ${b.bed_number}</h4>
      <p style="margin: 5px 0; font-size: 0.9em; color: #555;">Ward: ${b.ward || '—'} | Dept: ${b.department || '—'}</p>
      <span style="font-weight: bold; color: ${b.status === 'Available' ? '#2e7d32' : '#c62828'};">${b.status}</span>
    </div>
  `).join("");
}

function renderStaffTable(staff) {
  const tbody = document.getElementById("staffTableBody");
  if (!tbody) return;
  if (staff.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">No staff found.</td></tr>`;
    return;
  }
  tbody.innerHTML = staff.map(s => `
    <tr>
      <td>${s.employee_id || "—"}</td>
      <td><strong>${s.full_name || "—"}</strong></td>
      <td>${s.role || "—"}</td>
      <td>${s.department || "—"}</td>
      <td><span style="color: green; font-weight: bold;">Active</span></td>
    </tr>
  `).join("");
  
}

// ======================================================================
// 6. FORM SUBMISSIONS (ADMIT, ADD NURSE, DOCTOR, BED, ASSIGN)
// ======================================================================

// Admit Patient
const savePatientBtn = document.getElementById("savePatientBtn");
if (savePatientBtn) {
  savePatientBtn.addEventListener("click", async () => {
    const patientId = document.getElementById("admitPatientId").value.trim();
    const fullName = document.getElementById("admitFullName").value.trim();
    const bedNumber = document.getElementById("admitBed").value;
    const errorEl = document.getElementById("admitError");

    if (!patientId || !fullName || !bedNumber) {
      if (errorEl) errorEl.textContent = "Please fill in Patient ID, Full Name, and select a Bed.";
      return;
    }

    const { error: patError } = await supabaseClient.from("patients").insert([{
      patient_id: patientId,
      full_name: fullName,
      age: parseInt(document.getElementById("admitAge").value) || null,
      gender: document.getElementById("admitGender").value,
      phone: document.getElementById("admitPhone").value.trim(),
      department: document.getElementById("admitDepartment").value,
      ward: document.getElementById("admitWard").value,
      bed_number: bedNumber,
      assigned_doctor: document.getElementById("admitDoctor").value,
      guardian_name: document.getElementById("admitGuardianName").value.trim(),
      guardian_phone: document.getElementById("admitGuardianPhone").value.trim(),
      admission_date: new Date().toISOString(),
      status: "Active"
    }]);

    if (patError) {
      if (errorEl) errorEl.textContent = "Error saving patient: " + patError.message;
      return;
    }

    await supabaseClient.from("beds").update({ status: "Occupied" }).eq("bed_number", bedNumber);
    alert("Patient admitted successfully!");
    window.closeModal("modalAdmit");
    loadAdminDashboard();
  });
}

// Add Nurse
const saveNurseBtn = document.getElementById("saveNurseBtn");
if (saveNurseBtn) {
  saveNurseBtn.addEventListener("click", async () => {
    const employeeId = document.getElementById("nurseEmployeeId").value.trim();
    const fullName = document.getElementById("nurseFullName").value.trim();
    const password = document.getElementById("nursePasswordInput").value.trim();
    const errorEl = document.getElementById("nurseError");

    if (!employeeId || !fullName || !password) {
      if (errorEl) errorEl.textContent = "Please provide Employee ID, Full Name, and Password.";
      return;
    }

    const { error } = await supabaseClient.from("staff").insert([{
      employee_id: employeeId,
      full_name: fullName,
      role: "Nurse",
      department: document.getElementById("nurseDepartment").value,
      phone: document.getElementById("nursePhone").value.trim(),
      password: password
    }]);

    if (error) {
      if (errorEl) errorEl.textContent = "Error adding nurse: " + error.message;
      return;
    }

    alert("Nurse added successfully!");
    window.closeModal("modalNurse");
    loadAdminDashboard();
  });
}

// Add Doctor
const saveDoctorBtn = document.getElementById("saveDoctorBtn");
if (saveDoctorBtn) {
  saveDoctorBtn.addEventListener("click", async () => {
    const employeeId = document.getElementById("doctorEmployeeId").value.trim();
    const fullName = document.getElementById("doctorFullName").value.trim();
    const password = document.getElementById("doctorPasswordInput").value.trim();
    const errorEl = document.getElementById("doctorError");

    if (!employeeId || !fullName || !password) {
      if (errorEl) errorEl.textContent = "Please provide Employee ID, Full Name, and Password.";
      return;
    }

    const { error } = await supabaseClient.from("staff").insert([{
      employee_id: employeeId,
      full_name: fullName,
      role: "Doctor",
      department: document.getElementById("doctorDepartment").value,
      phone: document.getElementById("doctorPhone").value.trim(),
      password: password
    }]);

    if (error) {
      if (errorEl) errorEl.textContent = "Error adding doctor: " + error.message;
      return;
    }

    alert("Doctor added successfully!");
    window.closeModal("modalDoctor");
    loadAdminDashboard();
  });
}

// Add Bed
const saveBedBtn = document.getElementById("saveBedBtn");
if (saveBedBtn) {
  saveBedBtn.addEventListener("click", async () => {
    const bedNumber = document.getElementById("bedNumber").value.trim();
    const errorEl = document.getElementById("bedError");

    if (!bedNumber) {
      if (errorEl) errorEl.textContent = "Please provide a bed number.";
      return;
    }

    const { error } = await supabaseClient.from("beds").insert([{
      bed_number: bedNumber,
      ward: document.getElementById("bedWard").value,
      department: document.getElementById("bedDepartment").value,
      status: "Available"
    }]);

    if (error) {
      if (errorEl) errorEl.textContent = "Error adding bed: " + error.message;
      return;
    }

    alert("Bed added successfully!");
    window.closeModal("modalBed");
    loadAdminDashboard();
  });
}

// Assign Patient Handler
const saveAssignmentBtn = document.getElementById("saveAssignmentBtn");
if (saveAssignmentBtn) {
  saveAssignmentBtn.addEventListener("click", async () => {
    const patientId = document.getElementById("assignPatient").value;
    const doctor = document.getElementById("assignDoctor").value;
    const newBedNumber = document.getElementById("assignBed").value;
    const errorEl = document.getElementById("assignError");

    if (!patientId) {
      if (errorEl) errorEl.textContent = "Please select a patient to assign.";
      return;
    }

    // 1. Fetch current patient info to get their OLD bed
    const { data: currentPatient } = await supabaseClient
      .from("patients")
      .select("bed_number")
      .eq("patient_id", patientId)
      .single();

    const oldBedNumber = currentPatient ? currentPatient.bed_number : null;

    const updatePayload = {};
    if (doctor) updatePayload.assigned_doctor = doctor;
    if (newBedNumber) updatePayload.bed_number = newBedNumber;

    // 2. Update Patient Record with new assignments
    const { error: patError } = await supabaseClient
      .from("patients")
      .update(updatePayload)
      .eq("patient_id", patientId);

    if (patError) {
      if (errorEl) errorEl.textContent = "Assignment error: " + patError.message;
      return;
    }

    // 3. Free up the OLD bed (if they are actually moving to a new bed)
    if (oldBedNumber && oldBedNumber !== newBedNumber && newBedNumber !== "") {
      await supabaseClient.from("beds").update({ status: "Available" }).eq("bed_number", oldBedNumber);
    }

    // 4. Mark the NEW bed as Occupied
    if (newBedNumber) {
      await supabaseClient.from("beds").update({ status: "Occupied" }).eq("bed_number", newBedNumber);
    }

    alert("Patient assigned successfully!");
    window.closeModal("modalAssign");
    loadAdminDashboard();
  });
}

// ======================================================================
// 7. DISCHARGE & PDF BILLING
// ======================================================================
window.dischargePatient = async function(patientId, bedNumber) {
  if (!confirm(`Are you sure you want to discharge patient ${patientId}?`)) return;

  const { error: patError } = await supabaseClient.from("patients").update({ status: "Discharged" }).eq("patient_id", patientId);

  if (patError) {
    alert("Failed to discharge patient: " + patError.message);
    return;
  }

  if (bedNumber && bedNumber !== "—") {
    await supabaseClient.from("beds").update({ status: "Available" }).eq("bed_number", bedNumber);
  }

  alert("Patient discharged and bed released successfully!");
  loadAdminDashboard();
};

function loadDischargedBills(patients) {
  const tableBody = document.getElementById("dischargedTableBody");
  const billPatSelect = document.getElementById("billPatientSelect");
  
  // Filter out only the discharged patients
  const discharged = patients.filter(p => p.status === "Discharged");

  // 1. UPDATE THE DROPDOWN LIST (This was missing!)
  if (billPatSelect) {
    billPatSelect.innerHTML = `<option value="">-- Choose Discharged Patient --</option>` + 
      discharged.map(p => `<option value="${p.patient_id}">${p.full_name} (${p.patient_id}) - ${p.department || 'General'}</option>`).join("");
  }

  // 2. UPDATE THE TABLE
  if (!tableBody) return;
  if (discharged.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #888;">No discharged patients found.</td></tr>`;
    return;
  }
  
  tableBody.innerHTML = discharged.map(p => `
    <tr>
      <td>${p.patient_id || "—"}</td>
      <td><strong>${p.full_name || "—"}</strong></td>
      <td>${p.department || "—"}</td>
      <td><span style="color: green; font-weight: bold;">Discharged</span></td>
      <td class="action-cell"></td>
    </tr>
  `).join("");
}

// Custom Bill Generator
const generateCustomBillBtn = document.getElementById("generateCustomBillBtn");
if (generateCustomBillBtn) {
  generateCustomBillBtn.addEventListener("click", async () => {
    const patientId = document.getElementById("billPatientSelect").value;
    const room = parseFloat(document.getElementById("billRoom").value) || 0;
    const consultation = parseFloat(document.getElementById("billConsultation").value) || 0;
    const pharmacy = parseFloat(document.getElementById("billPharmacy").value) || 0;

    if (!patientId) {
      alert("Please select a discharged patient from the dropdown.");
      return;
    }

    const { data: patient, error } = await supabaseClient.from("patients").select("*").eq("patient_id", patientId).single();

    if (error || !patient) {
      alert("Could not fetch patient details.");
      return;
    }

    // 1. Generate the PDF
    generateCustomPDF(patient, room, consultation, pharmacy);
    
    // 2. Mark as Billed so they disappear from the dropdown
    await supabaseClient.from("patients").update({ status: "Billed" }).eq("patient_id", patientId);
    
    // 3. Refresh the dashboard to clear the dropdown list
    setTimeout(() => { loadAdminDashboard(); }, 1000);
  });
}
// --- BILLING: GENERATE INVOICE & PRINT ---
// --- NEW: DYNAMIC BILLING & INVOICE GENERATOR ---
const btnGenerateBill = document.getElementById("generateCustomBillBtn");

if (btnGenerateBill) {
  btnGenerateBill.addEventListener("click", () => {
    // 1. Get the values from the form
    const patientSelect = document.getElementById("billPatientSelect");
    const patientName = patientSelect.options[patientSelect.selectedIndex]?.text || "Unknown Patient";
    const room = parseFloat(document.getElementById("billRoom").value) || 0;
    const consult = parseFloat(document.getElementById("billConsultation").value) || 0;
    const pharm = parseFloat(document.getElementById("billPharmacy").value) || 0;
    const total = room + consult + pharm;

    // 2. Inject values into the hidden print template
    document.getElementById("outPatientName").innerText = patientName.split(' - ')[0]; // Cleans up the name
    document.getElementById("outDate").innerText = new Date().toLocaleDateString();
    document.getElementById("outRoom").innerText = room.toFixed(2);
    document.getElementById("outConsult").innerText = consult.toFixed(2);
    document.getElementById("outPharm").innerText = pharm.toFixed(2);
    document.getElementById("outTotal").innerText = total.toFixed(2);

    // 3. Trigger the isolated print mode
    document.body.classList.add("print-bill-mode");
    const printContainer = document.getElementById("printBillContainer");
    printContainer.style.display = "block";

    window.print();

    // 4. Clean up after printing
    printContainer.style.display = "none";
    document.body.classList.remove("print-bill-mode");
  });
}

// ======================================================================
// 8. INITIALIZE ADMIN
// ======================================================================
loadAdminDashboard();