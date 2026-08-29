import React, { useState, useMemo } from 'react';
import { 
  Search, Stethoscope, User, Pill, FlaskConical, FileText, Calendar, 
  Clock, MapPin, Building2, CheckCircle2, AlertCircle, Plus, Printer, 
  Download, Award, HeartPulse, ChevronRight, Activity, ShieldCheck, 
  Edit3, ArrowRight, UserCheck, MessageSquarePlus
} from 'lucide-react';
import { api } from '../../services/api';
import PrescriptionLabModal from './PrescriptionLabModal';
import PrintReceiptModal from '../PrintReceiptModal';

export default function ConsultantView({ 
  patientsQueue = [], 
  archivedRecords = [], 
  doctors = [], 
  onRefresh 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, INPATIENT, OPD, ARCHIVED
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  
  // Modals state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedForAction, setSelectedForAction] = useState(null);

  // Quick doctor assignment state
  const [assigningDoctor, setAssigningDoctor] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');

  // Add clinical note state
  const [newNote, setNewNote] = useState('');
  const [newVitals, setNewVitals] = useState('BP 120/80, SpO2 98%, Pulse 74, Temp 98.4°F');
  const [savingNote, setSavingNote] = useState(false);

  // Normalize all patients into a unified searchable collection
  const allRecords = useMemo(() => {
    const list = [];

    // 1. Active Admissions and OPD Check-ups
    patientsQueue.forEach(item => {
      let meds = item.medicines;
      if (typeof meds === 'string') {
        try { meds = JSON.parse(meds); } catch (e) { meds = []; }
      }
      if (!Array.isArray(meds)) meds = [];

      let tests = item.lab_tests;
      if (typeof tests === 'string') {
        try { tests = JSON.parse(tests); } catch (e) { tests = []; }
      }
      if (!Array.isArray(tests)) tests = [];

      let progress = item.daily_progress;
      if (typeof progress === 'string') {
        try { progress = JSON.parse(progress); } catch (e) { progress = []; }
      }
      if (!Array.isArray(progress)) progress = [];

      list.push({
        id: item.admission_id,
        patientId: item.patient_id,
        patientName: item.patient_name || item.full_name || item.patient_id,
        age: item.age || 35,
        gender: item.gender || 'Not specified',
        contact: item.contact || 'N/A',
        emergencyContact: item.emergency_contact || 'N/A',
        medicalHistory: item.medical_history || 'No prior chronic conditions recorded',
        problem: item.disease_condition || 'Routine Medical Checkup',
        preferredWard: item.preferred_ward,
        assignedBedId: item.assigned_bed_id,
        wardName: item.ward_name || item.preferred_ward,
        locationFloor: item.location_floor || 'Main Facility',
        doctor: item.assigned_doctor || 'Unassigned Doctor',
        admissionDate: item.admission_date,
        dischargeDate: item.discharge_date,
        status: item.status,
        medicines: meds,
        labTests: tests,
        dailyProgress: progress,
        isArchived: false,
        rawRecord: item
      });
    });

    // 2. Archived Patient Records
    archivedRecords.forEach(item => {
      let meds = item.prescribed_medicines || item.medicines;
      if (typeof meds === 'string') {
        try { meds = JSON.parse(meds); } catch (e) { meds = []; }
      }
      if (!Array.isArray(meds)) meds = [];

      let tests = item.lab_tests;
      if (typeof tests === 'string') {
        try { tests = JSON.parse(tests); } catch (e) { tests = []; }
      }
      if (!Array.isArray(tests)) tests = [];

      let progress = item.daily_progress;
      if (typeof progress === 'string') {
        try { progress = JSON.parse(progress); } catch (e) { progress = []; }
      }
      if (!Array.isArray(progress)) progress = [];

      let wardBed = item.ward_and_bed_details;
      if (typeof wardBed === 'string') {
        try { wardBed = JSON.parse(wardBed); } catch (e) { wardBed = {}; }
      }

      list.push({
        id: item.archive_id || item.admission_id,
        patientId: item.patient_id,
        patientName: item.patient_name,
        age: item.age || 35,
        gender: item.gender || 'Not specified',
        contact: item.contact || 'N/A',
        emergencyContact: item.emergency_contact || 'N/A',
        medicalHistory: item.medical_history || 'N/A',
        problem: item.disease_condition || 'Medical Treatment',
        preferredWard: wardBed?.ward || 'General',
        assignedBedId: wardBed?.bed_id || 'Day Care',
        wardName: wardBed?.ward || 'Discharged',
        locationFloor: wardBed?.floor || 'Main Facility',
        doctor: item.assigned_doctor || 'Attending Medical Officer',
        admissionDate: item.admission_date,
        dischargeDate: item.discharge_date,
        status: 'Outpatient (Discharged)',
        medicines: meds,
        labTests: tests,
        dailyProgress: progress,
        isArchived: true,
        rawRecord: item
      });
    });

    return list;
  }, [patientsQueue, archivedRecords]);

  // Filtered list based on search and status
  const filteredList = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return allRecords.filter(item => {
      const matchSearch = 
        !q ||
        item.patientId.toLowerCase().includes(q) ||
        item.patientName.toLowerCase().includes(q) ||
        item.problem.toLowerCase().includes(q) ||
        item.doctor.toLowerCase().includes(q) ||
        (item.assignedBedId && item.assignedBedId.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter === 'INPATIENT') {
        return item.status === 'Inpatient' && !item.isArchived;
      }
      if (statusFilter === 'OPD') {
        return (item.preferredWard?.includes('Consult') || item.status === 'Pending Intake') && !item.isArchived;
      }
      if (statusFilter === 'ARCHIVED') {
        return item.isArchived;
      }
      return true;
    });
  }, [allRecords, searchTerm, statusFilter]);

  // Active selected patient record
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId && filteredList.length > 0) {
      return filteredList[0];
    }
    return allRecords.find(p => p.patientId === selectedPatientId) || filteredList[0] || null;
  }, [filteredList, allRecords, selectedPatientId]);

  // Handle Assigning Doctor
  const handleAssignDoctor = async () => {
    if (!selectedPatient || !selectedDoctor) return;
    setAssigningDoctor(true);
    try {
      await api.assignDoctor(selectedPatient.rawRecord.admission_id, selectedDoctor);
      if (onRefresh) onRefresh();
      alert(`Dr. ${selectedDoctor} successfully assigned to ${selectedPatient.patientName}!`);
    } catch (err) {
      alert(err.message || 'Failed to assign doctor');
    } finally {
      setAssigningDoctor(false);
    }
  };

  // Handle Adding Clinical Note
  const handleAddClinicalNote = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !newNote.trim()) return;
    setSavingNote(true);
    try {
      await api.addProgressNote(selectedPatient.rawRecord.admission_id, newNote, newVitals);
      setNewNote('');
      if (onRefresh) onRefresh();
      alert('Consultation clinical note logged successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save clinical note');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Toolbar & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Consultant & Clinical Patient Dossier
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Search any patient by ID or Name to view handling doctor, clinical problems, prescribed medicines, lab reports, and final case sheets.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              {filteredList.length} Matching Patient(s)
            </span>
          </div>
        </div>

        {/* Search Input and Filter Pills */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Patient ID (e.g. P-1004), Name (e.g. Rahul), Doctor, or Problem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({allRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INPATIENT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                statusFilter === 'INPATIENT'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inpatients
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('OPD')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                statusFilter === 'OPD'
                  ? 'bg-white text-sky-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              OPD Check-ups
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                statusFilter === 'ARCHIVED'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Interface: Left List + Right Detailed Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Patient List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-2.5 max-h-[85vh] overflow-y-auto">
          <div className="px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>Patients Directory</span>
            <span className="font-mono text-[11px] text-teal-700">{filteredList.length} Found</span>
          </div>

          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              No patients found matching your search.
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelected = selectedPatient?.patientId === item.patientId && selectedPatient?.id === item.id;
              return (
                <div
                  key={`${item.patientId}-${item.id}`}
                  onClick={() => setSelectedPatientId(item.patientId)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition space-y-2 ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-500 shadow-xs ring-1 ring-teal-500'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">{item.patientName}</span>
                        <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          {item.patientId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.age} Yrs • {item.gender}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.status === 'Inpatient'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.preferredWard?.includes('Consult')
                          ? 'bg-teal-100 text-teal-800'
                          : item.isArchived
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.preferredWard?.includes('Consult') ? 'OPD Check-up' : item.status}
                    </span>
                  </div>

                  {/* Problem & Doctor Preview */}
                  <div className="text-xs text-slate-700 font-medium line-clamp-1">
                    🩺 <span className="font-semibold text-slate-900">{item.problem}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span className="flex items-center space-x-1 truncate max-w-[170px]">
                      <UserCheck className="w-3 h-3 text-teal-600 flex-shrink-0" />
                      <span className="truncate">{item.doctor}</span>
                    </span>
                    <span className="font-mono text-[10px]">
                      {item.assignedBedId || (item.preferredWard?.includes('Consult') ? 'OPD' : 'No Bed')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Full Comprehensive Clinical Dossier (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPatient ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Top Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 font-black text-xl flex items-center justify-center flex-shrink-0">
                    {selectedPatient.patientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {selectedPatient.patientName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        {selectedPatient.patientId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedPatient.age} Years • {selectedPatient.gender} • Contact: <strong className="text-slate-700">{selectedPatient.contact}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Admitted: {new Date(selectedPatient.admissionDate).toLocaleString()} • {selectedPatient.locationFloor}
                    </p>
                  </div>
                </div>

                {/* Print & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedForAction(selectedPatient.rawRecord);
                      setShowPrintModal(true);
                    }}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Final Medical Report</span>
                  </button>

                  {!selectedPatient.isArchived && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedForAction(selectedPatient.rawRecord);
                        setShowPrescriptionModal(true);
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Prescribe Meds & Labs</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 1: 👨‍⚕️ ATTENDING DOCTOR / CONSULTANT IN-CHARGE */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-teal-700" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider block">Handling Doctor / Consultant:</span>
                      <strong className="text-slate-900 text-sm sm:text-base">{selectedPatient.doctor}</strong>
                    </div>
                  </div>

                  {!selectedPatient.isArchived && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedDoctor}
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                      >
                        <option value="">-- Reassign Doctor --</option>
                        {doctors.map((doc, i) => (
                          <option key={i} value={`${doc.full_name} (${doc.department})`}>
                            {doc.full_name} ({doc.department})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedDoctor || assigningDoctor}
                        onClick={handleAssignDoctor}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                      >
                        {assigningDoctor ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: 🩺 PROBLEM & MEDICAL PROFILE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
                    <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                    <span>Primary Medical Problem / Chief Complaints</span>
                  </span>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedPatient.problem}
                  </div>
                  <p className="text-xs text-slate-500">
                    Care Category: <strong className="text-slate-800">{selectedPatient.wardName}</strong> • Bed: <strong className="font-mono text-slate-800">{selectedPatient.assignedBedId || 'No Bed (OPD)'}</strong>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
                    <Activity className="w-3.5 h-3.5 text-sky-500" />
                    <span>Clinical History & Allergies</span>
                  </span>
                  <div className="text-xs font-medium text-slate-800">
                    {selectedPatient.medicalHistory}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Emergency Contact: <strong className="text-slate-800">{selectedPatient.emergencyContact}</strong>
                  </p>
                </div>
              </div>

              {/* SECTION 3: 💊 PRESCRIBED MEDICINES */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <span>Prescribed Medications ({selectedPatient.medicines?.length || 0})</span>
                  </span>
                </div>

                {selectedPatient.medicines && selectedPatient.medicines.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedPatient.medicines.map((med, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{med.name}</div>
                          <div className="text-[11px] text-slate-500">{med.dosage || 'Standard Dosage'}</div>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700">₹{parseFloat(med.cost || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs rounded-xl bg-slate-50 border border-dashed border-slate-200">
                    No active medications prescribed. Click "+ Prescribe Meds & Labs" to order.
                  </div>
                )}
              </div>

              {/* SECTION 4: 🔬 DIAGNOSTIC LAB TESTS & INVESTIGATIONS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    <span>Diagnostic Lab Tests & Investigation Reports ({selectedPatient.labTests?.length || 0})</span>
                  </span>
                </div>

                {selectedPatient.labTests && selectedPatient.labTests.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedPatient.labTests.map((t, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{t.name}</span>
                          <span className="font-mono text-xs font-bold text-purple-700">₹{parseFloat(t.cost || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center space-x-1">
                          <Building2 className="w-3 h-3 text-purple-600 flex-shrink-0" />
                          <span>{t.room || 'Pathology Lab (Room 102)'}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-purple-600 flex-shrink-0" />
                          <span>{t.time || 'Scheduled: Today'}</span>
                          <span className="ml-auto font-bold text-[10px] uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                            {t.status || 'Ordered'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs rounded-xl bg-slate-50 border border-dashed border-slate-200">
                    No diagnostic tests ordered. Click "+ Prescribe Meds & Labs" to schedule tests.
                  </div>
                )}
              </div>

              {/* SECTION 5: 📋 CONSULTATION PROGRESS NOTES & FINAL CASE REPORT */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Doctor Consultation Notes & Clinical Progress Journal</span>
                </span>

                {/* Add Quick Consultation Note Box */}
                {!selectedPatient.isArchived && (
                  <form onSubmit={handleAddClinicalNote} className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
                    <span className="text-xs font-bold text-teal-900 flex items-center space-x-1">
                      <MessageSquarePlus className="w-4 h-4 text-teal-600" />
                      <span>Add Doctor Consultation / Case Progress Note:</span>
                    </span>

                    <textarea
                      rows={2}
                      placeholder="Enter clinical observations, patient response to medications, and treatment plan..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />

                    <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                      <input
                        type="text"
                        placeholder="Vitals (e.g. BP 120/80, SpO2 98%, Pulse 72)"
                        value={newVitals}
                        onChange={(e) => setNewVitals(e.target.value)}
                        className="w-full sm:w-80 px-3 py-1.5 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={savingNote || !newNote.trim()}
                        className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center space-x-1"
                      >
                        <span>{savingNote ? 'Saving...' : 'Save Consultation Note'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Existing Daily Clinical Notes List */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {selectedPatient.dailyProgress && selectedPatient.dailyProgress.length > 0 ? (
                    selectedPatient.dailyProgress.map((prog, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-200/80 pb-1">
                          <span className="text-teal-800">Day {prog.day || (idx + 1)} • {prog.date ? new Date(prog.date).toLocaleDateString() : 'Active Consultation'}</span>
                          <span className="font-mono text-slate-600">{prog.vitals || 'Vitals Normal'}</span>
                        </div>
                        <p className="text-slate-800 font-medium pt-0.5">{prog.notes || 'Patient evaluated and stable.'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs rounded-xl bg-slate-50 border border-dashed border-slate-200">
                      No daily consultation notes logged yet. Use the form above to add notes.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2 shadow-xs">
              <Stethoscope className="w-12 h-12 mx-auto text-slate-300" />
              <h4 className="text-base font-bold text-slate-700">No Patient Selected</h4>
              <p className="text-xs text-slate-500">
                Please select a patient from the directory on the left to review their complete clinical case dossier.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Prescription & Lab Order Modal */}
      {showPrescriptionModal && selectedForAction && (
        <PrescriptionLabModal
          admission={selectedForAction}
          onClose={() => {
            setShowPrescriptionModal(false);
            setSelectedForAction(null);
          }}
          onUpdated={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Print Final Medical Report Modal */}
      {showPrintModal && selectedForAction && (
        <PrintReceiptModal
          receiptData={selectedForAction}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedForAction(null);
          }}
        />
      )}

    </div>
  );
}
