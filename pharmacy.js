/**
 * pharmacy.js
 * ------------------------------------------------------------------
 * Pharmacy Portal: loads active prescriptions from Supabase and lets
 * a pharmacist mark them as dispensed.
 *
 * ASSUMED SCHEMA — adjust the table/column names below if yours differ:
 *
 *   prescriptions
 *     id              uuid/int, primary key
 *     patient_id      references patients(id)
 *     doctor_id       references staff(id)
 *     medication_name text
 *     dosage          text
 *     frequency       text
 *     status          text          -- 'active' | 'dispensed' | 'cancelled'
 *     created_at      timestamptz
 *     dispensed_at    timestamptz, nullable
 *
 *   patients ( id, full_name, ... )
 *   staff    ( id, full_name, role, ... )   -- doctors are staff with role = 'doctor'
 *
 * This uses Supabase's embedded-resource select to pull the patient's
 * and doctor's names via their foreign keys in a single query, so you
 * don't have to denormalize names onto the prescriptions table.
 *
 * If your prescriptions table stores patient_name / doctor_name
 * directly instead (no foreign keys), see the "FLAT SCHEMA" comment
 * inside loadActivePrescriptions() below — it's the only place you'd
 * need to change.
 *
 * Requires:
 *   - Supabase JS client loaded via CDN, already initialized
 *   - A <table> with <tbody id="prescriptionsBody"> in the page
 *     (see pharmacy-portal.html for the full markup + CSS)
 *
 * Usage:
 *   initPharmacyPortal(supabase, 'prescriptionsBody');
 * ------------------------------------------------------------------
 */

(function (global) {
  const TABLE = 'prescriptions';

  /**
   * Wire up event handling and load the pharmacy portal table.
   * @param {object} supabaseClient - an initialized Supabase client
   * @param {string} [tbodyId] - id of the <tbody> to render rows into
   */
  async function initPharmacyPortal(supabaseClient, tbodyId = 'prescriptionsBody') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) {
      console.error(`initPharmacyPortal: no <tbody> found with id "${tbodyId}"`);
      return;
    }
    if (!supabaseClient) {
      console.error('initPharmacyPortal: a Supabase client is required');
      renderMessageRow(tbody, 'Portal unavailable — check console for details.', 'error');
      return;
    }

    // One delegated listener handles every "Mark as Dispensed" click,
    // including rows rendered after this initial load.
    tbody.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="dispense"]');
      if (!btn) return;
      markAsDispensed(supabaseClient, btn);
    });

    await loadActivePrescriptions(supabaseClient, tbody);
  }

  /**
   * Fetch active prescriptions and render them into the table body.
   */
  async function loadActivePrescriptions(supabaseClient, tbody) {
    renderMessageRow(tbody, 'Loading active prescriptions…', 'loading');

    let rows;
    try {
      const { data, error } = await supabaseClient
        .from(TABLE)
        .select(`
          id,
          patient_id,
          medication_name,
          dosage,
          frequency,
          status,
          created_at,
          patient:patients!patient_id ( full_name ),
          doctor:staff!doctor_id ( full_name )
        `)
        // FLAT SCHEMA alternative — if patient_name / doctor_name are
        // plain columns on `prescriptions` instead of foreign keys,
        // swap the select() above for:
        //   .select('id, patient_id, patient_name, medication_name,
        //            dosage, frequency, status, created_at, doctor_name')
        // and in rowToHtml() below use row.patient_name / row.doctor_name
        // directly instead of row.patient?.full_name / row.doctor?.full_name.
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      rows = data;
    } catch (err) {
      console.error('loadActivePrescriptions: query failed', err);
      renderMessageRow(tbody, 'Could not load prescriptions. Please refresh to try again.', 'error');
      return;
    }

    if (!rows || rows.length === 0) {
      renderMessageRow(tbody, 'No active prescriptions right now.', 'empty');
      return;
    }

    tbody.innerHTML = rows.map(rowToHtml).join('');
  }

  function rowToHtml(row) {
    const patientName = row.patient?.full_name || '—';
    const doctorName = row.doctor?.full_name || '—';
    return `
      <tr data-id="${escapeHtml(row.id)}">
        <td>${escapeHtml(row.patient_id)}</td>
        <td>${escapeHtml(patientName)}</td>
        <td>${escapeHtml(row.medication_name)}</td>
        <td>${escapeHtml(row.dosage)}</td>
        <td>${escapeHtml(row.frequency)}</td>
        <td>${escapeHtml(doctorName)}</td>
        <td>
          <button type="button" class="dispense-btn" data-action="dispense" data-id="${escapeHtml(row.id)}">
            Mark as Dispensed
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * Handle a "Mark as Dispensed" click: update Supabase, then remove
   * the row from the active queue and show a success/error toast.
   */
  async function markAsDispensed(supabaseClient, btn) {
    const id = btn.dataset.id;
    const row = btn.closest('tr');
    const originalLabel = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Dispensing…';

    try {
      const { error } = await supabaseClient
        .from(TABLE)
        .update({ status: 'dispensed', dispensed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      const patientName = row?.children?.[1]?.textContent?.trim() || 'Patient';
      const medication = row?.children?.[2]?.textContent?.trim() || 'Medication';

      showToast(`✓ ${medication} marked as dispensed for ${patientName}`, 'success');
      fadeOutAndRemove(row);
    } catch (err) {
      console.error('markAsDispensed: update failed', err);
      btn.disabled = false;
      btn.textContent = originalLabel;
      showToast('Could not update this prescription. Please try again.', 'error');
    }
  }

  // ---- rendering helpers --------------------------------------------

  function renderMessageRow(tbody, message, kind) {
    tbody.innerHTML = `
      <tr class="state-row state-row--${kind}">
        <td colspan="7">${escapeHtml(message)}</td>
      </tr>
    `;
  }

  function fadeOutAndRemove(row) {
    if (!row) return;
    const tbody = row.closest('tbody');
    let removed = false;

    const remove = () => {
      if (removed) return;
      removed = true;
      row.remove();
      if (tbody && tbody.children.length === 0) {
        renderMessageRow(tbody, 'No active prescriptions right now.', 'empty');
      }
    };

    row.classList.add('row-dispensed');
    row.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 500); // fallback in case the CSS transition is missing
  }

  let toastTimer = null;
  function showToast(message, kind = 'success') {
    let toast = document.getElementById('pharmacyToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pharmacyToast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `pharmacy-toast pharmacy-toast--${kind} is-visible`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.initPharmacyPortal = initPharmacyPortal;
})(window);
