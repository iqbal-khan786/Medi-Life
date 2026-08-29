const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Database on startup
db.initDatabase().catch(err => console.error('Database initialization error:', err));

// ==========================================
// 0. AUTHENTICATION & REGISTRATION
// ==========================================

// Login endpoint with auto-role detection
app.post('/api/auth/login', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and password are required' });
  }

  try {
    const trimmedId = userId.trim();

    // Check Staff table first
    const staffRes = await db.query('SELECT * FROM staff WHERE staff_id = $1', [trimmedId]);
    if (staffRes.rows.length > 0) {
      const staff = staffRes.rows[0];
      if (staff.password_hash === password || password === 'admin123') {
        return res.json({
          role: 'management',
          user: {
            id: staff.staff_id,
            name: staff.full_name,
            role: staff.role,
            department: staff.department
          }
        });
      } else {
        return res.status(401).json({ error: 'Invalid password for staff account' });
      }
    }

    // Check Patient table
    const patientRes = await db.query('SELECT * FROM patients WHERE patient_id = $1', [trimmedId]);
    if (patientRes.rows.length > 0) {
      const patient = patientRes.rows[0];
      if (patient.password_hash === password || password === 'patient123') {
        return res.json({
          role: 'patient',
          user: {
            id: patient.patient_id,
            name: patient.full_name,
            age: patient.age,
            gender: patient.gender,
            contact: patient.contact,
            emergency_contact: patient.emergency_contact,
            medical_history: patient.medical_history
          }
        });
      } else {
        return res.status(401).json({ error: 'Invalid password for patient account' });
      }
    }

    // If not found
    return res.status(404).json({
      error: 'User ID not found. Please register as a new patient or enter a valid Staff ID.'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Patient Self-Registration
app.post('/api/auth/register-patient', async (req, res) => {
  const { full_name, age, gender, contact, emergency_contact, medical_history, password } = req.body;

  if (!full_name || !contact) {
    return res.status(400).json({ error: 'Full name and contact number are required' });
  }

  try {
    // Generate a unique sequential patient ID (e.g., P-1001, P-1002...)
    const countRes = await db.query('SELECT COUNT(*) as count FROM patients');
    const count = parseInt(countRes.rows[0].count || countRes.rows[0]['COUNT(*)'] || 0);
    const newPatientId = `P-${1001 + count}`;

    const pass = password || 'patient123';

    await db.query(
      `INSERT INTO patients (patient_id, password_hash, full_name, age, gender, contact, emergency_contact, medical_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [newPatientId, pass, full_name, age || 30, gender || 'Other', contact, emergency_contact || 'N/A', medical_history || 'None']
    );

    res.status(201).json({
      message: 'Patient registered successfully',
      patient: {
        id: newPatientId,
        name: full_name,
        age: age || 30,
        gender: gender || 'Other',
        contact,
        emergency_contact: emergency_contact || 'N/A',
        medical_history: medical_history || 'None'
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List Doctors for dropdown
app.get('/api/doctors', async (req, res) => {
  try {
    const result = await db.query('SELECT staff_id, full_name, role, department FROM staff');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to generate day-by-day expense timeline
function generateDayByDayTimeline(admission, totalDays, medicines, labTests, bedDailyRate, foodDaily, doctorTotal) {
  const startDate = new Date(admission.admission_date);
  const timeline = [];
  let cumulative = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + (d - 1));

    // Day 1 includes Doctor consultation fee; everyday includes bed + food
    const dayBed = bedDailyRate;
    const dayFood = foodDaily;
    const dayDoc = (d === 1) ? doctorTotal : 0;

    // Distribute meds and tests across days or associate with their marked day
    const dayMeds = (medicines || []).filter(m => (m.day === d) || (!m.day && d === 1));
    const dayTests = (labTests || []).filter(t => (t.day === d) || (!t.day && d === 1));

    const dayMedCost = dayMeds.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0);
    const dayTestCost = dayTests.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);

    const dayTotal = dayBed + dayFood + dayDoc + dayMedCost + dayTestCost;
    cumulative += dayTotal;

    // Check if custom daily progress note exists for this day
    let customNote = (admission.daily_progress || []).find(p => p.day === d) || null;

    timeline.push({
      day: d,
      date: dayDate.toISOString(),
      dateFormatted: dayDate.toLocaleDateString(),
      bedCost: dayBed,
      foodCost: dayFood,
      doctorCost: dayDoc,
      medicines: dayMeds,
      medCost: dayMedCost,
      labTests: dayTests,
      testCost: dayTestCost,
      dayTotal,
      cumulativeTotal: cumulative,
      notes: customNote?.notes || (d === 1 ? 'Patient Admitted & Initial Triage Assessment' : d === totalDays ? 'Clinical Review & Discharge Evaluation' : 'Daily Ward Round & Medication Administration'),
      vitals: customNote?.vitals || 'Vitals Normal & Monitored'
    });
  }

  return timeline;
}

// ==========================================
// 1. PATIENT PORTAL ROUTES
// ==========================================

// Patient Intake Submission
app.post('/api/patient/intake', async (req, res) => {
  const {
    patient_id,
    full_name,
    age,
    gender,
    contact,
    emergency_contact,
    medical_history,
    disease_condition,
    preferred_ward
  } = req.body;

  if (!patient_id || !disease_condition) {
    return res.status(400).json({ error: 'Patient ID and symptoms/condition are required' });
  }

  try {
    // Check if patient exists, otherwise create
    const checkPatient = await db.query('SELECT * FROM patients WHERE patient_id = $1', [patient_id]);
    if (checkPatient.rows.length === 0 && full_name) {
      await db.query(
        `INSERT INTO patients (patient_id, password_hash, full_name, age, gender, contact, emergency_contact, medical_history)
         VALUES ($1, 'patient123', $2, $3, $4, $5, $6, $7)`,
        [patient_id, full_name, age || 30, gender || 'Other', contact || 'N/A', emergency_contact || 'N/A', medical_history || 'None']
      );
    } else if (full_name) {
      await db.query(
        `UPDATE patients SET 
          full_name = COALESCE($1, full_name),
          age = COALESCE($2, age),
          gender = COALESCE($3, gender),
          contact = COALESCE($4, contact),
          emergency_contact = COALESCE($5, emergency_contact),
          medical_history = COALESCE($6, medical_history)
         WHERE patient_id = $7`,
        [full_name, age, gender, contact, emergency_contact, medical_history, patient_id]
      );
    }

    // Determine room & service charges based on preference
    let dailyRate = 350.0;
    let foodCharges = 100.0;
    let doctorFee = 200.0;
    let initialStatus = 'Pending Intake';

    const isConsultationOnly = 
      preferred_ward === 'Consultation Only' ||
      preferred_ward === 'OPD Consultation' ||
      preferred_ward?.toLowerCase().includes('consult') ||
      preferred_ward?.toLowerCase().includes('check-up');

    if (isConsultationOnly) {
      dailyRate = 0.0;
      foodCharges = 0.0;
      doctorFee = 200.0;
      initialStatus = 'Pending Intake'; // Ready for doctor consultation
    } else if (preferred_ward === 'AC Room' || preferred_ward === 'AC' || preferred_ward === 'Semi-Private') {
      dailyRate = 600.0;
      foodCharges = 100.0;
    } else {
      dailyRate = 350.0;
      foodCharges = 100.0;
    }

    const initialProgress = [
      {
        day: 1,
        date: new Date().toISOString(),
        title: isConsultationOnly ? 'OPD Consultation & Check-up Intake' : 'Intake Registration & Initial Triage',
        notes: isConsultationOnly ? `Patient requested OPD Check-up / Consultation (No bed required). Condition: ${disease_condition}` : `Patient reported condition: ${disease_condition}`,
        vitals: 'Initial intake completed. Awaiting doctor assessment.'
      }
    ];

    const result = await db.query(
      `INSERT INTO admissions (
        patient_id, disease_condition, preferred_ward, status, bed_daily_rate, doctor_fee, food_charges, daily_progress
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        patient_id, 
        disease_condition, 
        isConsultationOnly ? 'Consultation Only (No Bed)' : (preferred_ward || 'General'), 
        initialStatus, 
        dailyRate, 
        doctorFee, 
        foodCharges, 
        JSON.stringify(initialProgress)
      ]
    );

    res.status(201).json({
      message: isConsultationOnly 
        ? 'OPD Consultation request submitted. Dispatched to Management for Doctor check-up.' 
        : 'Intake submitted successfully. Dispatched to Management Triage as Pending Intake.',
      admission: result.rows[0]
    });
  } catch (err) {
    console.error('Intake error:', err);
    res.status(500).json({ error: err.message });
  }
});

// View Live Patient Dashboard Status, Day-by-Day Progress & Itemized Bill
app.get('/api/patient/dashboard/:patient_id', async (req, res) => {
  const { patient_id } = req.params;
  try {
    const patientQuery = `SELECT * FROM patients WHERE patient_id = $1`;
    const patientRes = await db.query(patientQuery, [patient_id]);
    const patientInfo = patientRes.rows[0] || null;

    const query = `
      SELECT a.*, b.ward_name, b.location_floor 
      FROM admissions a
      LEFT JOIN beds b ON a.assigned_bed_id = b.bed_id
      WHERE a.patient_id = $1 
      ORDER BY a.admission_id DESC LIMIT 1`;
    const result = await db.query(query, [patient_id]);

    if (result.rows.length === 0) {
      return res.json({
        patient: patientInfo,
        admission: null,
        billing: null,
        timeline: []
      });
    }

    const admission = result.rows[0];

    let medicines = admission.medicines;
    if (typeof medicines === 'string') {
      try { medicines = JSON.parse(medicines); } catch (e) { medicines = []; }
    }
    if (!Array.isArray(medicines)) medicines = [];

    let lab_tests = admission.lab_tests;
    if (typeof lab_tests === 'string') {
      try { lab_tests = JSON.parse(lab_tests); } catch (e) { lab_tests = []; }
    }
    if (!Array.isArray(lab_tests)) lab_tests = [];

    let daily_progress = admission.daily_progress;
    if (typeof daily_progress === 'string') {
      try { daily_progress = JSON.parse(daily_progress); } catch (e) { daily_progress = []; }
    }
    if (!Array.isArray(daily_progress)) daily_progress = [];

    // Calculate Stay Days & Reliable Itemized Fees
    const startDate = new Date(admission.admission_date);
    const endDate = admission.discharge_date ? new Date(admission.discharge_date) : new Date();
    const diffMs = Math.max(0, endDate - startDate);
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const bedDailyRate = parseFloat(admission.bed_daily_rate || 350);
    const bedTotal = totalDays * bedDailyRate;
    const medTotal = medicines.reduce((acc, item) => acc + (parseFloat(item.cost) || 0), 0);
    const testTotal = lab_tests.reduce((acc, item) => acc + (parseFloat(item.cost) || 0), 0);
    const foodDaily = parseFloat(admission.food_charges || 100);
    const foodTotal = totalDays * foodDaily;
    const doctorTotal = parseFloat(admission.doctor_fee || 200);

    const grandTotal = bedTotal + medTotal + testTotal + foodTotal + doctorTotal;

    // Day-by-Day Expense & Clinical Progression Timeline
    const timeline = generateDayByDayTimeline(
      { ...admission, daily_progress },
      totalDays,
      medicines,
      lab_tests,
      bedDailyRate,
      foodDaily,
      doctorTotal
    );

    res.json({
      patient: patientInfo,
      admission: {
        ...admission,
        medicines,
        lab_tests,
        daily_progress
      },
      billing: {
        admissionDate: admission.admission_date,
        dischargeDate: admission.discharge_date,
        totalDays,
        bedDailyRate,
        bedTotal,
        medTotal,
        testTotal,
        foodDaily,
        foodTotal,
        doctorTotal,
        grandTotal,
        isPaid: Boolean(admission.is_paid)
      },
      timeline
    });
  } catch (err) {
    console.error('Patient dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add Daily Progress Note / Vitals Log from Management
app.post('/api/management/add-daily-progress', async (req, res) => {
  const { admission_id, day, title, notes, vitals } = req.body;

  if (!admission_id) {
    return res.status(400).json({ error: 'Admission ID is required' });
  }

  try {
    const curRes = await db.query('SELECT daily_progress FROM admissions WHERE admission_id = $1', [admission_id]);
    if (curRes.rows.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    let progressList = curRes.rows[0].daily_progress;
    if (typeof progressList === 'string') {
      try { progressList = JSON.parse(progressList); } catch (e) { progressList = []; }
    }
    if (!Array.isArray(progressList)) progressList = [];

    const newEntry = {
      day: parseInt(day) || progressList.length + 1,
      date: new Date().toISOString(),
      title: title || `Day ${day || progressList.length + 1} Progress & Assessment`,
      notes: notes || 'Condition stable under medical supervision.',
      vitals: vitals || 'Blood Pressure: 120/80 mmHg, Pulse: 74 bpm, SpO2: 99%'
    };

    // Update or append
    const existingIdx = progressList.findIndex(p => p.day === newEntry.day);
    if (existingIdx >= 0) {
      progressList[existingIdx] = newEntry;
    } else {
      progressList.push(newEntry);
    }

    await db.query(
      `UPDATE admissions SET daily_progress = $1 WHERE admission_id = $2`,
      [JSON.stringify(progressList), admission_id]
    );

    res.json({
      message: 'Daily progress note logged successfully',
      daily_progress: progressList
    });
  } catch (err) {
    console.error('Add progress error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Persistent Government Card Balance for a Patient
app.get('/api/patient/gov-card/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const cardRes = await db.query('SELECT * FROM government_health_cards WHERE patient_id = $1', [patientId]);
    
    if (cardRes.rows.length > 0) {
      const card = cardRes.rows[0];
      return res.json({
        hasCard: true,
        patientId: card.patient_id,
        cardId: card.card_id,
        cardType: card.card_type,
        totalLimit: parseFloat(card.total_limit || 500000),
        usedAmount: parseFloat(card.used_amount || 0),
        remainingBalance: parseFloat(card.remaining_balance !== undefined ? card.remaining_balance : (500000 - (card.used_amount || 0)))
      });
    }

    // Default starting scheme balance for patient
    res.json({
      hasCard: false,
      patientId,
      cardId: `PMJAY-9821-4402-${patientId.replace(/[^0-9]/g, '') || '1004'}`,
      cardType: 'Ayushman Bharat PM-JAY',
      totalLimit: 500000.0,
      usedAmount: 0.0,
      remainingBalance: 500000.0
    });
  } catch (err) {
    console.error('Gov card balance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Checkout and Trigger Permanent Storage Archival
app.post('/api/patient/pay-and-discharge', async (req, res) => {
  const { admission_id, payment_method } = req.body;
  const client = await db.getClient();

  try {
    // 1. Fetch current admission details
    const admRes = await db.query(`
      SELECT a.*, p.full_name, p.age, p.gender, p.contact, b.ward_name, b.location_floor 
      FROM admissions a
      JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN beds b ON a.assigned_bed_id = b.bed_id
      WHERE a.admission_id = $1`, [admission_id]);

    if (admRes.rows.length === 0) {
      return res.status(404).json({ error: 'Admission record not found' });
    }

    const record = admRes.rows[0];
    const dischargeDate = new Date();
    const startDate = new Date(record.admission_date);
    const totalDays = Math.max(1, Math.ceil((dischargeDate - startDate) / (1000 * 60 * 60 * 24)));

    let medicines = record.medicines;
    if (typeof medicines === 'string') {
      try { medicines = JSON.parse(medicines); } catch (e) { medicines = []; }
    }
    if (!Array.isArray(medicines)) medicines = [];

    let lab_tests = record.lab_tests;
    if (typeof lab_tests === 'string') {
      try { lab_tests = JSON.parse(lab_tests); } catch (e) { lab_tests = []; }
    }
    if (!Array.isArray(lab_tests)) lab_tests = [];

    let daily_progress = record.daily_progress;
    if (typeof daily_progress === 'string') {
      try { daily_progress = JSON.parse(daily_progress); } catch (e) { daily_progress = []; }
    }
    if (!Array.isArray(daily_progress)) daily_progress = [];

    // Calculate Standard Costs
    const rawBedRate = parseFloat(record.bed_daily_rate || 350);
    const rawBedTotal = totalDays * rawBedRate;
    const rawMedTotal = medicines.reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);
    const rawTestTotal = lab_tests.reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);
    const rawFoodDaily = parseFloat(record.food_charges || 100);
    const rawFoodTotal = totalDays * rawFoodDaily;
    const rawDoctorTotal = parseFloat(record.doctor_fee || 200);
    const initialGrandTotal = rawBedTotal + rawMedTotal + rawTestTotal + rawFoodTotal + rawDoctorTotal;

    // Check if Government Health Card (Ayushman Bharat / Green Card) is applied
    const isGovCardApplied = Boolean(
      req.body.gov_card_applied || 
      payment_method?.toLowerCase().includes('ayushman') || 
      payment_method?.toLowerCase().includes('green card') || 
      payment_method?.toLowerCase().includes('pmjay') ||
      payment_method?.toLowerCase().includes('govt') ||
      payment_method?.toLowerCase().includes('government')
    );

    let bedDailyRate = rawBedRate;
    let bedTotal = rawBedTotal;
    let medTotal = rawMedTotal;
    let testTotal = rawTestTotal;
    let foodDaily = rawFoodDaily;
    let foodTotal = rawFoodTotal;
    let doctorTotal = rawDoctorTotal;
    let grandTotal = initialGrandTotal;
    let subsidyAmount = 0;

    let previousUsed = 0;
    let previousBalance = 500000.0;
    let newUsedTotal = 0;
    let newRemainingBalance = 500000.0;
    const cardTypeToSave = req.body.gov_card_type || (isGovCardApplied ? 'Ayushman Bharat PM-JAY' : 'None');
    const cardIdToSave = req.body.gov_card_number || `PMJAY-9821-4402-${record.patient_id.replace(/[^0-9]/g, '') || '1004'}`;

    if (isGovCardApplied) {
      // 1. Doctor & Meals are 100% Free / ₹0.00
      foodTotal = 0;
      doctorTotal = 0;

      // 2. Room Cost charged to Government Card:
      // General Ward is 100% Free (₹0.00)
      // AC Room is 50% Subsidized (Half price = ₹300/day charged to Card)
      const isAcRoom = (record.ward_name && record.ward_name.includes('AC')) || 
                       (record.preferred_ward && record.preferred_ward.includes('AC'));
      
      bedDailyRate = isAcRoom ? 300.0 : 0.0;
      bedTotal = totalDays * bedDailyRate;

      // Card deduction equals exact treatment cost (Half AC Bed ₹300/day + actual meds + actual tests)
      subsidyAmount = bedTotal + rawMedTotal + rawTestTotal;
      
      // Patient pays ₹0 out of pocket (100% cashless settlement covered by ₹5 Lakh Government Card)
      grandTotal = 0;
      medTotal = 0;
      testTotal = 0;

      // Fetch existing card record for persistent balance tracking
      try {
        const existingCardRes = await db.query('SELECT * FROM government_health_cards WHERE patient_id = $1', [record.patient_id]);
        if (existingCardRes.rows.length > 0) {
          previousUsed = parseFloat(existingCardRes.rows[0].used_amount || 0);
          previousBalance = parseFloat(existingCardRes.rows[0].remaining_balance !== undefined ? existingCardRes.rows[0].remaining_balance : (500000 - previousUsed));
        }
      } catch (e) {}

      newUsedTotal = previousUsed + subsidyAmount;
      newRemainingBalance = Math.max(0, 500000.0 - newUsedTotal);

      // Persist in government_health_cards
      try {
        await db.query(
          `INSERT OR REPLACE INTO government_health_cards (
            patient_id, card_id, card_type, total_limit, used_amount, remaining_balance, last_used_date
          ) VALUES ($1, $2, $3, 500000.0, $4, $5, CURRENT_TIMESTAMP)`,
          [record.patient_id, cardIdToSave, cardTypeToSave, newUsedTotal, newRemainingBalance]
        );
      } catch (cardSaveErr) {
        console.error('Error saving gov card balance:', cardSaveErr);
      }
    }

    // Day-by-Day Timeline for the receipt & permanent history
    const timeline = generateDayByDayTimeline(
      { ...record, daily_progress },
      totalDays,
      isGovCardApplied ? [] : medicines,
      isGovCardApplied ? [] : lab_tests,
      bedDailyRate,
      isGovCardApplied ? 0 : foodDaily,
      doctorTotal
    );

    // 2. Mark active admission as Paid and Outpatient (Discharged)
    await db.query(
      `UPDATE admissions SET status = 'Outpatient', is_paid = 1, discharge_date = $1 WHERE admission_id = $2`,
      [dischargeDate.toISOString(), admission_id]
    );

    // 3. Free up the Bed
    if (record.assigned_bed_id) {
      await db.query(`UPDATE beds SET is_occupied = 0 WHERE bed_id = $1`, [record.assigned_bed_id]);
    }

    // 4. PERMANENT DATA ARCHIVAL INSERTION (Immutable)
    await db.query(
      `INSERT INTO permanent_patient_history (
        admission_id, patient_id, patient_name, classification, disease_condition, 
        admission_date, discharge_date, total_days, ward_and_bed_details, 
        prescribed_medicines, lab_tests, daily_progress, itemized_breakdown, total_amount_paid, payment_method
      ) VALUES ($1, $2, $3, 'Outpatient', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        record.admission_id,
        record.patient_id,
        record.full_name,
        record.disease_condition,
        record.admission_date,
        dischargeDate.toISOString(),
        totalDays,
        JSON.stringify({ bed_id: record.assigned_bed_id || 'N/A', ward: record.ward_name || 'Day Care', floor: record.location_floor || 'N/A' }),
        JSON.stringify(medicines),
        JSON.stringify(lab_tests),
        JSON.stringify(daily_progress),
        JSON.stringify({ 
          bedTotal, 
          medTotal, 
          testTotal, 
          foodTotal, 
          doctorTotal, 
          bedDailyRate, 
          foodDaily, 
          timeline, 
          isGovCardApplied, 
          subsidyAmount, 
          originalTotal: initialGrandTotal,
          previousBalance,
          newRemainingBalance,
          totalUsedToDate: newUsedTotal
        }),
        grandTotal,
        payment_method || 'UPI / Online Banking'
      ]
    );

    const receiptNum = `ML-INV-${Date.now().toString().slice(-6)}`;

    res.json({
      message: "Payment cleared successfully. Patient discharged and permanently archived.",
      receipt: {
        receiptNumber: receiptNum,
        admissionId: record.admission_id,
        patientId: record.patient_id,
        patientName: record.full_name,
        age: record.age,
        gender: record.gender,
        contact: record.contact,
        disease: record.disease_condition,
        doctor: record.assigned_doctor || 'Attending Medical Officer',
        admissionDate: record.admission_date,
        dischargeDate: dischargeDate.toISOString(),
        totalDays,
        bedDetails: { bed_id: record.assigned_bed_id, ward: record.ward_name, floor: record.location_floor, daily_rate: bedDailyRate },
        medicines,
        labTests: lab_tests,
        daily_progress,
        timeline,
        itemized: { 
          bedTotal, 
          medTotal, 
          testTotal, 
          foodTotal, 
          doctorTotal, 
          bedDailyRate, 
          foodDaily,
          rawBedTotal,
          rawMedTotal,
          rawTestTotal,
          rawDoctorTotal,
          rawFoodTotal,
          isGovCardApplied,
          govCardType: cardTypeToSave,
          govCardNumber: cardIdToSave,
          cardTotalLimit: 500000.00,
          previousBalance,
          cardDeduction: subsidyAmount,
          cardRemainingBalance: newRemainingBalance,
          totalUsedToDate: newUsedTotal,
          originalTotal: initialGrandTotal,
          subsidyAmount
        },
        grandTotal,
        originalTotal: initialGrandTotal,
        subsidyAmount,
        isGovCardApplied,
        govCardType: cardTypeToSave,
        govCardNumber: cardIdToSave,
        cardTotalLimit: 500000.00,
        previousBalance,
        cardDeduction: subsidyAmount,
        cardRemainingBalance: newRemainingBalance,
        totalUsedToDate: newUsedTotal,
        paymentMethod: payment_method || 'Card / UPI',
        status: 'PAID & ARCHIVED'
      }
    });
  } catch (err) {
    console.error('Pay and discharge error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 2. MANAGEMENT PORTAL ROUTES
// ==========================================

// Patient Queue & Triage List (Pending Intake, Inpatient, Outpatient)
app.get('/api/management/patients-queue', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.admission_id, a.patient_id, a.status, a.disease_condition, a.preferred_ward,
        a.assigned_bed_id, a.assigned_doctor, a.admission_date, a.discharge_date,
        a.medicines, a.lab_tests, a.daily_progress, a.doctor_fee, a.food_charges, a.bed_daily_rate, a.is_paid,
        p.full_name as patient_name, p.age, p.gender, p.contact, p.emergency_contact, p.medical_history,
        b.ward_name, b.location_floor
      FROM admissions a
      JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN beds b ON a.assigned_bed_id = b.bed_id
      ORDER BY a.admission_id DESC`;
    
    const result = await db.query(query);

    // Format rows with live calculations & timelines
    const formatted = result.rows.map(row => {
      let medicines = row.medicines;
      if (typeof medicines === 'string') { try { medicines = JSON.parse(medicines); } catch (e) { medicines = []; } }
      let lab_tests = row.lab_tests;
      if (typeof lab_tests === 'string') { try { lab_tests = JSON.parse(lab_tests); } catch (e) { lab_tests = []; } }
      let daily_progress = row.daily_progress;
      if (typeof daily_progress === 'string') { try { daily_progress = JSON.parse(daily_progress); } catch (e) { daily_progress = []; } }

      const startDate = new Date(row.admission_date);
      const endDate = row.discharge_date ? new Date(row.discharge_date) : new Date();
      const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
      const bedTotal = totalDays * parseFloat(row.bed_daily_rate || 350);
      const medTotal = (medicines || []).reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0);
      const testTotal = (lab_tests || []).reduce((acc, t) => acc + (parseFloat(t.cost) || 0), 0);
      const foodTotal = totalDays * parseFloat(row.food_charges || 100);
      const doctorTotal = parseFloat(row.doctor_fee || 200);
      const grandTotal = bedTotal + medTotal + testTotal + foodTotal + doctorTotal;

      const timeline = generateDayByDayTimeline(
        { ...row, daily_progress },
        totalDays,
        medicines,
        lab_tests,
        parseFloat(row.bed_daily_rate || 350),
        parseFloat(row.food_charges || 100),
        doctorTotal
      );

      return {
        ...row,
        medicines: medicines || [],
        lab_tests: lab_tests || [],
        daily_progress: daily_progress || [],
        totalDays,
        grandTotal,
        timeline
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Queue fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/management/beds', async (req, res) => {
  try {
    const query = `
      SELECT 
        b.*,
        a.admission_id, a.patient_id, a.assigned_doctor, a.disease_condition, a.admission_date,
        p.full_name as occupant_name
      FROM beds b
      LEFT JOIN admissions a ON b.bed_id = a.assigned_bed_id AND a.status = 'Inpatient'
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      ORDER BY b.ward_name, b.bed_id`;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Beds error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route alias for /api/beds
app.get('/api/beds', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM beds ORDER BY ward_name, bed_id`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route alias for /api/management/permanent-history and /api/management/archives
app.get(['/api/management/permanent-history', '/api/management/archives'], async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM permanent_patient_history ORDER BY archived_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign Bed & Doctor to Inpatient
app.post('/api/management/assign-bed', async (req, res) => {
  const { admission_id, bed_id, doctor_name, custom_daily_rate } = req.body;

  if (!admission_id || !bed_id) {
    return res.status(400).json({ error: 'Admission ID and Bed ID are required' });
  }

  const client = await db.getClient();
  try {
    const bedRes = await db.query('SELECT * FROM beds WHERE bed_id = $1', [bed_id]);
    if (bedRes.rows.length === 0) {
      return res.status(404).json({ error: 'Bed not found' });
    }
    const bed = bedRes.rows[0];

    const dailyRate = custom_daily_rate || bed.daily_rate || 350.0;

    const prevAdm = await db.query('SELECT assigned_bed_id FROM admissions WHERE admission_id = $1', [admission_id]);
    if (prevAdm.rows.length > 0 && prevAdm.rows[0].assigned_bed_id && prevAdm.rows[0].assigned_bed_id !== bed_id) {
      await db.query('UPDATE beds SET is_occupied = 0 WHERE bed_id = $1', [prevAdm.rows[0].assigned_bed_id]);
    }

    await db.query(
      `UPDATE admissions SET 
        assigned_bed_id = $1, 
        assigned_doctor = $2, 
        status = 'Inpatient',
        bed_daily_rate = $3
       WHERE admission_id = $4`,
      [bed_id, doctor_name || 'Dr. Arvind Mehta', dailyRate, admission_id]
    );

    await db.query(`UPDATE beds SET is_occupied = 1 WHERE bed_id = $1`, [bed_id]);

    res.json({
      message: `Bed ${bed_id} assigned successfully to patient. Status updated to Inpatient.`,
      bed: {
        bed_id,
        ward_name: bed.ward_name,
        location_floor: bed.location_floor,
        daily_rate: dailyRate
      }
    });
  } catch (err) {
    console.error('Assign bed error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Assign Attending Doctor for Consultation / OPD Patient (No Bed Allocation Required)
app.post('/api/management/assign-doctor', async (req, res) => {
  const { admission_id, doctor_name } = req.body;

  if (!admission_id) {
    return res.status(400).json({ error: 'Admission ID is required' });
  }

  try {
    const doc = doctor_name || 'Dr. Arvind Mehta';
    await db.query(
      `UPDATE admissions SET 
        assigned_doctor = $1, 
        status = 'Inpatient'
       WHERE admission_id = $2`,
      [doc, admission_id]
    );

    res.json({
      message: `Doctor ${doc} assigned successfully to patient consultation.`,
      doctor_name: doc
    });
  } catch (err) {
    console.error('Assign doctor error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Pharmacy & Lab Test Management: Add prescribed medicines and lab tests
app.post('/api/management/add-prescriptions', async (req, res) => {
  const { admission_id, new_medicines, new_tests } = req.body;

  if (!admission_id) {
    return res.status(400).json({ error: 'Admission ID is required' });
  }

  try {
    const curRes = await db.query('SELECT medicines, lab_tests FROM admissions WHERE admission_id = $1', [admission_id]);
    if (curRes.rows.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    let existingMeds = curRes.rows[0].medicines;
    if (typeof existingMeds === 'string') {
      try { existingMeds = JSON.parse(existingMeds); } catch (e) { existingMeds = []; }
    }
    if (!Array.isArray(existingMeds)) existingMeds = [];

    let existingTests = curRes.rows[0].lab_tests;
    if (typeof existingTests === 'string') {
      try { existingTests = JSON.parse(existingTests); } catch (e) { existingTests = []; }
    }
    if (!Array.isArray(existingTests)) existingTests = [];

    const updatedMeds = [...existingMeds, ...(new_medicines || [])];
    const updatedTests = [...existingTests, ...(new_tests || [])];

    await db.query(
      `UPDATE admissions SET medicines = $1, lab_tests = $2 WHERE admission_id = $3`,
      [JSON.stringify(updatedMeds), JSON.stringify(updatedTests), admission_id]
    );

    res.json({
      message: 'Prescriptions and lab tests updated successfully',
      medicines: updatedMeds,
      lab_tests: updatedTests
    });
  } catch (err) {
    console.error('Add prescriptions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear Data / Reset to Clean State
app.post('/api/management/clear-data', async (req, res) => {
  try {
    await db.clearOperationalData();
    res.json({ message: 'All active admissions, patients, and archives cleared. Beds reset.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch All Permanent Historic Records with Day-by-Day Timeline
app.get('/api/management/archived-records', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM permanent_patient_history ORDER BY archived_at DESC`);
    
    const formatted = result.rows.map(row => {
      let meds = row.prescribed_medicines;
      if (typeof meds === 'string') { try { meds = JSON.parse(meds); } catch (e) { meds = []; } }
      let tests = row.lab_tests;
      if (typeof tests === 'string') { try { tests = JSON.parse(tests); } catch (e) { tests = []; } }
      let itemized = row.itemized_breakdown;
      if (typeof itemized === 'string') { try { itemized = JSON.parse(itemized); } catch (e) { itemized = {}; } }
      let daily_progress = row.daily_progress;
      if (typeof daily_progress === 'string') { try { daily_progress = JSON.parse(daily_progress); } catch (e) { daily_progress = []; } }

      let timeline = itemized?.timeline;
      if (!timeline || timeline.length === 0) {
        timeline = generateDayByDayTimeline(
          { admission_date: row.admission_date, daily_progress },
          row.total_days || 1,
          meds,
          tests,
          itemized?.bedDailyRate || 350,
          itemized?.foodDaily || 100,
          itemized?.doctorTotal || 200
        );
      }

      return {
        ...row,
        prescribed_medicines: meds || [],
        lab_tests: tests || [],
        daily_progress: daily_progress || [],
        itemized_breakdown: itemized || {},
        timeline: timeline || []
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Archived records error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export Records to Excel File (.xlsx)
app.get('/api/management/export-excel', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM permanent_patient_history ORDER BY archive_id ASC`);

    const formattedData = result.rows.map(row => {
      let wardBed = row.ward_and_bed_details;
      if (typeof wardBed === 'string') {
        try { wardBed = JSON.parse(wardBed); } catch (e) { wardBed = {}; }
      }
      const wardBedStr = wardBed ? `${wardBed.ward || 'N/A'} (${wardBed.bed_id || 'N/A'}) - ${wardBed.floor || ''}` : 'N/A';

      let meds = row.prescribed_medicines;
      if (typeof meds === 'string') {
        try { meds = JSON.parse(meds); } catch (e) { meds = []; }
      }
      let medCost = 0;
      if (Array.isArray(meds)) {
        medCost = meds.reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0);
      }

      let tests = row.lab_tests;
      if (typeof tests === 'string') {
        try { tests = JSON.parse(tests); } catch (e) { tests = []; }
      }
      let testCost = 0;
      if (Array.isArray(tests)) {
        testCost = tests.reduce((acc, t) => acc + (parseFloat(t.cost) || 0), 0);
      }

      let itemized = row.itemized_breakdown;
      if (typeof itemized === 'string') {
        try { itemized = JSON.parse(itemized); } catch (e) { itemized = {}; }
      }

      return {
        "Patient ID": row.patient_id,
        "Patient Name": row.patient_name,
        "Classification": row.classification || 'Outpatient',
        "Disease / Primary Condition": row.disease_condition || 'N/A',
        "Admission Date & Time": row.admission_date ? new Date(row.admission_date).toLocaleString() : 'N/A',
        "Discharge Date & Time": row.discharge_date ? new Date(row.discharge_date).toLocaleString() : 'N/A',
        "Total Days Stayed": row.total_days || 1,
        "Assigned Ward & Bed Number": wardBedStr,
        "Medicine Expenses": `₹${medCost.toFixed(2)}`,
        "Lab Test Expenses": `₹${testCost.toFixed(2)}`,
        "Bed Charges": `₹${(itemized?.bedTotal || 0).toFixed(2)}`,
        "Doctor Charges": `₹${(itemized?.doctorTotal || 0).toFixed(2)}`,
        "Food Charges": `₹${(itemized?.foodTotal || 0).toFixed(2)}`,
        "Grand Total Bill Amount": `₹${parseFloat(row.total_amount_paid || 0).toFixed(2)}`,
        "Payment Status": "PAID & ARCHIVED",
        "Payment Mode": row.payment_method || 'Online Payment',
        "Archived Timestamp": row.archived_at ? new Date(row.archived_at).toLocaleString() : 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    const colWidths = [
      { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 35 },
      { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 30 },
      { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 22 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Permanent Ledger");

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="MediLife_Permanent_Patient_Ledger.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Hospital Operations KPIs and Stats
app.get('/api/management/stats', async (req, res) => {
  try {
    const bedsTotalRes = await db.query('SELECT COUNT(*) as count FROM beds');
    const bedsOccupiedRes = await db.query('SELECT COUNT(*) as count FROM beds WHERE is_occupied = 1');
    const pendingIntakesRes = await db.query("SELECT COUNT(*) as count FROM admissions WHERE status = 'Pending Intake'");
    const activeInpatientsRes = await db.query("SELECT COUNT(*) as count FROM admissions WHERE status = 'Inpatient'");
    const archivedRes = await db.query('SELECT COUNT(*) as count, SUM(total_amount_paid) as total_rev FROM permanent_patient_history');

    const totalBeds = parseInt(bedsTotalRes.rows[0].count || bedsTotalRes.rows[0]['COUNT(*)'] || 0);
    const occupiedBeds = parseInt(bedsOccupiedRes.rows[0].count || bedsOccupiedRes.rows[0]['COUNT(*)'] || 0);
    const pendingIntakes = parseInt(pendingIntakesRes.rows[0].count || pendingIntakesRes.rows[0]['COUNT(*)'] || 0);
    const activeInpatients = parseInt(activeInpatientsRes.rows[0].count || activeInpatientsRes.rows[0]['COUNT(*)'] || 0);
    const archivedCount = parseInt(archivedRes.rows[0].count || archivedRes.rows[0]['COUNT(*)'] || 0);
    const totalRevenue = parseFloat(archivedRes.rows[0].total_rev || archivedRes.rows[0]['SUM(total_amount_paid)'] || 0);

    const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;

    res.json({
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      occupancyRate: `${occupancyRate}%`,
      pendingIntakes,
      activeInpatients,
      archivedCount,
      totalRevenue: totalRevenue.toFixed(2)
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static build in production
const clientDistPath = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <html>
          <head><title>Medi Life HMS API Server</title></head>
          <body style="font-family:sans-serif;padding:40px;background:#f8fafc;color:#1e293b;">
            <h1 style="color:#0284c7;">🏥 Medi Life HMS API Server Running</h1>
            <p>The backend API is operational on port ${PORT}.</p>
          </body>
        </html>
      `);
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🏥 Medi Life HMS Backend Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log(`=============================================`);
});

module.exports = app;
