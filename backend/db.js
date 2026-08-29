const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Check if PostgreSQL is enabled via environment variables
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

let pool = null;
let sqliteDb = null;

const dbPath = path.resolve(__dirname, 'medilife.sqlite');

if (USE_POSTGRES) {
  const { Pool } = require('pg');
  pool = new Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'medilife_db',
    password: process.env.PG_PASSWORD || 'postgres',
    port: parseInt(process.env.PG_PORT || '5432'),
  });
} else {
  // Use SQLite for zero-config out-of-the-box local operation
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Connected to local SQLite database at:', dbPath);
    }
  });
}

// Convert PostgreSQL $1, $2 params to SQLite ? placeholders
function convertQueryToSQLite(sql) {
  return sql
    .replace(/\$\d+/g, '?')
    .replace(/::jsonb/gi, '')
    .replace(/RETURNING \*/gi, '')
    .replace(/JSONB/gi, 'TEXT')
    .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
    .replace(/NUMERIC\(\d+,\s*\d+\)/gi, 'REAL');
}

const JSON_FIELDS = ['medicines', 'lab_tests', 'daily_progress', 'ward_and_bed_details', 'prescribed_medicines', 'itemized_breakdown'];

// Universal Query Interface
async function query(sqlText, params = []) {
  if (USE_POSTGRES && pool) {
    return pool.query(sqlText, params);
  }

  // SQLite Adapter
  return new Promise((resolve, reject) => {
    const isSelect = /^\s*SELECT/i.test(sqlText);
    const isInsert = /^\s*INSERT/i.test(sqlText);
    const isUpdate = /^\s*UPDATE/i.test(sqlText);
    const isDelete = /^\s*DELETE/i.test(sqlText);

    // Convert SQL
    const convertedSql = convertQueryToSQLite(sqlText);

    // Normalize JSON objects for SQLite
    const normalizedParams = params.map(p => {
      if (typeof p === 'object' && p !== null && !(p instanceof Date)) {
        return JSON.stringify(p);
      }
      if (p instanceof Date) {
        return p.toISOString();
      }
      return p;
    });

    if (isSelect) {
      sqliteDb.all(convertedSql, normalizedParams, (err, rows) => {
        if (err) return reject(err);
        // Parse JSON fields automatically if found
        const parsedRows = rows.map(row => {
          const newRow = { ...row };
          JSON_FIELDS.forEach(key => {
            if (newRow[key] && typeof newRow[key] === 'string') {
              try {
                newRow[key] = JSON.parse(newRow[key]);
              } catch (e) {
                // leave as is
              }
            }
          });
          return newRow;
        });
        resolve({ rows: parsedRows, rowCount: parsedRows.length });
      });
    } else {
      sqliteDb.run(convertedSql, normalizedParams, function (err) {
        if (err) return reject(err);
        
        if (isInsert && /RETURNING \*/i.test(sqlText)) {
          // If query requested returning, fetch the inserted record
          const lastId = this.lastID;
          let fetchSql = 'SELECT * FROM admissions WHERE admission_id = ?';
          if (/INSERT INTO patients/i.test(sqlText)) {
            fetchSql = 'SELECT * FROM patients WHERE rowid = ?';
          } else if (/INSERT INTO permanent_patient_history/i.test(sqlText)) {
            fetchSql = 'SELECT * FROM permanent_patient_history WHERE archive_id = ?';
          }
          sqliteDb.get(fetchSql, [lastId], (fetchErr, row) => {
            if (fetchErr || !row) {
              resolve({ rows: [{ id: lastId }], rowCount: 1 });
            } else {
              JSON_FIELDS.forEach(key => {
                if (row[key] && typeof row[key] === 'string') {
                  try { row[key] = JSON.parse(row[key]); } catch (e) {}
                }
              });
              resolve({ rows: [row], rowCount: 1 });
            }
          });
        } else {
          resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
        }
      });
    }
  });
}

