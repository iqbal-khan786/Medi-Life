import React, { useState } from 'react';
import { User, Bed, Stethoscope, Pill, CreditCard, Search, CheckCircle2, Clock, AlertCircle, ArrowUpRight, Filter, Phone, Eye, FileText, Calendar } from 'lucide-react';
import PrescriptionLabModal from './PrescriptionLabModal';
import PrintReceiptModal from '../PrintReceiptModal';

export default function PatientQueueTable({
  patientsQueue,
  beds,
  doctors,
  onAssignBedClick,
  onPrescriptionsUpdated,
  onDischargeClick
}) {
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, 'Pending Intake', 'Inpatient', 'Outpatient'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdmissionForRx, setSelectedAdmissionForRx] = useState(null);
  const [selectedAdmissionForInvoice, setSelectedAdmissionForInvoice] = useState(null);

  const filteredList = patientsQueue.filter((item) => {
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.patient_name?.toLowerCase().includes(q);
      const matchId = item.patient_id?.toLowerCase().includes(q);
      const matchCond = item.disease_condition?.toLowerCase().includes(q);
      const matchBed = item.assigned_bed_id?.toLowerCase().includes(q);
      return matchName || matchId || matchCond || matchBed;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      
      {/* Unified Table Container with Top Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        
        {/* Top Search & Filter Bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by Patient Name, ID, Room, Symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500 transition shadow-2xs"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterStatus === 'ALL'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All ({patientsQueue.length})
            </button>
            <button
              onClick={() => setFilterStatus('Pending Intake')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                filterStatus === 'Pending Intake'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({patientsQueue.filter(p => p.status === 'Pending Intake').length})</span>
            </button>
            <button
              onClick={() => setFilterStatus('Inpatient')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                filterStatus === 'Inpatient'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Bed className="w-3.5 h-3.5" />
              <span>Inpatients ({patientsQueue.filter(p => p.status === 'Inpatient').length})</span>
            </button>
            <button
              onClick={() => setFilterStatus('Outpatient')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                filterStatus === 'Outpatient'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Outpatients ({patientsQueue.filter(p => p.status === 'Outpatient').length})</span>
            </button>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Patient Details</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Reported Condition</th>
                <th className="py-3.5 px-4">Room / Bed</th>
                <th className="py-3.5 px-4">Doctor</th>
                <th className="py-3.5 px-4">Live Billing</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No patient records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isPending = item.status === 'Pending Intake';
                  const isInpatient = item.status === 'Inpatient';
                  const isOutpatient = item.status === 'Outpatient';

                  return (
                    <tr key={item.admission_id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Patient Details */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900 text-sm">{item.patient_name}</div>
                        <div className="text-slate-500 font-mono text-[11px] flex items-center space-x-2 mt-0.5">
                          <span className="text-sky-700 font-bold">{item.patient_id}</span>
                          <span>•</span>
                          <span>{item.gender}, {item.age} yrs</span>
                        </div>
                        <div className="text-slate-500 text-[10px] flex items-center space-x-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{item.contact}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isInpatient
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isPending
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isInpatient ? 'bg-emerald-500 animate-pulse' : isPending ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`}></span>
                          <span>{item.status}</span>
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Admitted: {new Date(item.admission_date).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Symptoms */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-800 line-clamp-2 text-xs font-medium">
                          {item.disease_condition || 'Routine checkup / Day consultation'}
                        </p>
                        {item.preferred_ward && isPending && (
                          <span className="text-[10px] text-sky-700 font-bold mt-0.5 block">
                            Prefers: {item.preferred_ward}
                          </span>
                        )}
                      </td>

                      {/* Bed & Location */}
                      <td className="py-3.5 px-4">
                        {item.assigned_bed_id ? (
                          <div>
                            <div className="font-mono font-bold text-slate-900">{item.assigned_bed_id}</div>
                            <div className="text-slate-500 text-[11px]">{item.ward_name || item.preferred_ward}</div>
                            <div className="text-slate-400 text-[10px]">{item.location_floor}</div>
                          </div>
                        ) : item.preferred_ward?.includes('Consult') || item.preferred_ward?.includes('No Bed') ? (
                          <div>
                            <div className="font-bold text-emerald-800 text-xs flex items-center space-x-1">
                              <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                              <span>OPD Check-up</span>
                            </div>
                            <div className="text-slate-500 text-[10px]">No Bed Required</div>
                          </div>
                        ) : (
                          <span className="text-amber-600 text-[11px] italic font-semibold">Not allocated</span>
                        )}
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          {item.assigned_doctor || (
                            <span className="text-slate-400 text-[11px]">Unassigned</span>
                          )}
                        </div>
                      </td>

                      {/* Live Billing */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-emerald-700 text-xs">
                          ₹{item.grandTotal ? item.grandTotal.toFixed(2) : '0.00'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.totalDays || 1} Day(s) • {item.medicines?.length || 0} Rx • {item.lab_tests?.length || 0} Tests
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          
                          {/* View Invoice & Timeline */}
                          <button
                            type="button"
                            onClick={() => setSelectedAdmissionForInvoice({
                              ...item,
                              patientId: item.patient_id,
                              patientName: item.patient_name,
                              disease: item.disease_condition,
                              bedDetails: { ward: item.ward_name, bed_id: item.assigned_bed_id, floor: item.location_floor },
                              medicines: item.medicines,
                              labTests: item.lab_tests,
                              timeline: item.timeline,
                              itemized: {
                                bedTotal: (item.totalDays || 1) * (item.bed_daily_rate || 350),
                                medTotal: (item.medicines || []).reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0),
                                testTotal: (item.lab_tests || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0),
                                doctorTotal: item.doctor_fee || 200,
                                foodTotal: (item.totalDays || 1) * (item.food_charges || 100),
                                bedDailyRate: item.bed_daily_rate || 350,
                                foodDaily: item.food_charges || 100
                              },
                              grandTotal: item.grandTotal
                            })}
                            title="View Invoice & Day-by-Day Timeline"
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-600" />
                            <span>Invoice</span>
                          </button>

                          {/* Assign / Change Bed */}
                          <button
                            type="button"
                            onClick={() => onAssignBedClick(item)}
                            title="Assign Bed & Doctor"
                            className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1"
                          >
                            <Bed className="w-3.5 h-3.5 text-sky-600" />
                            <span>{item.assigned_bed_id ? 'Transfer' : 'Assign'}</span>
                          </button>

                          {/* Prescriptions */}
                          {!isOutpatient && (
                            <button
                              type="button"
                              onClick={() => setSelectedAdmissionForRx(item)}
                              title="Add Medicines & Lab Tests"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1"
                            >
                              <Pill className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Rx & Labs</span>
                            </button>
                          )}

                          {/* Settle & Discharge */}
                          {!isOutpatient && (
                            <button
                              type="button"
                              onClick={() => onDischargeClick(item)}
                              title="Settle Bill and Discharge to Permanent Archive"
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                              <span>Discharge</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prescription / Lab Tests Modal */}
      {selectedAdmissionForRx && (
        <PrescriptionLabModal
          admission={selectedAdmissionForRx}
          onClose={() => setSelectedAdmissionForRx(null)}
          onUpdated={() => {
            setSelectedAdmissionForRx(null);
            if (onPrescriptionsUpdated) onPrescriptionsUpdated();
          }}
        />
      )}

      {/* Printable / Downloadable Invoice Modal */}
      {selectedAdmissionForInvoice && (
        <PrintReceiptModal
          receiptData={selectedAdmissionForInvoice}
          onClose={() => setSelectedAdmissionForInvoice(null)}
        />
      )}
    </div>
  );
}
