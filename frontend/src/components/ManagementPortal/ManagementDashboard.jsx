import React, { useState } from 'react';
import { Bed, Users, Clock, DollarSign, Database, Activity, ShieldCheck, FileSpreadsheet, PlusCircle, CheckCircle2, ChevronRight, Stethoscope, RotateCcw } from 'lucide-react';
import PatientQueueTable from './PatientQueueTable';
import BedMatrixView from './BedMatrixView';
import ArchiveLedgerView from './ArchiveLedgerView';
import ConsultantView from './ConsultantView';
import { api } from '../../services/api';

export default function ManagementDashboard({
  currentUser,
  stats,
  patientsQueue,
  beds,
  doctors,
  archivedRecords,
  onRefresh
}) {
  const [activeTab, setActiveTab] = useState('CONSULTANT'); // CONSULTANT, QUEUE, BEDS, ARCHIVE
  const [quickDischargeAdmission, setQuickDischargeAdmission] = useState(null);
  const [dischargeProcessing, setDischargeProcessing] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const handleQuickDischargeSubmit = async () => {
    if (!quickDischargeAdmission) return;
    setDischargeProcessing(true);
    try {
      await api.payAndDischarge(quickDischargeAdmission.admission_id, 'Hospital Counter Clearance');
      setQuickDischargeAdmission(null);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Discharge failed');
    } finally {
      setDischargeProcessing(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to reset all admissions, patient records, and archive history? This will give you a completely clean hospital state.')) {
      return;
    }
    setClearingData(true);
    try {
      await api.clearData();
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to clear data');
    } finally {
      setClearingData(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Top Welcome & Action Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Staff ID: {currentUser?.id}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {currentUser?.role} • {currentUser?.department}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hospital Operations Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time admissions queue, bed allocations, doctor assignments, and permanent patient ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleClearData}
              disabled={clearingData}
              title="Reset all admissions and archives to start fresh"
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 border border-slate-200 transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${clearingData ? 'animate-spin' : ''}`} />
              <span>Reset Data</span>
            </button>

            <button
              onClick={() => window.location.href = api.getExcelExportUrl()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Ledger (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Structured 5-Column KPI Metric Boxes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Box 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold">Bed Occupancy</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats?.occupancyRate || '0%'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats?.occupiedBeds || 0} of {stats?.totalBeds || 16} beds in use
            </div>
          </div>
        </div>

        {/* Box 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold">Pending Intakes</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 tracking-tight">
              {stats?.pendingIntakes || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Awaiting triage & room</div>
          </div>
        </div>

        {/* Box 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold">Active Inpatients</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              {stats?.activeInpatients || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Currently admitted</div>
          </div>
        </div>

        {/* Box 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold">Permanent Archives</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats?.archivedCount || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Settled patient records</div>
          </div>
        </div>

        {/* Box 5 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition sm:col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold">Total Income</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ₹{parseFloat(stats?.totalRevenue || 0).toFixed(0)}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Settled Collections</div>
          </div>
        </div>

      </div>

      {/* 3. Main Navigation Sub-Tabs Bar */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 inline-flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('CONSULTANT')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'CONSULTANT'
              ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <span>🩺 Consultant & Clinical Dossier</span>
        </button>

        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'QUEUE'
              ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-sky-600" />
          <span>Patient Admissions Queue ({patientsQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BEDS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'BEDS'
              ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bed className="w-4 h-4 text-sky-600" />
          <span>Bed Management Matrix ({beds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ARCHIVE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'ARCHIVE'
              ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-teal-600" />
          <span>Permanent Archive & Excel ({archivedRecords.length})</span>
        </button>
      </div>

      {/* 4. Active Sub-View Container */}
      <div className="space-y-6">
        {activeTab === 'CONSULTANT' && (
          <ConsultantView
            patientsQueue={patientsQueue}
            archivedRecords={archivedRecords}
            doctors={doctors}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === 'QUEUE' && (
          <PatientQueueTable
            patientsQueue={patientsQueue}
            beds={beds}
            doctors={doctors}
            onAssignBedClick={() => setActiveTab('BEDS')}
            onPrescriptionsUpdated={onRefresh}
            onDischargeClick={(admission) => setQuickDischargeAdmission(admission)}
          />
        )}

        {activeTab === 'BEDS' && (
          <BedMatrixView
            beds={beds}
            patientsQueue={patientsQueue}
            doctors={doctors}
            onBedAssigned={onRefresh}
          />
        )}

        {activeTab === 'ARCHIVE' && (
          <ArchiveLedgerView
            archivedRecords={archivedRecords}
          />
        )}
      </div>

      {/* Quick Discharge Modal from Management */}
      {quickDischargeAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-900">
              Clear & Discharge Patient
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to finalize discharge for <strong className="text-slate-900">{quickDischargeAdmission.patient_name} ({quickDischargeAdmission.patient_id})</strong>? This will release Bed <strong className="text-slate-900">{quickDischargeAdmission.assigned_bed_id}</strong> and permanently archive the medical file into the ledger.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
              <span className="text-slate-500">Calculated Final Bill:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                ₹{quickDischargeAdmission.grandTotal?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setQuickDischargeAdmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={dischargeProcessing}
                onClick={handleQuickDischargeSubmit}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
              >
                {dischargeProcessing ? 'Discharging...' : 'Confirm Clearance & Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
