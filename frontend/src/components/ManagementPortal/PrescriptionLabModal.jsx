import React, { useState } from 'react';
import { X, Plus, Trash2, Pill, FlaskConical, CheckCircle2, AlertCircle, Save, Clock, MapPin, Building } from 'lucide-react';
import { api } from '../../services/api';

export default function PrescriptionLabModal({ admission, onClose, onUpdated }) {
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '1 Tab Twice Daily', cost: 25 }
  ]);
  const [labTests, setLabTests] = useState([
    { 
      name: '', 
      room: 'Pathology Lab (Room 102)', 
      time: '10:30 AM - 11:30 AM', 
      status: 'Ordered', 
      cost: 150 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Common quick-pick standard affordable medicines
  const quickMeds = [
    { name: 'Paracetamol 650mg', dosage: 'SOS Fever', cost: 15 },
    { name: 'Pantoprazole 40mg (Antacid)', dosage: 'Once daily empty stomach', cost: 35 },
    { name: 'Augmentin 625mg (Antibiotic)', dosage: 'Twice daily after meals', cost: 85 },
    { name: 'IV Normal Saline 500ml', dosage: 'Continuous IV Infusion', cost: 45 },
    { name: 'Ceftriaxone 1g Injection', dosage: 'Twice daily IV', cost: 95 },
    { name: 'Azithromycin 500mg', dosage: 'Once daily 5 days', cost: 60 }
  ];

  // Common quick-pick diagnostic tests with specific standard rooms and time slots
  const quickTests = [
    { 
      name: 'Complete Blood Count (CBC)', 
      room: 'Pathology Lab - Room 102 (1st Floor)', 
      time: '10:00 AM - 11:00 AM', 
      cost: 150 
    },
    { 
      name: 'Comprehensive Metabolic Panel (CMP)', 
      room: 'Biochemistry Lab - Room 103 (1st Floor)', 
      time: '11:00 AM - 12:00 PM', 
      cost: 250 
    },
    { 
      name: 'Chest X-Ray (Digital PA)', 
      room: 'Digital X-Ray - Room 108 (Ground Floor)', 
      time: '10:30 AM - 11:30 AM', 
      cost: 300 
    },
    { 
      name: 'ECG / EKG (12-Lead)', 
      room: 'Cardiology Lab - Room 204 (2nd Floor)', 
      time: '11:30 AM - 12:30 PM', 
      cost: 150 
    },
    { 
      name: 'Serum Electrolytes (Na/K/Cl)', 
      room: 'Pathology Lab - Room 102 (1st Floor)', 
      time: '12:00 PM - 01:00 PM', 
      cost: 200 
    },
    { 
      name: 'Ultrasound Abdomen & Pelvis', 
      room: 'Radiology / USG - Room 105 (Ground Floor)', 
      time: '02:00 PM - 03:00 PM', 
      cost: 500 
    },
    { 
      name: 'CT Scan Brain / Chest', 
      room: 'Advanced Imaging CT - Room 110 (Ground Floor)', 
      time: '03:30 PM - 04:30 PM', 
      cost: 1500 
    }
  ];

  const handleAddMedRow = () => {
    setMedicines([...medicines, { name: '', dosage: '1 Tab Daily', cost: 30 }]);
  };

  const handleRemoveMedRow = (idx) => {
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleAddTestRow = () => {
    setLabTests([...labTests, { 
      name: '', 
      room: 'Pathology Lab - Room 102 (1st Floor)', 
      time: '10:30 AM - 11:30 AM', 
      status: 'Ordered', 
      cost: 200 
    }]);
  };

  const handleRemoveTestRow = (idx) => {
    setLabTests(labTests.filter((_, i) => i !== idx));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validMeds = medicines.filter(m => m.name.trim().length > 0).map(m => ({
        ...m,
        cost: parseFloat(m.cost) || 0
      }));

      const validTests = labTests.filter(t => t.name.trim().length > 0).map(t => ({
        ...t,
        room: t.room || 'Pathology Lab - Room 102 (1st Floor)',
        time: t.time || '10:30 AM - 11:30 AM',
        cost: parseFloat(t.cost) || 0
      }));

      if (validMeds.length === 0 && validTests.length === 0) {
        throw new Error('Please add at least one medication or lab test.');
      }

      await api.addPrescriptions(admission.admission_id, validMeds, validTests);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update prescriptions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl my-8">
        
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Prescribe Medicines & Schedule Lab Tests</h3>
              <p className="text-xs text-slate-500">
                Patient: <strong className="text-slate-800">{admission.patient_name || admission.patient_id}</strong> ({admission.status})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* 1. Medicines Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Pill className="w-3.5 h-3.5 text-emerald-600" />
                <span>Prescribed Medications</span>
              </span>
              <button
                type="button"
                onClick={handleAddMedRow}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Medication</span>
              </button>
            </div>

            {/* Quick Pick Medication Chips */}
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold w-full mb-1">Quick-Pick Medicines:</span>
              {quickMeds.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMedicines([...medicines, { ...m }])}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 rounded-lg text-[11px] font-medium transition"
                >
                  + {m.name} (₹{m.cost})
                </button>
              ))}
            </div>

            {/* Medicine Rows */}
            <div className="space-y-2">
              {medicines.map((med, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Paracetamol)"
                      value={med.name}
                      onChange={(e) => {
                        const copy = [...medicines];
                        copy[idx].name = e.target.value;
                        setMedicines(copy);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 1 Tab TDS)"
                      value={med.dosage}
                      onChange={(e) => {
                        const copy = [...medicines];
                        copy[idx].dosage = e.target.value;
                        setMedicines(copy);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Cost (₹)"
                      value={med.cost}
                      onChange={(e) => {
                        const copy = [...medicines];
                        copy[idx].cost = e.target.value;
                        setMedicines(copy);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveMedRow(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Lab Tests Section with Test Room & Time */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                  <span>Diagnostic Pathology & Radiology Tests</span>
                </span>
                <p className="text-[11px] text-slate-500">Includes Scheduled Test Time & Laboratory Room Location</p>
              </div>
              <button
                type="button"
                onClick={handleAddTestRow}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Lab Test</span>
              </button>
            </div>

            {/* Quick Pick Lab Chips */}
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold w-full mb-1">Quick-Pick Tests (With Auto Room & Time):</span>
              {quickTests.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLabTests([...labTests, { 
                    name: t.name, 
                    room: t.room, 
                    time: t.time, 
                    status: 'Ordered', 
                    cost: t.cost 
                  }])}
                  className="px-2.5 py-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-900 border border-slate-200 rounded-lg text-[11px] font-medium transition"
                >
                  + {t.name} (₹{t.cost})
                </button>
              ))}
            </div>

            {/* Test Cards / Rows */}
            <div className="space-y-3">
              {labTests.map((test, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  
                  {/* Top Row: Test Name, Status, Cost, Delete */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Diagnostic Test Name *</label>
                      <input
                        type="text"
                        placeholder="Test Name (e.g. Complete Blood Count)"
                        value={test.name}
                        onChange={(e) => {
                          const copy = [...labTests];
                          copy[idx].name = e.target.value;
                          setLabTests(copy);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</label>
                      <select
                        value={test.status}
                        onChange={(e) => {
                          const copy = [...labTests];
                          copy[idx].status = e.target.value;
                          setLabTests(copy);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-500"
                      >
                        <option value="Ordered">Ordered</option>
                        <option value="Sample Collected">Sample Collected</option>
                        <option value="Processing">Processing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Test Cost (₹)</label>
                      <input
                        type="number"
                        placeholder="Cost (₹)"
                        value={test.cost}
                        onChange={(e) => {
                          const copy = [...labTests];
                          copy[idx].cost = e.target.value;
                          setLabTests(copy);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="col-span-1 text-right pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveTestRow(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Test Room Location & Scheduled Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1 mb-1">
                        <Building className="w-3 h-3 text-purple-600" />
                        <span>Test Room / Laboratory Facility</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pathology Lab - Room 102 (1st Floor)"
                        value={test.room || ''}
                        onChange={(e) => {
                          const copy = [...labTests];
                          copy[idx].room = e.target.value;
                          setLabTests(copy);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1 mb-1">
                        <Clock className="w-3 h-3 text-purple-600" />
                        <span>Scheduled Test Time Slot</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10:30 AM - 11:30 AM"
                        value={test.time || ''}
                        onChange={(e) => {
                          const copy = [...labTests];
                          copy[idx].time = e.target.value;
                          setLabTests(copy);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving Orders...' : 'Save & Sync Schedule to Patient'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
