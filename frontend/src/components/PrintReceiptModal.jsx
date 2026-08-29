import React, { useState, useRef } from 'react';
import { X, Printer, Download, Calendar, Clock, Activity, Building2, Bed, Stethoscope, Pill, FlaskConical, ShieldCheck, CheckCircle2, DollarSign, FileText, Loader2, Sparkles, Wind, Award, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PrintReceiptModal({ receiptData, onClose }) {
  const [activeTab, setActiveTab] = useState('INVOICE'); // 'INVOICE' or 'TIMELINE'
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const invoiceRef = useRef(null);
  const timelineRef = useRef(null);

  if (!receiptData) return null;

  // Normalize fields between active receipt and archived record
  const patientName = receiptData.patientName || receiptData.patient_name || 'Patient';
  const patientId = receiptData.patientId || receiptData.patient_id || 'P-XXXX';
  const disease = receiptData.disease || receiptData.disease_condition || 'Medical Treatment';
  const admissionDate = receiptData.admissionDate || receiptData.admission_date || new Date().toISOString();
  const dischargeDate = receiptData.dischargeDate || receiptData.discharge_date || new Date().toISOString();
  const totalDays = receiptData.totalDays || receiptData.total_days || 1;
  const paymentMethod = receiptData.paymentMethod || receiptData.payment_method || 'Online Banking';
  const receiptNum = receiptData.receiptNumber || `ML-INV-${receiptData.archive_id ? 'ARC' + receiptData.archive_id : 'REC'}`;
  const grandTotal = receiptData.grandTotal !== undefined ? parseFloat(receiptData.grandTotal) : parseFloat(receiptData.total_amount_paid || 0);

  let wardBed = receiptData.bedDetails || receiptData.ward_and_bed_details;
  if (typeof wardBed === 'string') {
    try { wardBed = JSON.parse(wardBed); } catch (e) { wardBed = {}; }
  }

  let meds = receiptData.medicines || receiptData.prescribed_medicines;
  if (typeof meds === 'string') {
    try { meds = JSON.parse(meds); } catch (e) { meds = []; }
  }
  if (!Array.isArray(meds)) meds = [];

  let tests = receiptData.labTests || receiptData.lab_tests;
  if (typeof tests === 'string') {
    try { tests = JSON.parse(tests); } catch (e) { tests = []; }
  }
  if (!Array.isArray(tests)) tests = [];

  let itemized = receiptData.itemized || receiptData.itemized_breakdown;
  if (typeof itemized === 'string') {
    try { itemized = JSON.parse(itemized); } catch (e) { itemized = {}; }
  }

  let timeline = receiptData.timeline || itemized?.timeline || [];
  if (typeof timeline === 'string') {
    try { timeline = JSON.parse(timeline); } catch (e) { timeline = []; }
  }

  // Government Card Extraction
  const isGovCardUsed = Boolean(
    receiptData.isGovCardApplied ||
    itemized?.isGovCardApplied ||
    paymentMethod?.toLowerCase().includes('ayushman') ||
    paymentMethod?.toLowerCase().includes('green card') ||
    paymentMethod?.toLowerCase().includes('pmjay') ||
    paymentMethod?.toLowerCase().includes('govt') ||
    paymentMethod?.toLowerCase().includes('government')
  );

  const cardType = receiptData.govCardType || itemized?.govCardType || (paymentMethod?.includes('Green Card') ? 'State Govt. Green Card / Swasthya Sathi' : 'Ayushman Bharat PM-JAY');
  const cardId = receiptData.govCardNumber || itemized?.govCardNumber || 'PMJAY-9821-4402-9912';
  const cardLimit = 500000.00;

  const rawGrossBed = itemized?.rawBedTotal !== undefined ? parseFloat(itemized.rawBedTotal) : (totalDays * (parseFloat(itemized?.bedDailyRate || 350)));
  const rawGrossMed = itemized?.rawMedTotal !== undefined ? parseFloat(itemized.rawMedTotal) : meds.reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0);
  const rawGrossTest = itemized?.rawTestTotal !== undefined ? parseFloat(itemized.rawTestTotal) : tests.reduce((acc, t) => acc + (parseFloat(t.cost) || 0), 0);
  const rawGrossDoctor = itemized?.rawDoctorTotal !== undefined ? parseFloat(itemized.rawDoctorTotal) : 200;
  const rawGrossFood = itemized?.rawFoodTotal !== undefined ? parseFloat(itemized.rawFoodTotal) : (totalDays * (parseFloat(itemized?.foodDaily || 100)));
  const grossBillTotal = rawGrossBed + rawGrossMed + rawGrossTest + rawGrossDoctor + rawGrossFood;

  const cardDeductionAmount = isGovCardUsed
    ? (receiptData.subsidyAmount !== undefined 
        ? parseFloat(receiptData.subsidyAmount) 
        : (itemized?.subsidyAmount !== undefined 
            ? parseFloat(itemized.subsidyAmount) 
            : Math.max(0, grossBillTotal - grandTotal)))
    : 0;

  const cardRemainingBalance = Math.max(0, cardLimit - cardDeductionAmount);

  const bedTotal = itemized?.bedTotal !== undefined ? parseFloat(itemized.bedTotal) : (isGovCardUsed ? (wardBed?.ward?.includes('AC') ? totalDays * 300 : 0) : totalDays * (parseFloat(itemized?.bedDailyRate || 350)));
  const medTotal = isGovCardUsed ? 0 : (itemized?.medTotal !== undefined ? parseFloat(itemized.medTotal) : rawGrossMed);
  const testTotal = isGovCardUsed ? 0 : (itemized?.testTotal !== undefined ? parseFloat(itemized.testTotal) : rawGrossTest);
  const doctorTotal = isGovCardUsed ? 0 : (itemized?.doctorTotal !== undefined ? parseFloat(itemized.doctorTotal) : 200);
  const foodTotal = isGovCardUsed ? 0 : (itemized?.foodTotal !== undefined ? parseFloat(itemized.foodTotal) : rawGrossFood);

  // Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Direct PDF Download Generation using jsPDF and html2canvas
  const handleDownloadPDF = async () => {
    const targetElement = activeTab === 'INVOICE' ? invoiceRef.current : timelineRef.current;
    if (!targetElement) return;

    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 2.5, // 2.5x high resolution crisp rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const imgWidth = pdfWidth - 20; // 10mm margins on left/right
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      const cleanPatientName = patientName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const typeStr = activeTab === 'INVOICE' ? 'Official_Invoice' : 'Progress_Timeline';
      const filename = `MediLife_${typeStr}_${cleanPatientName}_${patientId}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF generation encountered an issue. Falling back to browser print dialog.');
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl my-8">
        
        {/* Top Action Bar */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hospital Invoice & Clinical Timeline</h3>
              <p className="text-xs text-slate-500">Invoice #{receiptNum} • {patientName} ({patientId})</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Download PDF Button */}
            <button
              type="button"
              disabled={generatingPdf}
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF Bill</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-200 transition"
            >
              <Printer className="w-3.5 h-3.5 text-sky-600" />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Toggle (Invoice vs Day-by-Day Timeline) */}
        <div className="px-6 pt-4 border-b border-slate-200 flex space-x-3 no-print bg-slate-50/50">
          <button
            onClick={() => setActiveTab('INVOICE')}
            className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
              activeTab === 'INVOICE'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Complete Itemized Bill Invoice</span>
          </button>
          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
              activeTab === 'TIMELINE'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>📅 Day-by-Day Patient Progress & Expenses ({totalDays} Day Stay)</span>
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto space-y-6 bg-slate-50">
          
          {/* 1. INVOICE TAB */}
          {activeTab === 'INVOICE' && (
            <div
              ref={invoiceRef}
              id="printable-invoice-content"
              className="bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200 font-sans space-y-6"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              {/* Top Hospital Header */}
              <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
                <div className="flex items-start space-x-3.5">
                  <div className="w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <path d="M24 4L7 11.5V23.2C7 33.6 14.3 43.1 24 45.8C33.7 43.1 41 33.6 41 23.2V11.5L24 4Z" fill="#0284C7" fillOpacity="0.08" stroke="#0284C7" strokeWidth="2.5" strokeLinejoin="round" />
                      <path d="M24 14V34M14 24H34" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="24" cy="24" r="4.5" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Medi<span className="text-sky-600">Life</span></span>
                      <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                        HOSPITAL & RESEARCH
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">24x7 Multi-Speciality Medical Facility • NABH Accredited</p>
                    <p className="text-[11px] text-slate-500">Reg No: ML-HOSP-2026/88 • GSTIN: 27AABCM8821K1Z5</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-black text-slate-900 tracking-wide uppercase">OFFICIAL DISCHARGE INVOICE</div>
                  <div className="font-mono text-xs font-black text-sky-700 mt-0.5">{receiptNum}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Date: {new Date(dischargeDate || Date.now()).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Patient Demographics & Govt Card Status Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">PATIENT NAME</span>
                  <span className="font-bold text-slate-900 text-sm">{patientName}</span>
                  <span className="text-slate-500 block font-mono text-[11px]">{patientId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">ROOM & BED NUMBER</span>
                  <span className="font-bold text-slate-900">{wardBed?.ward || 'General'}</span>
                  <span className="text-slate-600 block font-mono text-[11px]">Bed: {wardBed?.bed_id || 'Day Care / OPD'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">STAY DURATION</span>
                  <span className="font-bold text-slate-900">{totalDays} Day(s)</span>
                  <span className="text-slate-500 block text-[11px]">{new Date(admissionDate).toLocaleDateString()} to {new Date(dischargeDate || Date.now()).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">GOVT. CARD USED?</span>
                  {isGovCardUsed ? (
                    <div>
                      <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px] inline-block font-mono">
                        YES (Govt. Scheme)
                      </span>
                      <span className="text-slate-700 block text-[11px] font-bold mt-0.5">{cardType}</span>
                      <span className="text-slate-500 block font-mono text-[10px]">{cardId}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded text-[10px] inline-block">
                        NO (Self-Paid)
                      </span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">{paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Explicit Government Health Scheme Deduction & Balance Tracker */}
              {isGovCardUsed ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-sm">
                        Government Health Card Benefit Passbook ({cardType})
                      </span>
                    </div>
                    <span className="font-bold text-[11px] bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-mono">
                      Card ID: {cardId}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Annual Scheme Limit:</span>
                      <strong className="text-slate-900 font-mono text-sm">₹{cardLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 uppercase font-bold block">Fees Deducted by Card:</span>
                      <strong className="text-emerald-700 font-mono text-sm font-black">- ₹{cardDeductionAmount.toFixed(2)}</strong>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Remaining Card Balance:</span>
                      <strong className="text-emerald-800 font-mono text-sm font-black">₹{cardRemainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-800 mt-1">
                    ✓ 100% Free diagnostic tests, medications, consultations, meals & General Ward bed deducted from scheme. {wardBed?.ward?.includes('AC') && '• AC Room 50% subsidized.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span><strong>Government Scheme Card Applied:</strong> No Government Card submitted (Standard Hospital Rates)</span>
                  <span className="text-[11px] text-slate-500 font-mono">Payment Mode: {paymentMethod}</span>
                </div>
              )}

              {/* Diagnosis Notice */}
              <div className="text-xs p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between">
                <div>
                  <strong className="text-sky-900 font-bold">Primary Diagnosis / Condition:</strong>{' '}
                  <span className="text-slate-700">{disease}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">Classification: Outpatient (Discharged)</span>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">DESCRIPTION OF HOSPITAL SERVICE / ITEM</th>
                    <th className="py-2.5 px-3 text-center">QTY / DAYS</th>
                    <th className="py-2.5 px-3 text-right">STANDARD RATE</th>
                    <th className="py-2.5 px-3 text-right">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">Room Accommodation ({wardBed?.ward || 'General'})</span>
                      <span className="text-[11px] text-slate-500">
                        Bed: {wardBed?.bed_id || 'Day Care / OPD'} • {wardBed?.floor || 'Main Facility'}
                        {isGovCardUsed && (wardBed?.ward?.includes('AC') ? ' (50% Govt. Subsidy Applied)' : ' (100% Free Govt. Scheme Cover)')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">{totalDays} Day(s)</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {isGovCardUsed && !wardBed?.ward?.includes('AC') ? (
                        <span className="line-through text-slate-400">₹350.00</span>
                      ) : (
                        `₹${(bedTotal / totalDays).toFixed(2)}`
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">₹{bedTotal.toFixed(2)}</td>
                  </tr>

                  {meds.length > 0 && (
                    <tr>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">Pharmacy & Prescriptions</span>
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          {meds.map(m => `${m.name} (₹${m.cost})`).join(', ')}
                        </div>
                        {isGovCardUsed && (
                          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                            ✓ 100% Free - Covered by Govt. Health Card Scheme
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">{meds.length} Item(s)</td>
                      <td className="py-3 px-3 text-right">-</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                        {isGovCardUsed ? (
                          <div>
                            <span className="text-[10px] text-slate-400 line-through mr-1 font-mono">₹{rawGrossMed.toFixed(2)}</span>
                            <span>₹0.00</span>
                          </div>
                        ) : (
                          `₹${medTotal.toFixed(2)}`
                        )}
                      </td>
                    </tr>
                  )}

                  {tests.length > 0 && (
                    <tr>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">Diagnostic Pathology & Radiology Tests</span>
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          {tests.map((t, idx) => (
                            <span key={idx} className="inline-block mr-2 mb-1">
                              • <strong>{t.name}</strong> {t.room ? `[${t.room}]` : ''} {t.time ? `(${t.time})` : ''} (₹{t.cost})
                            </span>
                          ))}
                        </div>
                        {isGovCardUsed && (
                          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                            ✓ 100% Free - Covered by Govt. Health Card Scheme
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">{tests.length} Test(s)</td>
                      <td className="py-3 px-3 text-right">-</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                        {isGovCardUsed ? (
                          <div>
                            <span className="text-[10px] text-slate-400 line-through mr-1 font-mono">₹{rawGrossTest.toFixed(2)}</span>
                            <span>₹0.00</span>
                          </div>
                        ) : (
                          `₹${testTotal.toFixed(2)}`
                        )}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">Attending Doctor Consultation</span>
                      {isGovCardUsed && (
                        <span className="text-[10px] text-emerald-700 font-bold block">✓ 100% Free - Govt. Scheme</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">1 Admission</td>
                    <td className="py-3 px-3 text-right font-mono">₹200.00</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                      {isGovCardUsed ? (
                        <div>
                          <span className="text-[10px] text-slate-400 line-through mr-1 font-mono">₹200.00</span>
                          <span>₹0.00</span>
                        </div>
                      ) : (
                        `₹${doctorTotal.toFixed(2)}`
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">Nutritional Dietary Meals & Nursing Care</span>
                      {isGovCardUsed && (
                        <span className="text-[10px] text-emerald-700 font-bold block">✓ 100% Free - Govt. Scheme</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">{totalDays} Day(s)</td>
                    <td className="py-3 px-3 text-right font-mono">₹100.00</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                      {isGovCardUsed ? (
                        <div>
                          <span className="text-[10px] text-slate-400 line-through mr-1 font-mono">₹{(totalDays * 100).toFixed(2)}</span>
                          <span>₹0.00</span>
                        </div>
                      ) : (
                        `₹${foodTotal.toFixed(2)}`
                      )}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  {isGovCardUsed && cardDeductionAmount > 0 && (
                    <>
                      <tr className="border-t-2 border-slate-300 bg-slate-50/50 text-xs">
                        <td colSpan={3} className="py-2.5 px-3 font-semibold text-slate-600 text-right">
                          Total Standard Hospital Charges:
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-700 text-right font-mono">
                          ₹{grossBillTotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50 text-xs text-emerald-900">
                        <td colSpan={3} className="py-2 px-3 font-bold text-right">
                          (-) Deducted by Government Health Card Scheme ({cardType}):
                        </td>
                        <td className="py-2 px-3 font-black text-emerald-700 text-right font-mono">
                          - ₹{cardDeductionAmount.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}

                  <tr className="border-t-2 border-slate-900 bg-slate-100 text-sm">
                    <td colSpan={3} className="py-3.5 px-3 font-black text-slate-900 text-right uppercase tracking-wider">
                      FINAL NET AMOUNT PAID BY PATIENT:
                    </td>
                    <td className="py-3.5 px-3 font-black text-emerald-700 text-right font-mono text-base">
                      ₹{grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures & Seal */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-500">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 w-48 mb-1.5"></div>
                  <span className="font-semibold">Patient / Guardian Signature</span>
                </div>
                <div className="text-right">
                  <div className="h-10 border-b border-dashed border-slate-300 w-48 ml-auto mb-1.5"></div>
                  <span className="font-semibold">Authorized Medical Billing Officer</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Medi Life Hospital & Healthcare</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. DAY-BY-DAY PROGRESS TIMELINE TAB */}
          {activeTab === 'TIMELINE' && (
            <div
              ref={timelineRef}
              className="bg-white text-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 font-sans space-y-6"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              {/* Header */}
              <div className="border-b-2 border-teal-600 pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-teal-800">Patient Daily Clinical Progress & Expense Log</h3>
                  <p className="text-xs text-slate-600">Patient: {patientName} ({patientId}) • Stay: {totalDays} Day(s)</p>
                </div>
                <span className="text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-full">
                  {totalDays} Day Stay Journey
                </span>
              </div>

              {timeline.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No daily records recorded.</div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((dayItem, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-xs">
                            D{dayItem.day}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 text-xs">Day {dayItem.day} Assessment & Care</span>
                            <span className="text-[11px] text-slate-500 ml-2">{dayItem.dateFormatted || new Date(dayItem.date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-700 text-xs block">
                            Daily Cost: ₹{dayItem.dayTotal?.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Running Total: ₹{dayItem.cumulativeTotal?.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Clinical Observations */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                        <div>
                          <strong className="text-slate-500 uppercase text-[10px] block">Clinical Notes:</strong>
                          <span className="text-slate-800">{dayItem.notes}</span>
                        </div>
                        <div>
                          <strong className="text-slate-500 uppercase text-[10px] block">Vitals Monitored:</strong>
                          <span className="text-slate-800">{dayItem.vitals}</span>
                        </div>
                      </div>

                      {/* Day Expense Items */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Room Rate:</span>
                          <strong className="text-slate-900 font-mono">₹{dayItem.bedCost?.toFixed(2)}</strong>
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Meals:</span>
                          <strong className="text-slate-900 font-mono">₹{dayItem.foodCost?.toFixed(2)}</strong>
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Meds & Tests:</span>
                          <strong className="text-slate-900 font-mono">₹{((dayItem.medCost || 0) + (dayItem.testCost || 0)).toFixed(2)}</strong>
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Doctor Visit:</span>
                          <strong className="text-slate-900 font-mono">₹{(dayItem.doctorCost || 0).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