// Transaction Client Wrapper
async function getClient() {
  if (USE_POSTGRES && pool) {
    return pool.connect();
  }

  // SQLite transaction pseudo-client
  return {
    query: (sql, params) => query(sql, params),
    release: () => {}
  };
}

// Initialize Tables & Schema with automatic column migrations
async function initDatabase() {
  console.log('Initializing database schema with General & AC Room support...');

  const schema = `
    CREATE TABLE IF NOT EXISTS beds (
        bed_id TEXT PRIMARY KEY,
        ward_name TEXT NOT NULL,
        location_floor TEXT NOT NULL,
        daily_rate REAL DEFAULT 350.0,
        is_occupied INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS patients (
        patient_id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        contact TEXT,
        emergency_contact TEXT,
        medical_history TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff (
        staff_id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admissions (
        admission_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT,
        status TEXT DEFAULT 'Pending Intake',
        disease_condition TEXT,
        preferred_ward TEXT,
        assigned_bed_id TEXT,
        assigned_doctor TEXT,
        admission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        discharge_date DATETIME,
        medicines TEXT DEFAULT '[]',
        lab_tests TEXT DEFAULT '[]',
        daily_progress TEXT DEFAULT '[]',
        doctor_fee REAL DEFAULT 200.00,
        food_charges REAL DEFAULT 100.00,
        bed_daily_rate REAL DEFAULT 350.00,
        is_paid INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS permanent_patient_history (
        archive_id INTEGER PRIMARY KEY AUTOINCREMENT,
        admission_id INTEGER NOT NULL,
        patient_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        classification TEXT NOT NULL,
        disease_condition TEXT,
        admission_date DATETIME,
        discharge_date DATETIME,
        total_days INTEGER,
        ward_and_bed_details TEXT,
        prescribed_medicines TEXT,
        lab_tests TEXT,
        daily_progress TEXT DEFAULT '[]',
        itemized_breakdown TEXT,
        total_amount_paid REAL,
        payment_method TEXT DEFAULT 'UPI / Card',
        archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS government_health_cards (
        patient_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        card_type TEXT DEFAULT 'Ayushman Bharat PM-JAY',
        total_limit REAL DEFAULT 500000.0,
        used_amount REAL DEFAULT 0.0,
        remaining_balance REAL DEFAULT 500000.0,
        last_used_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  if (!USE_POSTGRES) {
    await new Promise((resolve, reject) => {
      sqliteDb.exec(schema, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    sqliteDb.run("ALTER TABLE admissions ADD COLUMN daily_progress TEXT DEFAULT '[]'", () => {});
    sqliteDb.run("ALTER TABLE permanent_patient_history ADD COLUMN daily_progress TEXT DEFAULT '[]'", () => {});
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS government_health_cards (
      patient_id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      card_type TEXT DEFAULT 'Ayushman Bharat PM-JAY',
      total_limit REAL DEFAULT 500000.0,
      used_amount REAL DEFAULT 0.0,
      remaining_balance REAL DEFAULT 500000.0,
      last_used_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {});
  }

  // Setup Hospital Beds: General Ward (Non-AC ₹350/day) and AC Room (Air Conditioned ₹600/day)
  const bedsCheck = await query('SELECT COUNT(*) as count FROM beds');
  const bedCount = bedsCheck.rows[0].count || bedsCheck.rows[0]['COUNT(*)'] || 0;
  
  if (bedCount === 0) {
    console.log('Seeding hospital General Ward and AC Room beds...');
    const initialBeds = [
      // 1. General Ward (Non-AC) - Floor 1 (₹350/day)
      { id: 'GEN-101', ward: 'General Ward', floor: 'Floor 1 - Wing A', rate: 350, occupied: 0 },
      { id: 'GEN-102', ward: 'General Ward', floor: 'Floor 1 - Wing A', rate: 350, occupied: 0 },
      { id: 'GEN-103', ward: 'General Ward', floor: 'Floor 1 - Wing B', rate: 350, occupied: 0 },
      { id: 'GEN-104', ward: 'General Ward', floor: 'Floor 1 - Wing B', rate: 350, occupied: 0 },
      { id: 'GEN-105', ward: 'General Ward', floor: 'Floor 1 - Wing C', rate: 350, occupied: 0 },
      { id: 'GEN-106', ward: 'General Ward', floor: 'Floor 1 - Wing C', rate: 350, occupied: 0 },
      { id: 'GEN-107', ward: 'General Ward', floor: 'Floor 1 - Wing D', rate: 350, occupied: 0 },
      { id: 'GEN-108', ward: 'General Ward', floor: 'Floor 1 - Wing D', rate: 350, occupied: 0 },

      // 2. AC Room (Air Conditioned) - Floor 2 (₹600/day)
      { id: 'AC-201', ward: 'AC Room', floor: 'Floor 2 - Deluxe Wing', rate: 600, occupied: 0 },
      { id: 'AC-202', ward: 'AC Room', floor: 'Floor 2 - Deluxe Wing', rate: 600, occupied: 0 },
      { id: 'AC-203', ward: 'AC Room', floor: 'Floor 2 - Deluxe Wing', rate: 600, occupied: 0 },
      { id: 'AC-204', ward: 'AC Room', floor: 'Floor 2 - Deluxe Wing', rate: 600, occupied: 0 },
      { id: 'AC-205', ward: 'AC Room', floor: 'Floor 2 - Executive AC', rate: 600, occupied: 0 },
      { id: 'AC-206', ward: 'AC Room', floor: 'Floor 2 - Executive AC', rate: 600, occupied: 0 },
      { id: 'AC-207', ward: 'AC Room', floor: 'Floor 2 - Executive AC', rate: 600, occupied: 0 },
      { id: 'AC-208', ward: 'AC Room', floor: 'Floor 2 - Executive AC', rate: 600, occupied: 0 },
    ];

    for (const b of initialBeds) {
      await query(
        'INSERT INTO beds (bed_id, ward_name, location_floor, daily_rate, is_occupied) VALUES ($1, $2, $3, $4, $5)',
        [b.id, b.ward, b.floor, b.rate, b.occupied]
      );
    }
  }

  // Seed Staff & Doctors
  const staffCheck = await query('SELECT COUNT(*) as count FROM staff');
  const staffCount = staffCheck.rows[0].count || staffCheck.rows[0]['COUNT(*)'] || 0;
  if (staffCount === 0) {
    console.log('Seeding hospital doctors & staff...');
    const staffMembers = [
      { id: 'STAFF-01', pass: 'admin123', name: 'Dr. Arvind Mehta', role: 'Chief Medical Officer', dept: 'Cardiology & Critical Care' },
      { id: 'STAFF-02', pass: 'admin123', name: 'Dr. Sunita Rao', role: 'Senior Surgeon', dept: 'General Surgery' },
      { id: 'STAFF-03', pass: 'admin123', name: 'Dr. Rajesh Khanna', role: 'Consultant Physician', dept: 'Internal Medicine' },
      { id: 'STAFF-04', pass: 'admin123', name: 'Nurse Priya Sen', role: 'Head of Operations & Triage', dept: 'Nursing & Bed Allocation' }
    ];

    for (const s of staffMembers) {
      await query(
        'INSERT INTO staff (staff_id, password_hash, full_name, role, department) VALUES ($1, $2, $3, $4, $5)',
        [s.id, s.pass, s.name, s.role, s.dept]
      );
    }
  }

  console.log('Database initialization complete.');
}

// Helper to wipe patient operational data for a fresh start
async function clearOperationalData() {
  await query('DELETE FROM admissions');
  await query('DELETE FROM permanent_patient_history');
  await query('DELETE FROM patients');
  await query('UPDATE beds SET is_occupied = 0');
  console.log('Cleared operational patient admissions, archives, and reset all beds to available.');
}

module.exports = {
  query,
  getClient,
  initDatabase,
  clearOperationalData
};
