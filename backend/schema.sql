-- Database Schema for Medi Life HMS (PostgreSQL)

CREATE TABLE IF NOT EXISTS beds (
    bed_id VARCHAR(20) PRIMARY KEY,
    ward_name VARCHAR(50) NOT NULL, -- General, Semi-Private, ICU, Emergency
    location_floor VARCHAR(20) NOT NULL,
    daily_rate NUMERIC(10, 2) DEFAULT 350.00,
    is_occupied BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS patients (
    patient_id VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    age INT,
    gender VARCHAR(10),
    contact VARCHAR(20),
    emergency_contact VARCHAR(20),
    medical_history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
    staff_id VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS admissions (
    admission_id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    status VARCHAR(20) DEFAULT 'Pending Intake', -- Pending Intake, Inpatient, Outpatient (Discharged)
    disease_condition TEXT,
    preferred_ward VARCHAR(50),
    assigned_bed_id VARCHAR(20) REFERENCES beds(bed_id),
    assigned_doctor VARCHAR(100),
    admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP,
    medicines JSONB DEFAULT '[]'::jsonb, -- [{ "name": "Paracetamol", "cost": 15, "day": 1 }]
    lab_tests JSONB DEFAULT '[]'::jsonb,  -- [{ "name": "Blood Test", "cost": 150, "day": 1 }]
    daily_progress JSONB DEFAULT '[]'::jsonb, -- [{ "day": 1, "date": "...", "notes": "...", "vitals": "..." }]
    doctor_fee NUMERIC(10, 2) DEFAULT 200.00,
    food_charges NUMERIC(10, 2) DEFAULT 100.00,
    bed_daily_rate NUMERIC(10, 2) DEFAULT 350.00,
    is_paid BOOLEAN DEFAULT FALSE
);

-- PERMANENT ARCHIVE TABLE (Immutable Historic Records)
CREATE TABLE IF NOT EXISTS permanent_patient_history (
    archive_id SERIAL PRIMARY KEY,
    admission_id INT NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    patient_name VARCHAR(100) NOT NULL,
    classification VARCHAR(20) NOT NULL, -- Inpatient / Outpatient
    disease_condition TEXT,
    admission_date TIMESTAMP,
    discharge_date TIMESTAMP,
    total_days INT,
    ward_and_bed_details JSONB,
    prescribed_medicines JSONB,
    lab_tests JSONB,
    daily_progress JSONB,
    itemized_breakdown JSONB,
    total_amount_paid NUMERIC(10, 2),
    payment_method VARCHAR(50) DEFAULT 'UPI / Online Banking',
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
