import React, { useState } from 'react';
import { FileText, Send, CheckCircle2, AlertCircle, Sparkles, Bed, Activity, Phone, ShieldAlert, Wind, Stethoscope, UserCheck } from 'lucide-react';
import { api } from '../../services/api';

export default function PatientIntakeForm({ currentUser, onIntakeSubmitted }) {
  const [formData, setFormData] = useState({
    patient_id: currentUser?.id || '',
    full_name: currentUser?.name || '',
    age: currentUser?.age || '',
    gender: currentUser?.gender || 'Male',
    contact: currentUser?.contact || '',
    emergency_contact: currentUser?.emergency_contact || '',
    medical_history: currentUser?.medical_history || '',
    disease_condition: '',
    preferred_ward: 'General'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.disease_condition.trim()) {
      setError('Please describe your symptoms or primary health condition.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.submitIntake(formData);
      setSuccess(true);
      if (onIntakeSubmitted) onIntakeSubmitted();
    } catch (err) {
      setError(err.message || 'Failed to submit intake request.');
    } finally {
      setLoading(false);
    }
  };

  const wardOptions = [
    {
      id: 'Consultation Only',
      name: 'OPD Check-up / Consultation',
      badge: 'No Bed Required',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      rate: '₹0 (No Bed Charge)',
      icon: Stethoscope,
      iconClass: 'text-emerald-600',
      desc: 'Doctor consultation & diagnostic check-up only. No hospital bed stay needed.'
    },
    {
      id: 'General',
      name: 'General Ward',
      badge: 'Inpatient Ward',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      rate: '₹350 / day',
      icon: Bed,
      iconClass: 'text-sky-600',
      desc: 'Standard clean shared medical care unit with 24x7 nursing & dietary care.'
    },
    {
      id: 'AC Room',
      name: 'AC Deluxe Room',
      badge: 'Private Room',
      badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      rate: '₹600 / day',
      icon: Wind,
      iconClass: 'text-cyan-600',
      desc: 'Deluxe private room with full air conditioning, private washroom & amenities.'
    }
  ];

  if (success) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Intake Submitted Successfully!</h3>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          Your symptoms and consultation preference have been transmitted directly to the Management Triage Desk as <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">"Pending Intake"</span>. The medical staff is reviewing your file.
        </p>
        <button
          onClick={() => { setSuccess(false); if (onIntakeSubmitted) onIntakeSubmitted(); }}
          className="mt-6 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          View Live Patient Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
      
      {/* Header */}
      <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Patient Intake & Symptom Self-Reporting</h3>
            <p className="text-xs text-slate-500">Report symptoms for OPD Doctor check-up or inpatient room admission</p>
          </div>
        </div>
        <span className="text-[11px] px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
          Live Triage Form
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Patient Details */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-600" />
            <span>1. Patient Demographics</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Patient ID</label>
              <input
                type="text"
                disabled
                value={formData.patient_id}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-mono font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
              <input
                type="text"
                required
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Medical History */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>2. Emergency Contact & Known Medical History</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Number</label>
              <input
                type="text"
                placeholder="e.g. +91 9876543211 (Family/Friend)"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Past Medical History / Drug Allergies</label>
              <input
                type="text"
                placeholder="e.g. Asthma, Penicillin allergy, Diabetes"
                value={formData.medical_history}
                onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Current Symptoms */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>3. Current Symptoms & Primary Health Condition *</span>
          </h4>
          <textarea
            required
            rows={3}
            placeholder="Describe what symptoms you are experiencing (e.g. Fever, routine doctor check-up, headache, blood pressure review, cough, pain)..."
            value={formData.disease_condition}
            onChange={(e) => setFormData({ ...formData, disease_condition: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:border-sky-500 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Section 4: Preferred Care & Room Category */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Bed className="w-3.5 h-3.5 text-teal-600" />
              <span>4. Care Type & Room Preference</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">Select Consultation Only if no bed is required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {wardOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = formData.preferred_ward === opt.id;

              return (
                <label
                  key={opt.id}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-50/70 border-sky-500 shadow-xs ring-1 ring-sky-500'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded-lg bg-white border border-slate-200 ${opt.iconClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-900">{opt.name}</span>
                      </div>
                      <input
                        type="radio"
                        name="preferred_ward"
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => setFormData({ ...formData, preferred_ward: opt.id })}
                        className="accent-sky-600 w-4 h-4 mt-0.5"
                      />
                    </div>

                    <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border mb-2 ${opt.badgeClass}`}>
                      {opt.badge}
                    </span>

                    <div className="text-xs font-black text-emerald-700 font-mono mb-1.5">{opt.rate}</div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    {opt.desc}
                  </p>
                </label>
              );
            })}
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Transmitting to Hospital...' : 'Submit Details to Management'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
