// Centralized API client for Medi Life HMS

const API_BASE = '/api';

export const api = {
  // Auth
  async login(userId, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async registerPatient(patientData) {
    const res = await fetch(`${API_BASE}/auth/register-patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async getDoctors() {
    const res = await fetch(`${API_BASE}/doctors`);
    if (!res.ok) throw new Error('Failed to fetch doctors');
    return res.json();
  },

  // Patient Portal
  async submitIntake(intakeData) {
    const res = await fetch(`${API_BASE}/patient/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intakeData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit intake');
    }
    return res.json();
  },

  async getPatientDashboard(patientId) {
    const res = await fetch(`${API_BASE}/patient/dashboard/${patientId}`);
    if (!res.ok) throw new Error('Failed to fetch patient dashboard');
    return res.json();
  },

  async payAndDischarge(admissionId, paymentMethod, extraOptions = {}) {
    const res = await fetch(`${API_BASE}/patient/pay-and-discharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        admission_id: admissionId, 
        payment_method: paymentMethod,
        ...extraOptions
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Discharge and payment failed');
    }
    return res.json();
  },

  async getGovCardBalance(patientId) {
    const res = await fetch(`${API_BASE}/patient/gov-card/${patientId}`);
    if (!res.ok) throw new Error('Failed to fetch gov card balance');
    return res.json();
  },

  // Management Portal
  async getPatientsQueue() {
    const res = await fetch(`${API_BASE}/management/patients-queue`);
    if (!res.ok) throw new Error('Failed to fetch patient queue');
    return res.json();
  },

  async getBeds() {
    const res = await fetch(`${API_BASE}/management/beds`);
    if (!res.ok) throw new Error('Failed to fetch beds matrix');
    return res.json();
  },

  async assignBed(admissionId, bedId, doctorName, customDailyRate) {
    const res = await fetch(`${API_BASE}/management/assign-bed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admission_id: admissionId,
        bed_id: bedId,
        doctor_name: doctorName,
        custom_daily_rate: customDailyRate
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to assign bed');
    }
    return res.json();
  },

  async assignDoctor(admissionId, doctorName) {
    const res = await fetch(`${API_BASE}/management/assign-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admission_id: admissionId,
        doctor_name: doctorName
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to assign doctor');
    }
    return res.json();
  },

  async addPrescriptions(admissionId, newMedicines, newTests) {
    const res = await fetch(`${API_BASE}/management/add-prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admission_id: admissionId,
        new_medicines: newMedicines,
        new_tests: newTests,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add prescriptions');
    }
    return res.json();
  },

  async getArchivedRecords() {
    const res = await fetch(`${API_BASE}/management/archived-records`);
    if (!res.ok) throw new Error('Failed to fetch permanent archived records');
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${API_BASE}/management/stats`);
    if (!res.ok) throw new Error('Failed to fetch hospital stats');
    return res.json();
  },

  async clearData() {
    const res = await fetch(`${API_BASE}/management/clear-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to clear data');
    return res.json();
  },

  getExcelExportUrl() {
    return `${API_BASE}/management/export-excel`;
  }
};
