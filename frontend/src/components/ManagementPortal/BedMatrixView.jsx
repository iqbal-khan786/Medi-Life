import React, { useState } from 'react';
import { Bed, Building2, MapPin, User, Stethoscope, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Filter, X, Wind } from 'lucide-react';
import { api } from '../../services/api';

export default function BedMatrixView({ beds, patientsQueue, doctors, onBedAssigned }) {
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [filterAvailability, setFilterAvailability] = useState('ALL'); // ALL, AVAILABLE, OCCUPIED
  const [assigningBed, setAssigningBed] = useState(null);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Arvind Mehta');
  const [customRate, setCustomRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtered beds
  const filteredBeds = beds.filter(b => {
    if (selectedWard !== 'ALL' && b.ward_name !== selectedWard) return false;
    if (filterAvailability === 'AVAILABLE' && b.is_occupied) return false;
    if (filterAvailability === 'OCCUPIED' && !b.is_occupied) return false;
    return true;
  });

  // Ward groups for stats (General Ward & AC Room)
  const uniqueWards = Array.from(new Set(beds.map(b => b.ward_name)));
  const wards = uniqueWards.length > 0 ? uniqueWards : ['General Ward', 'AC Room'];

  const handleOpenAssignModal = (bed) => {
    setAssigningBed(bed);
    setCustomRate(bed.daily_rate);
    setError(null);
    // Auto-select first pending patient if available
    const firstPending = patientsQueue.find(p => p.status === 'Pending Intake');
    if (firstPending) {
      setSelectedAdmissionId(firstPending.admission_id.toString());
    } else if (patientsQueue.length > 0) {
      setSelectedAdmissionId(patientsQueue[0].admission_id.toString());
    }
  };

  const handleAssignBedSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdmissionId) {
      setError('Please select a patient admission from the queue.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.assignBed(
        parseInt(selectedAdmissionId),
        assigningBed.bed_id,
        selectedDoctor,
        parseFloat(customRate) || assigningBed.daily_rate
      );
      setAssigningBed(null);
      if (onBedAssigned) onBedAssigned();
    } catch (err) {
      setError(err.message || 'Failed to assign bed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter Bar & Ward Stats */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Bed className="w-5 h-5 text-sky-600" />
              <span>Hospital Bed Allocation Matrix</span>
            </h3>
            <p className="text-xs text-slate-500">
              Live room status, floor locations, and instant bed assignment for active & incoming admissions
            </p>
          </div>

          {/* Availability Status Filter */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterAvailability('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                filterAvailability === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
              }`}
            >
              All Beds ({beds.length})
            </button>
            <button
              onClick={() => setFilterAvailability('AVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                filterAvailability === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Available ({beds.filter(b => !b.is_occupied).length})
            </button>
            <button
              onClick={() => setFilterAvailability('OCCUPIED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                filterAvailability === 'OCCUPIED'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              Occupied ({beds.filter(b => b.is_occupied).length})
            </button>
          </div>
        </div>

        {/* Ward Category Selector Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setSelectedWard('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              selectedWard === 'ALL'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Rooms
          </button>
          {wards.map(ward => {
            const wardBeds = beds.filter(b => b.ward_name === ward);
            const occupiedCount = wardBeds.filter(b => b.is_occupied).length;
            return (
              <button
                key={ward}
                onClick={() => setSelectedWard(ward)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  selectedWard === ward
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{ward}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/80 text-slate-700 font-mono border border-slate-200">
                  {occupiedCount}/{wardBeds.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bed Matrix Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBeds.map(bed => {
          const isOccupied = Boolean(bed.is_occupied);

          return (
            <div
              key={bed.bed_id}
              className={`rounded-2xl border p-5 transition relative overflow-hidden flex flex-col justify-between shadow-xs ${
                isOccupied
                  ? 'bg-white border-amber-200'
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              {/* Top Row: Bed ID and Status Badge */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-base font-black text-slate-900">{bed.bed_id}</span>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                    isOccupied
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                    <span>{isOccupied ? 'Occupied' : 'Available'}</span>
                  </span>
                </div>

                <div className="text-xs text-slate-800 font-bold mb-1 flex items-center space-x-1">
                  {bed.ward_name?.includes('AC') ? (
                    <Wind className="w-3.5 h-3.5 text-cyan-600" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  <span>{bed.ward_name}</span>
                </div>

                <div className="text-[11px] text-slate-500 mb-3 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{bed.location_floor}</span>
                </div>
              </div>

              {/* Occupant Info / Availability Details */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {isOccupied ? (
                  <div className="bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl space-y-1">
                    <div className="text-[11px] text-amber-900 font-semibold">Current Occupant:</div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-sky-700" />
                      <span>{bed.occupant_name || bed.patient_id}</span>
                    </div>
                    {bed.assigned_doctor && (
                      <div className="text-[10px] text-slate-600 flex items-center space-x-1 pt-1">
                        <Stethoscope className="w-3 h-3 text-indigo-600" />
                        <span>{bed.assigned_doctor}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-600 py-1">
                    <span>Daily Rate:</span>
                    <span className="font-bold text-emerald-700 font-mono">₹{bed.daily_rate}/day</span>
                  </div>
                )}

                {/* Quick Action Button */}
                <button
                  type="button"
                  onClick={() => handleOpenAssignModal(bed)}
                  className={`w-full mt-2 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
                    isOccupied
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                  }`}
                >
                  <Bed className="w-3.5 h-3.5" />
                  <span>{isOccupied ? 'Change / Transfer Bed' : 'Assign Patient to Bed'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bed Assignment Modal */}
      {assigningBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Assign Bed {assigningBed.bed_id} ({assigningBed.ward_name})
                </h3>
                <p className="text-xs text-slate-500">{assigningBed.location_floor}</p>
              </div>
              <button onClick={() => setAssigningBed(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAssignBedSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Patient Admission *</label>
                <select
                  required
                  value={selectedAdmissionId}
                  onChange={(e) => setSelectedAdmissionId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Patient from Queue --</option>
                  {patientsQueue.map(p => (
                    <option key={p.admission_id} value={p.admission_id}>
                      {p.patient_name} ({p.patient_id}) - {p.disease_condition} [{p.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Assign Attending Doctor *</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                >
                  {doctors.map(d => (
                    <option key={d.staff_id} value={d.full_name}>
                      {d.full_name} ({d.role} - {d.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Daily Bed Rate (₹)</label>
                <input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningBed(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Confirm Bed Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
