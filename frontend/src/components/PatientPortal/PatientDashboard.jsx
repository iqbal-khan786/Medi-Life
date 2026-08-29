import React, { useState } from 'react';
import { Bed, Stethoscope, Pill, FlaskConical, CreditCard, Activity, Clock, CheckCircle2, AlertCircle, PlusCircle, Building2, MapPin, Receipt, ShieldCheck, Calendar, DollarSign, Printer, Download, Wind } from 'lucide-react';
import BillingDischargeModal from './BillingDischargeModal';
import PatientIntakeForm from './PatientIntakeForm';
import PrintReceiptModal from '../PrintReceiptModal';

export default function PatientDashboard({ currentUser, dashboardData, onRefresh }) {
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showNewIntake, setShowNewIntake] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const admission = dashboardData?.admission;
  const billing = dashboardData?.billing;
  const patient = dashboardData?.patient || currentUser;
  const timeline = dashboardData?.timeline || [];

  const isPending = admission?.status === 'Pending Intake';
  const isInpatient = admission?.status === 'Inpatient';
  const isOutpatient = admission?.status === 'Outpatient';

  return (
    <div className="space-y-6">
      
      {/* Top Patient Welcome & Quick Status Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 font-mono">
                Patient ID: {patient?.patient_id || currentUser?.id}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${
                isInpatient 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : isPending
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isInpatient ? 'bg-emerald-500 animate-pulse' : isPending ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`}></span>
                <span>Status: {admission?.status || 'No Active Admission'}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome, {patient?.full_name || currentUser?.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              {admission 
                ? `Diagnosis / Reported Condition: ${admission.disease_condition}` 
                : 'You have no active admissions at Medi Life right now. You can submit an intake request below.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {admission && !isOutpatient && (
              <button
                onClick={() => setShowBillingModal(true)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-sm flex items-center space-x-2 transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>View Bill & Discharge (₹{billing?.grandTotal?.toFixed(2) || '0.00'})</span>
              </button>
            )}

            {admission && isOutpatient && (
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl font-bold text-xs flex items-center space-x-2 transition"
              >
                <Receipt className="w-4 h-4" />
                <span>Download / Print Final Invoice</span>
              </button>
            )}

            {(!admission || isOutpatient) && (
              <button
                onClick={() => setShowNewIntake(!showNewIntake)}
                className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-xs shadow-sm flex items-center space-x-2 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{showNewIntake ? 'Close Intake Form' : 'New Intake Request'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* If patient wants to submit a new intake */}
      {showNewIntake && (
        <PatientIntakeForm
          currentUser={currentUser}
          onIntakeSubmitted={() => {
            setShowNewIntake(false);
            onRefresh();
          }}
        />
      )}

      {/* Pending Intake Notice */}
      {isPending && (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
            <Clock className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-900">Intake Request Under Review</h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Your reported symptoms for <strong className="text-slate-900">"{admission.disease_condition}"</strong> have been received. The management staff is currently assigning a doctor and allocating a bed in your preferred room (<strong className="text-slate-900">{admission.preferred_ward || 'General'}</strong>). This dashboard will update automatically in real-time.
            </p>
          </div>
        </div>
      )}

      {/* Main Patient Live Info Grid */}
      {admission && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Live Bed & Doctor Allocation */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                  <Bed className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Assigned Room & Doctor</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Live Synced
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 uppercase font-semibold">
                  {admission.preferred_ward?.includes('Consult') || admission.preferred_ward?.includes('No Bed') ? 'Care Type' : 'Bed Number'}
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 flex items-center space-x-2">
                  {admission.assigned_bed_id ? (
                    <span>{admission.assigned_bed_id}</span>
                  ) : admission.preferred_ward?.includes('Consult') || admission.preferred_ward?.includes('No Bed') ? (
                    <span className="text-emerald-700 text-base sm:text-lg font-bold flex items-center space-x-1.5">
                      <Stethoscope className="w-5 h-5 text-emerald-600" />
                      <span>OPD Check-up (No Bed Required)</span>
                    </span>
                  ) : (
                    <span className="text-amber-600 text-sm font-semibold">Awaiting Allocation</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Category</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {admission.ward_name || admission.preferred_ward || 'General'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>Floor / Facility</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {admission.location_floor || (admission.preferred_ward?.includes('Consult') ? 'OPD Clinic Block' : 'Main Facility')}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Attending Doctor</div>
                  <div className="text-xs font-bold text-slate-900">
                    {admission.assigned_doctor || 'Medical Officer on Duty'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Prescribed Medications & Pharmacy */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Pill className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Prescriptions & Pharmacy</h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {admission.medicines?.length || 0} Items
              </span>
            </div>

            {admission.medicines && admission.medicines.length > 0 ? (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {admission.medicines.map((med, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{med.name}</div>
                      {med.dosage && <div className="text-[11px] text-slate-500">{med.dosage}</div>}
                    </div>
                    <div className="text-xs font-bold text-emerald-700 font-mono">
                      ₹{parseFloat(med.cost || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                No active medications prescribed yet.
              </div>
            )}
          </div>

          {/* Card 3: Diagnostic Lab Tests */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Diagnostic Lab Tests</h3>
              </div>
              <span className="text-xs font-bold text-purple-700 font-mono">
                {admission.lab_tests?.length || 0} Tests
              </span>
            </div>

            {admission.lab_tests && admission.lab_tests.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {admission.lab_tests.map((test, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{test.name}</div>
                        <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 mt-1">
                          {test.status || 'Ordered'}
                        </span>
                      </div>
                      <div className="text-xs font-black text-purple-800 font-mono">
                        ₹{parseFloat(test.cost || 0).toFixed(2)}
                      </div>
                    </div>

                    {/* Test Room and Time Details */}
                    <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 gap-1 text-[11px]">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span className="font-semibold text-slate-900">Room:</span>
                        <span className="text-slate-600">{test.room || 'Pathology Lab - Room 102 (1st Floor)'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span className="font-semibold text-slate-900">Time:</span>
                        <span className="text-slate-600 font-medium">{test.time || 'Today, 10:30 AM - 11:30 AM'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                No diagnostic lab tests assigned yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAY-BY-DAY CLINICAL PROGRESS & EXPENSE JOURNAL */}
      {admission && timeline && timeline.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  📅 Day-by-Day Patient Progress & Expenses ({billing?.totalDays || 1} Day Stay)
                </h3>
                <p className="text-xs text-slate-500">Continuous daily log of hospital expenses, clinical visits, and vitals</p>
              </div>
            </div>
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-200 transition"
            >
              <Printer className="w-3.5 h-3.5 text-sky-600" />
              <span>Print / Download Invoice</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {timeline.map((dayItem, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-xs text-slate-900">Day {dayItem.day} ({dayItem.dateFormatted || new Date(dayItem.date).toLocaleDateString()})</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">₹{dayItem.dayTotal?.toFixed(2)}</span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <div><strong className="text-slate-500">Status:</strong> {dayItem.notes}</div>
                  <div><strong className="text-slate-500">Vitals:</strong> {dayItem.vitals}</div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Bed: ₹{dayItem.bedCost} • Food: ₹{dayItem.foodCost}</span>
                  <span className="text-teal-700 font-bold">Cumul: ₹{dayItem.cumulativeTotal?.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Itemized Billing Summary Row */}
      {billing && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Live Itemized Expense Breakdown ({billing.totalDays} Day Stay)</span>
              </div>
              <p className="text-xs text-slate-500">
                Continuous auto-calculated expenses including room, pharmacy, diagnostics, specialist visits, and meals.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Bed Charges:</span>
                <strong className="text-slate-900 font-mono">₹{billing.bedTotal?.toFixed(2)}</strong>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Pharmacy:</span>
                <strong className="text-slate-900 font-mono">₹{billing.medTotal?.toFixed(2)}</strong>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Lab Tests:</span>
                <strong className="text-slate-900 font-mono">₹{billing.testTotal?.toFixed(2)}</strong>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Doctor & Food:</span>
                <strong className="text-slate-900 font-mono">₹{(billing.doctorTotal + billing.foodTotal)?.toFixed(2)}</strong>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-800 block text-[10px] font-bold uppercase">Grand Total:</span>
                <strong className="text-emerald-700 font-mono text-base font-black">₹{billing.grandTotal?.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discharge & Payment Modal */}
      {showBillingModal && admission && billing && (
        <BillingDischargeModal
          admission={admission}
          billing={billing}
          patient={patient}
          timeline={timeline}
          onClose={() => setShowBillingModal(false)}
          onDischarged={() => {
            setShowBillingModal(false);
            onRefresh();
          }}
        />
      )}

      {/* Full Printable Invoice Modal */}
      {showInvoiceModal && admission && (
        <PrintReceiptModal
          receiptData={{
            ...admission,
            patientName: patient?.full_name || currentUser?.name,
            patientId: patient?.patient_id || currentUser?.id,
            disease: admission.disease_condition,
            totalDays: billing?.totalDays || 1,
            bedDetails: { ward: admission.ward_name, bed_id: admission.assigned_bed_id, floor: admission.location_floor },
            medicines: admission.medicines || [],
            labTests: admission.lab_tests || [],
            timeline: timeline || [],
            itemized: {
              bedTotal: billing?.bedTotal,
              medTotal: billing?.medTotal,
              testTotal: billing?.testTotal,
              doctorTotal: billing?.doctorTotal,
              foodTotal: billing?.foodTotal,
              bedDailyRate: billing?.bedDailyRate,
              foodDaily: billing?.foodDaily
            },
            grandTotal: billing?.grandTotal || 0,
            paymentMethod: admission.is_paid ? 'Online Settlement' : 'Pending Payment'
          }}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}
