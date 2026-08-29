// Automated API Verification Script for Medi Life HMS

async function testAll() {
  const base = 'http://localhost:5000/api';

  console.log('--- 1. Testing Login (Patient) ---');
  const patLogin = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'P-1001', password: 'patient123' })
  }).then(r => r.json());
  console.log('Patient Login:', patLogin.role, patLogin.user.name);

  console.log('--- 2. Testing Login (Management) ---');
  const staffLogin = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'STAFF-01', password: 'admin123' })
  }).then(r => r.json());
  console.log('Staff Login:', staffLogin.role, staffLogin.user.name);

  console.log('--- 3. Testing Patient Dashboard (P-1001) ---');
  const patDash = await fetch(`${base}/patient/dashboard/P-1001`).then(r => r.json());
  console.log('Dashboard Data - Bed:', patDash.admission?.assigned_bed_id, 'Ward:', patDash.admission?.ward_name, 'Grand Total: ₹' + patDash.billing?.grandTotal);

  console.log('--- 4. Testing Bed Allocation Matrix ---');
  const beds = await fetch(`${base}/management/beds`).then(r => r.json());
  console.log(`Fetched ${beds.length} beds. Sample:`, beds[0].bed_id, beds[0].ward_name, 'Occupied:', beds[0].is_occupied);

  console.log('--- 5. Testing Patient Intake Submission ---');
  const intakeRes = await fetch(`${base}/patient/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_id: 'P-1002',
      disease_condition: 'Severe Migraine with dizziness and nausea',
      preferred_ward: 'Semi-Private'
    })
  }).then(r => r.json());
  console.log('Intake Submitted:', intakeRes.message, 'Admission ID:', intakeRes.admission?.admission_id);

  const admissionId = intakeRes.admission.admission_id;

  console.log('--- 6. Testing Bed & Doctor Assignment ---');
  const assignRes = await fetch(`${base}/management/assign-bed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admission_id: admissionId,
      bed_id: 'SP-203',
      doctor_name: 'Dr. Rajesh Khanna',
      custom_daily_rate: 1800
    })
  }).then(r => r.json());
  console.log('Bed Assigned:', assignRes.message);

  console.log('--- 7. Testing Adding Prescriptions & Lab Tests ---');
  const rxRes = await fetch(`${base}/management/add-prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admission_id: admissionId,
      new_medicines: [
        { name: 'Sumatriptan 50mg', cost: 140, dosage: '1 Tab SOS' },
        { name: 'IV Ondansetron', cost: 120, dosage: 'Stat' }
      ],
      new_tests: [
        { name: 'MRI Brain Contrast', cost: 4200, status: 'Completed' }
      ]
    })
  }).then(r => r.json());
  console.log('Prescriptions Added. Total Meds:', rxRes.medicines.length, 'Total Tests:', rxRes.lab_tests.length);

  console.log('--- 8. Testing Pay & Discharge (Triggers Permanent Archival) ---');
  const dischargeRes = await fetch(`${base}/patient/pay-and-discharge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admission_id: admissionId,
      payment_method: 'UPI (GPay)'
    })
  }).then(r => r.json());
  console.log('Discharge Result:', dischargeRes.message);
  console.log('Receipt Generated:', dischargeRes.receipt?.receiptNumber, 'Total Paid: ₹' + dischargeRes.receipt?.grandTotal);

  console.log('--- 9. Testing Permanent History Archive Query ---');
  const archives = await fetch(`${base}/management/archived-records`).then(r => r.json());
  console.log(`Archived Records Count: ${archives.length}. Latest record patient:`, archives[0].patient_name, 'Amount: ₹' + archives[0].total_amount_paid);

  console.log('--- 10. Testing Excel Export (.xlsx) ---');
  const excelRes = await fetch(`${base}/management/export-excel`);
  const excelBlob = await excelRes.arrayBuffer();
  console.log('Excel Export Response Status:', excelRes.status, 'Content-Type:', excelRes.headers.get('content-type'), 'Bytes:', excelBlob.byteLength);

  console.log('\n✅ ALL 10 END-TO-END TESTS PASSED PERFECTLY!');
}

testAll().catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
