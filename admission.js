const SUPABASE_URL = "https://zuhlajnydnfdmaglrazb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z2LMztBgCqofPHxJ6bQ9wQ_IKcdtM2F";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const admissionForm = document.getElementById("admissionForm");
const admissionFormSection = document.getElementById("admissionFormSection");
const successSection = document.getElementById("successSection");
const generatedPatientId = document.getElementById("generatedPatientId");
const submitButton = document.getElementById("submitAdmissionBtn");
const admissionDateInput = document.getElementById("admissionDate");

admissionDateInput.value = new Date().toISOString().split("T")[0];

function createPatientId() {
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `CB-${year}-${randomNumber}`;
}

admissionForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!admissionForm.checkValidity()) {
    admissionForm.reportValidity();
    return;
  }

  const patientId = createPatientId();

  const patientRecord = {
    patient_id: patientId,
    full_name: document.getElementById("fullName").value.trim(),
    date_of_birth: document.getElementById("dob").value,
    age: Number(document.getElementById("age").value),
    gender: document.getElementById("gender").value,
    blood_group: document.getElementById("bloodGroup").value,
    phone: document.getElementById("phoneNumber").value.trim(),
    address: document.getElementById("address").value.trim(),
    department: document.getElementById("department").value,
    ward: document.getElementById("ward").value.trim(),
    bed_number: document.getElementById("bedNumber").value.trim(),
    admission_type: document.getElementById("admissionType").value,
    admission_date: document.getElementById("admissionDate").value,
    assigned_doctor: document.getElementById("assignedDoctor").value,
    complaint: document.getElementById("complaint").value.trim(),
    guardian_name: document.getElementById("guardianName").value.trim(),
    relationship: document.getElementById("relationship").value,
    guardian_phone: document.getElementById("guardianPhone").value.trim()
  };

  submitButton.disabled = true;
  submitButton.textContent = "Saving patient...";

  const { error } = await supabaseClient
    .from("patients")
    .insert([patientRecord]);

  if (error) {
    console.error(error);
    alert(`The patient could not be saved: ${error.message}`);

    submitButton.disabled = false;
    submitButton.textContent = "Admit Patient";
    return;
  }

  generatedPatientId.textContent = patientId;
  admissionFormSection.hidden = true;
  successSection.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
});